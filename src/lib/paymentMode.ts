/**
 * The built-in payment simulator (/payments/simulator + /api/v1/payments/webhook)
 * marks payments as paid WITHOUT talking to a real gateway. It must never be
 * reachable in production unless explicitly enabled (e.g. a staging demo).
 */
export function isPaymentSimulatorEnabled(): boolean {
  if (process.env.ALLOW_PAYMENT_SIMULATOR === "true") return true;
  return process.env.NODE_ENV !== "production";
}
