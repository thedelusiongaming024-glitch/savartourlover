/**
 * SSLCommerz Payment Gateway Integration Module.
 * 
 * Supports both Sandbox (testbox) and Production environments with:
 * - Payment session initiation via v4 API (POST gwprocess/v4/api.php)
 * - Server-to-server Order Validation API (validationserverAPI.php)
 * - Automatic phone/email/country formatting required by SSLCommerz
 */

export interface SSLCommerzInitiateInput {
  tran_id: string;
  amount: number | string;
  cus_name: string;
  cus_phone: string;
  cus_email?: string | null;
  tour_title: string;
  origin: string;
  booking_id?: string;
  booking_ref?: string;
}

export interface SSLCommerzInitiateResult {
  success: boolean;
  gatewayUrl?: string;
  sessionKey?: string;
  error?: string;
}

export interface SSLCommerzValidationResult {
  status: "VALID" | "VALIDATED" | "FAILED" | "INVALID_TRANSACTION" | "ERROR";
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  card_type?: string;
  card_brand?: string;
  bank_tran_id?: string;
  card_issuer?: string;
  error?: string;
  raw?: any;
}

export function getSSLCommerzConfig() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim() || "";
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim() || "";
  const isSandbox = (process.env.SSLCOMMERZ_SANDBOX || "true").trim().toLowerCase() === "true";

  const initUrl = isSandbox
    ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
    : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

  const validationUrl = isSandbox
    ? "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php";

  return {
    storeId,
    storePassword,
    isSandbox,
    initUrl,
    validationUrl,
    isConfigured: Boolean(storeId && storePassword),
  };
}

/**
 * Checks whether SSLCommerz credentials are configured in the environment.
 */
export function isSSLCommerzConfigured(): boolean {
  return getSSLCommerzConfig().isConfigured;
}

/**
 * Initiates an SSLCommerz payment session and returns the GatewayPageURL.
 */
export async function initiateSSLCommerzPayment(
  input: SSLCommerzInitiateInput
): Promise<SSLCommerzInitiateResult> {
  const config = getSSLCommerzConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: "SSLCommerz credentials (STORE_ID and STORE_PASSWORD) are not configured.",
    };
  }

  const numAmount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      success: false,
      error: `Invalid payment amount: ${input.amount}`,
    };
  }

  const safeOrigin = input.origin.replace(/\/$/, "");
  const safeName = input.cus_name?.trim() || "Guest Traveler";
  let safePhone = input.cus_phone?.trim() || "01700000000";
  // SSLCommerz expects numbers without leading +, spaces, or dashes
  safePhone = safePhone.replace(/[^0-9]/g, "");
  if (!safePhone.startsWith("88") && safePhone.length === 11) {
    safePhone = "88" + safePhone;
  }
  const safeEmail = input.cus_email?.includes("@")
    ? input.cus_email.trim()
    : "traveler@savartourlover.com";

  const payload: Record<string, string> = {
    store_id: config.storeId,
    store_passwd: config.storePassword,
    total_amount: numAmount.toFixed(2),
    currency: "BDT",
    tran_id: input.tran_id,
    success_url: `${safeOrigin}/api/v1/payments/sslcommerz/success`,
    fail_url: `${safeOrigin}/api/v1/payments/sslcommerz/fail`,
    cancel_url: `${safeOrigin}/api/v1/payments/sslcommerz/cancel`,
    ipn_url: `${safeOrigin}/api/v1/payments/sslcommerz/ipn`,
    shipping_method: "NO",
    product_name: (input.tour_title || "Tour Package").slice(0, 150),
    product_category: "Travel",
    product_profile: "general",
    cus_name: safeName,
    cus_email: safeEmail,
    cus_add1: "Dhaka, Bangladesh",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: safePhone,
    value_a: input.booking_id || "",
    value_b: input.booking_ref || "",
  };

  try {
    const bodyParams = new URLSearchParams(payload);
    const response = await fetch(config.initUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `SSLCommerz gateway responded with status ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (data.status === "SUCCESS" && data.GatewayPageURL) {
      return {
        success: true,
        gatewayUrl: data.GatewayPageURL,
        sessionKey: data.sessionkey,
      };
    }

    return {
      success: false,
      error: data.failedreason || "SSLCommerz could not create a payment session.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error contacting SSLCommerz gateway.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validates a payment transaction with SSLCommerz's Order Validation API.
 * This should always be called to verify that val_id, tran_id, and amount match.
 */
export async function validateSSLCommerzPayment(
  valId: string
): Promise<SSLCommerzValidationResult> {
  const config = getSSLCommerzConfig();
  if (!config.isConfigured) {
    return {
      status: "ERROR",
      error: "SSLCommerz credentials not configured for validation.",
    };
  }

  const query = new URLSearchParams({
    val_id: valId,
    store_id: config.storeId,
    store_passwd: config.storePassword,
    v: "1",
    format: "json",
  });

  try {
    const response = await fetch(`${config.validationUrl}?${query.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      return {
        status: "ERROR",
        error: `Validation API responded with HTTP status ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status === "VALID" || data.status === "VALIDATED") {
      return {
        status: data.status,
        tran_id: data.tran_id,
        val_id: data.val_id,
        amount: data.amount,
        currency: data.currency,
        card_type: data.card_type,
        card_brand: data.card_brand,
        bank_tran_id: data.bank_tran_id,
        card_issuer: data.card_issuer,
        raw: data,
      };
    }

    return {
      status: data.status || "FAILED",
      tran_id: data.tran_id,
      val_id: data.val_id,
      error: data.error || data.failedreason || "Transaction not marked as VALID by SSLCommerz",
      raw: data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Validation network request failed";
    return {
      status: "ERROR",
      error: message,
    };
  }
}
