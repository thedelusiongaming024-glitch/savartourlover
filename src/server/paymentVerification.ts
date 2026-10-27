import { validateSSLCommerzPayment } from "@/lib/sslcommerz";
import { getPaymentByTranId } from "./db";

export type GatewayVerification =
  | {
      ok: true;
      cardType?: string;
      /** Amount the gateway says it collected (BDT). */
      amount: string;
      /** Booking id echoed back by the gateway (value_a), if any. */
      bookingId?: string;
      bookingRef?: string;
    }
  | { ok: false; reason: string };

/**
 * Server-to-server verification of a gateway callback.
 *
 * Never trust the browser redirect or IPN body on its own: anyone can POST to
 * those URLs. A payment is only real if SSLCommerz's Order Validation API
 * confirms that THIS val_id belongs to THIS tran_id and the amount we asked for.
 */
export async function verifyGatewayPayment(tranId: string, valId: string): Promise<GatewayVerification> {
  if (!tranId) return { ok: false, reason: "missing tran_id" };
  if (!valId) return { ok: false, reason: "missing val_id" };

  const validated = await validateSSLCommerzPayment(valId);
  if (validated.status !== "VALID" && validated.status !== "VALIDATED") {
    return { ok: false, reason: `gateway status ${validated.status}` };
  }

  // A val_id from someone else's (cheaper) transaction must not confirm this one.
  if (!validated.tran_id || validated.tran_id !== tranId) {
    return { ok: false, reason: "tran_id mismatch" };
  }

  const paidAmount = parseFloat(validated.amount ?? "");
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    return { ok: false, reason: "invalid gateway amount" };
  }

  // Always verify the amount if we can resolve the payment locally.
  // Even if the payment record is on another serverless instance, the
  // gateway-verified paidAmount is passed downstream so confirmPaymentSuccessInner
  // can use it as verifiedAmount for its own checks.
  const payment = getPaymentByTranId(tranId);
  if (payment) {
    const expected = parseFloat(payment.amount);
    if (!Number.isFinite(expected) || Math.abs(paidAmount - expected) > 1) {
      return { ok: false, reason: `amount mismatch (expected ${payment.amount}, gateway ${validated.amount})` };
    }
  }
  // NOTE: When payment is null (different serverless instance created it),
  // we still return ok:true with the gateway-verified amount. The caller
  // (confirmPaymentSuccessInner) will re-verify the amount against the
  // booking's expected advance/total before crediting.

  const raw = (validated.raw ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    cardType: validated.card_type,
    amount: paidAmount.toFixed(2),
    bookingId: typeof raw.value_a === "string" && raw.value_a ? raw.value_a : undefined,
    bookingRef: typeof raw.value_b === "string" && raw.value_b ? raw.value_b : undefined,
  };
}
