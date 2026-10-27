"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Lands here after SSLCommerz checkout redirects the customer's browser
 * back (via payments-browser-redirect on the backend, see payments/views.py).
 *
 * IMPORTANT: the `status` query param here is purely informational, for
 * a friendly message — it is NOT proof a payment succeeded. The only
 * thing that actually confirms a payment is the server-to-server IPN
 * webhook, which SSLCommerz calls independently and which always
 * re-validates against SSLCommerz's own validation API. So even on
 * status=success we deliberately don't claim the booking is confirmed —
 * we tell the customer to expect confirmation shortly, which is both
 * accurate and matches how the backend actually works.
 */

type Outcome = "success" | "fail" | "cancel";

function isOutcome(value: string | null): value is Outcome {
  return value === "success" || value === "fail" || value === "cancel";
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const reference = searchParams.get("reference");
  const outcome: Outcome = isOutcome(statusParam) ? statusParam : "fail";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-xl backdrop-blur">
        {outcome === "success" && (
          <>
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-deep/10">
              <Icon name="check" className="h-8 w-8 text-emerald-deep" />
            </span>
            <h1 className="font-display text-xl font-semibold text-ink">Payment received</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Thanks — we&apos;ve got your payment and we&apos;re confirming it now. You&apos;ll get an
              SMS/email confirmation shortly.
            </p>
          </>
        )}

        {outcome === "fail" && (
          <>
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
              <Icon name="shield" className="h-8 w-8 text-rose-500" />
            </span>
            <h1 className="font-display text-xl font-semibold text-ink">Payment didn&apos;t go through</h1>
            <p className="mt-2 text-sm text-ink-soft">
              The payment could not be completed and advance was not paid. The incomplete booking was cancelled and the reserved seats have been released. No charge was made.
            </p>
          </>
        )}

        {outcome === "cancel" && (
          <>
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Icon name="clock" className="h-8 w-8 text-amber-600" />
            </span>
            <h1 className="font-display text-xl font-semibold text-ink">Payment cancelled</h1>
            <p className="mt-2 text-sm text-ink-soft">
              You cancelled the checkout. Since the advance was not paid, the incomplete booking was cancelled and the reserved seats have been released. No money was deducted.
            </p>
          </>
        )}

        {reference && <p className="mt-4 font-mono text-xs text-ink-soft">Reference: {reference}</p>}

        <div className="mt-6 flex flex-col gap-2.5">
          {outcome === "success" ? (
            <Link
              href="/profile"
              className="inline-block w-full rounded-xl bg-emerald-deep px-4 py-3 font-medium text-white transition hover:brightness-110 shadow-sm"
            >
              View My Bookings & Clearance Pass →
            </Link>
          ) : (
            <Link
              href="/tours"
              className="inline-block w-full rounded-xl bg-emerald-deep px-4 py-3 font-medium text-white transition hover:brightness-110 shadow-sm"
            >
              Explore Tours & Book Again →
            </Link>
          )}
          <Link
            href="/"
            className="inline-block w-full rounded-xl border border-ink/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-white hover:text-ink"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>

  );
}

export default function PaymentResultPage() {
  // Same requirement as staff/login: useSearchParams() in a Client
  // Component needs a Suspense boundary above it or `next build` fails
  // during static-page generation (a build-time bailout, not a type
  // error — tsc has no way to catch it). This page was missed when that
  // fix was applied to staff/login.
  return (
    <Suspense fallback={null}>
      <PaymentResultContent />
    </Suspense>
  );
}
