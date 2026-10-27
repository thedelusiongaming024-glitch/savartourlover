/**
 * bKash Payment Gateway Integration Module (Tokenized Checkout API v1.2.0-beta)
 * 
 * Supports both Sandbox (demo credentials) and Production environments with:
 * - Token Grant with in-memory caching and automatic expiration renewal
 * - Payment Creation (mode: 0011) returning direct bKash checkout URL
 * - Payment Execution with transaction verification (trxID, amount, status)
 * - Payment Status Querying
 */

export interface BKashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  baseUrl: string;
  isSandbox: boolean;
  isConfigured: boolean;
}

export interface BKashInitiateInput {
  tran_id: string;
  amount: number | string;
  cus_name?: string;
  cus_phone?: string;
  cus_email?: string | null;
  tour_title?: string;
  callback_url: string;
  booking_id?: string;
  booking_ref?: string;
}

export interface BKashInitiateResult {
  success: boolean;
  paymentId?: string;
  gatewayUrl?: string;
  bkashUrl?: string;
  error?: string;
  raw?: any;
}

export interface BKashExecuteResult {
  success: boolean;
  statusCode?: string;
  statusMessage?: string;
  paymentId?: string;
  trxId?: string;
  amount?: string;
  currency?: string;
  payerReference?: string;
  customerMsisdn?: string;
  transactionStatus?: string;
  merchantInvoiceNumber?: string;
  error?: string;
  raw?: any;
}

// In-memory token store for server process
let cachedToken: {
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
} | null = null;

export function getBKashConfig(): BKashConfig {
  const appKey = (process.env.BKASH_APP_KEY || "4f6o0cjiki2rfm34kfdadl1eqq").trim();
  const appSecret = (process.env.BKASH_APP_SECRET || "2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b").trim();
  const username = (process.env.BKASH_USERNAME || "sandboxTokenizedUser02").trim();
  const password = (process.env.BKASH_PASSWORD || "sandboxTokenizedUser02@12345").trim();
  const rawBase = (process.env.BKASH_BASE_URL || "https://tokenized.sandbox.bka.sh/v1.2.0-beta").trim();
  const baseUrl = rawBase.replace(/\/$/, "");
  const isSandbox = (process.env.BKASH_SANDBOX || "true").trim().toLowerCase() === "true";

  return {
    appKey,
    appSecret,
    username,
    password,
    baseUrl,
    isSandbox,
    isConfigured: Boolean(appKey && appSecret && username && password),
  };
}

export function isBKashConfigured(): boolean {
  return getBKashConfig().isConfigured;
}

/**
 * Grants an ID token from bKash Tokenized Checkout API.
 * Uses cached token if valid; otherwise requests a new token.
 */
export async function grantBKashToken(): Promise<string> {
  const now = Date.now();
  // If token exists and has > 5 minutes of validity left, reuse it
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.idToken;
  }

  const config = getBKashConfig();
  if (!config.isConfigured) {
    throw new Error("bKash credentials are not configured.");
  }

  const grantUrl = `${config.baseUrl}/tokenized/checkout/token/grant`;
  const response = await fetch(grantUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`bKash token grant failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data.statusCode === "0000" && data.id_token) {
    const expiresInSec = Number(data.expires_in) || 3600;
    cachedToken = {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresAt: now + expiresInSec * 1000,
    };
    return data.id_token;
  }

  throw new Error(data.statusMessage || "bKash token grant failed.");
}

/**
 * Initiates a payment session with bKash and returns the checkout URL.
 */
export async function initiateBKashPayment(
  input: BKashInitiateInput
): Promise<BKashInitiateResult> {
  const config = getBKashConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: "bKash credentials (APP_KEY, APP_SECRET, USERNAME, PASSWORD) are not configured.",
    };
  }

  const numAmount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
  if (isNaN(numAmount) || numAmount <= 0) {
    return {
      success: false,
      error: `Invalid payment amount: ${input.amount}`,
    };
  }

  try {
    const idToken = await grantBKashToken();
    const createUrl = `${config.baseUrl}/tokenized/checkout/create`;

    let safePhone = (input.cus_phone || "").replace(/[^0-9]/g, "");
    if (safePhone.startsWith("88") && safePhone.length === 13) {
      safePhone = safePhone.slice(2);
    }
    if (!safePhone || safePhone.length !== 11) {
      safePhone = "01770618575"; // Standard sandbox fallback payerReference
    }

    const payload = {
      mode: "0011",
      payerReference: safePhone,
      callbackURL: input.callback_url,
      amount: numAmount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: input.tran_id,
    };

    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-APP-Key": config.appKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `bKash create payment failed with status ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (data.statusCode === "0000" && data.bkashURL) {
      return {
        success: true,
        paymentId: data.paymentID,
        gatewayUrl: data.bkashURL,
        bkashUrl: data.bkashURL,
        raw: data,
      };
    }

    return {
      success: false,
      error: data.statusMessage || "bKash could not create payment session.",
      raw: data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error contacting bKash gateway.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Executes a completed payment with bKash given the paymentID.
 * Must be called in the callback when status is 'success'.
 */
export async function executeBKashPayment(paymentId: string): Promise<BKashExecuteResult> {
  const config = getBKashConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: "bKash credentials not configured for execution.",
    };
  }

  try {
    const idToken = await grantBKashToken();
    const executeUrl = `${config.baseUrl}/tokenized/checkout/execute`;

    const response = await fetch(executeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "X-APP-Key": config.appKey,
      },
      body: JSON.stringify({
        paymentID: paymentId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `bKash execute failed with status ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();

    if (data.statusCode === "0000" && (data.transactionStatus === "Completed" || data.trxID)) {
      return {
        success: true,
        statusCode: data.statusCode,
        statusMessage: data.statusMessage,
        paymentId: data.paymentID,
        trxId: data.trxID,
        amount: data.amount,
        currency: data.currency,
        payerReference: data.payerReference,
        customerMsisdn: data.customerMsisdn,
        transactionStatus: data.transactionStatus,
        merchantInvoiceNumber: data.merchantInvoiceNumber,
        raw: data,
      };
    }

    return {
      success: false,
      statusCode: data.statusCode,
      statusMessage: data.statusMessage,
      error: data.statusMessage || `bKash payment execution failed with code ${data.statusCode}`,
      raw: data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Execution network request failed.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Queries payment status from bKash.
 */
export async function queryBKashPayment(paymentId: string): Promise<any> {
  const config = getBKashConfig();
  const idToken = await grantBKashToken();
  const statusUrl = `${config.baseUrl}/tokenized/checkout/payment/status`;

  const response = await fetch(statusUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: idToken,
      "X-APP-Key": config.appKey,
    },
    body: JSON.stringify({ paymentID: paymentId }),
  });

  return response.json();
}
