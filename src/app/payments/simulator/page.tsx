"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";

function SimulatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || "";
  const amount = searchParams.get("amount") || "0";
  const reference = searchParams.get("reference") || "";
  const title = searchParams.get("title") || "Tour Booking";

  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"bkash" | "nagad" | "card">("bkash");

  async function handleSimulate(status: "success" | "fail" | "cancel") {
    setLoading(true);
    try {
      if (status === "success") {
        await fetch("/api/v1/payments/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tran_id: tranId,
            status: "VALID",
            card_type: selectedMethod.toUpperCase(),
            val_id: `SIM-${Date.now()}`,
          }),
        });
        router.push(`/payment-result?status=success&reference=${encodeURIComponent(reference)}`);
      } else if (status === "fail") {
        await fetch("/api/v1/payments/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tran_id: tranId,
            status: "FAILED",
          }),
        });
        router.push(`/payment-result?status=fail&reference=${encodeURIComponent(reference)}`);
      } else {
        await fetch("/api/v1/payments/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tran_id: tranId,
            status: "CANCELLED",
          }),
        });
        router.push(`/payment-result?status=cancel&reference=${encodeURIComponent(reference)}`);
      }
    } catch {
      router.push(`/payment-result?status=fail&reference=${encodeURIComponent(reference)}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            SSLCommerz Sandbox Simulator
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold text-white">Savar Tour Lover Secure Checkout</h1>
          <p className="mt-1 text-sm text-slate-400">{title}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-800/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Booking Ref</span>
            <span className="font-mono text-white">{reference}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-sm font-semibold">
            <span>Amount Payable</span>
            <span className="text-xl text-emerald-400">৳{Math.round(Number(amount)).toLocaleString("en-BD")}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Select Test Method</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { id: "bkash", label: "bKash" },
              { id: "nagad", label: "Nagad" },
              { id: "card", label: "Cards" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethod(m.id as "bkash" | "nagad" | "card")}
                className={`rounded-xl border py-2.5 text-xs font-semibold transition ${
                  selectedMethod === m.id
                    ? "border-emerald-500 bg-emerald-500/20 text-white"
                    : "border-white/10 bg-slate-800/40 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSimulate("success")}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? "Processing..." : `Simulate Successful Payment (৳${Math.round(Number(amount)).toLocaleString("en-BD")})`}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSimulate("fail")}
              className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
            >
              Simulate Failure
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSimulate("cancel")}
              className="flex-1 rounded-xl border border-white/10 bg-slate-800/60 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-50"
            >
              Simulate Cancel
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Integrated Gateway Simulator for Local Development & Testing.
        </p>
      </div>
    </main>
  );
}

export default function PaymentSimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8">Loading simulator...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}
