"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
function formatBDT(amount: number): string {
  return "৳" + Math.round(amount).toLocaleString("en-BD");
}

function RocketSimulatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || "";
  const amount = searchParams.get("amount") || "0";
  const reference = searchParams.get("reference") || "";
  const title = searchParams.get("title") || "Tour Booking";
  const [paymentId] = useState(() => searchParams.get("payment_id") || `RKT-${Date.now()}`);
  const defaultPhone = searchParams.get("cus_phone") || "";

  const [accountNumber, setAccountNumber] = useState(
    defaultPhone ? (defaultPhone.includes("-") ? defaultPhone : `${defaultPhone}-2`) : "01770618575-2"
  );
  const [pin, setPin] = useState("1212");
  const [otp, setOtp] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);

  function handleQuickFill() {
    setAccountNumber("01770618575-2");
    setPin("1212");
    setOtp("123456");
  }

  async function handleAction(status: "success" | "cancel" | "fail") {
    setLoading(true);
    setActionType(status);

    const generatedTrxId = `RKT${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 90)}`;
    const callbackUrl = `/api/v1/payments/rocket/callback?status=${status}&tran_id=${encodeURIComponent(
      tranId
    )}&paymentID=${encodeURIComponent(paymentId)}&val_id=${encodeURIComponent(
      generatedTrxId
    )}&trx_id=${encodeURIComponent(generatedTrxId)}&amount=${encodeURIComponent(amount)}`;

    // Small delay to simulate mobile network roundtrip
    setTimeout(() => {
      window.location.href = callbackUrl;
    }, 700);
  }

  const numAmount = parseFloat(amount) || 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#4a0d42] via-[#6e1363] to-[#2b0526] px-4 py-8 sm:py-16 flex items-center justify-center text-slate-800">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/20">
        {/* DBBL Rocket Header */}
        <div className="bg-gradient-to-r from-[#8C1D7D] to-[#600f55] px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-inner border border-white/20">
                🚀
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Rocket</h1>
                <p className="text-[11px] text-pink-200 font-medium">
                  Dutch-Bangla Bank Mobile Financial Services
                </p>
              </div>
            </div>
            <span className="rounded-full bg-pink-900/60 border border-pink-300/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-200">
              Sandbox PGW
            </span>
          </div>
        </div>

        {/* Order Info Strip */}
        <div className="border-b border-purple-100 bg-purple-50/70 px-6 py-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Merchant:</span>
            <strong className="text-purple-950 font-bold">Savar Tour Lover</strong>
          </div>
          <div className="mt-1 flex items-center justify-between text-slate-600">
            <span>Booking Ref:</span>
            <span className="font-mono font-semibold text-slate-800">{reference || "STL-BK-PENDING"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-slate-600">
            <span>Trip:</span>
            <span className="truncate max-w-[200px] font-medium text-slate-700">{title}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-purple-200/60 pt-2">
            <span className="font-semibold text-purple-950">Payable Advance:</span>
            <span className="text-lg font-bold text-[#8C1D7D]">{formatBDT(numAmount)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAction("success");
          }}
          className="p-6 space-y-4"
        >
          {/* Quick Demo Sandbox Helper */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-[11px] text-purple-900 space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1">🧪 Demo Test Mode:</span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-[10px] bg-[#8C1D7D] hover:bg-[#741267] text-white px-2 py-0.5 rounded-md font-bold transition shadow-xs cursor-pointer"
              >
                Auto-fill Test Data
              </button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-slate-600 font-mono text-[10px]">
              <span>Account: <strong>01770618575-2</strong></span>
              <span>PIN: <strong>1212</strong></span>
              <span>OTP: <strong>123456</strong></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rocket Mobile Account Number (12 Digits)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="017XXXXXXXX-X"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-800 outline-none focus:border-[#8C1D7D] focus:bg-white focus:ring-2 focus:ring-[#8C1D7D]/20 transition"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                DBBL
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Security PIN
              </label>
              <input
                type="password"
                required
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono text-center tracking-widest text-slate-800 outline-none focus:border-[#8C1D7D] focus:bg-white focus:ring-2 focus:ring-[#8C1D7D]/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                OTP Verification
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono text-center tracking-widest text-slate-800 outline-none focus:border-[#8C1D7D] focus:bg-white focus:ring-2 focus:ring-[#8C1D7D]/20 transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#8C1D7D] to-[#670b5f] py-3 text-sm font-bold text-white shadow-md hover:from-[#76156a] hover:to-[#570950] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && actionType === "success" ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Processing Rocket Payment...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Confirm & Pay {formatBDT(numAmount)} with Rocket</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAction("cancel")}
                className="rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer text-center"
              >
                {loading && actionType === "cancel" ? "Cancelling..." : "Cancel Payment"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAction("fail")}
                className="rounded-xl border border-rose-200 bg-rose-50/70 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 cursor-pointer text-center"
              >
                {loading && actionType === "fail" ? "Failing..." : "Simulate Failure"}
              </button>
            </div>
          </div>
        </form>

        {/* Security Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-[10px] text-slate-400">
          🔒 256-bit Encrypted Dutch-Bangla Bank Limited (DBBL) Gateway Simulator
        </div>
      </div>
    </main>
  );
}

export default function RocketSimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#4a0d42] text-white">
          <p className="animate-pulse">Loading Rocket Payment Gateway...</p>
        </div>
      }
    >
      <RocketSimulatorContent />
    </Suspense>
  );
}
