import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isPaymentSimulatorEnabled } from "@/lib/paymentMode";

// Evaluate on every request: at build time NODE_ENV is "production", which would otherwise freeze
// this decision into the build output.
export const dynamic = "force-dynamic";

export default function PaymentSimulatorLayout({ children }: { children: ReactNode }) {
  // The simulator fakes successful payments. Never expose it in production unless explicitly enabled.
  if (!isPaymentSimulatorEnabled()) notFound();
  return <>{children}</>;
}
