"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function formatBDT(amount: number): string {
  return "৳" + Math.round(amount).toLocaleString("en-BD");
}

function cleanInitialPhone(phone: string): string {
  if (!phone) return "";
  // Strip trailing simulator suffix (e.g. -2) and leading +88
  return phone.replace(/-\d+$/, "").replace(/^\+88/, "").trim();
}

function RocketRealPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || "";
  const amount = searchParams.get("amount") || "0";
  const reference = searchParams.get("reference") || "";
  const title = searchParams.get("title") || "Tour Booking";
  const [paymentId] = useState(() => searchParams.get("payment_id") || `RKT-${Date.now()}`);
  const defaultPhone = searchParams.get("cus_phone") || "";
  const cusName = searchParams.get("cus_name") || "";

  // Real payment input states
  const [senderPhone, setSenderPhone] = useState(() => cleanInitialPhone(defaultPhone));
  const [trxId, setTrxId] = useState("");
  const [trxError, setTrxError] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Hybrid Smart Matcher states: "form" -> "watching" (15m countdown) -> "matched"
  const [verificationMode, setVerificationMode] = useState<"form" | "watching" | "matched">("form");
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [pollingStatus, setPollingStatus] = useState<string>("waiting");

  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const merchantAccount = "016205930072";
  const merchantName = "SHIMUL HASAN PRINCE";
  const merchantTid = "60084230";
  const merchantId = "999016205930072";

  function copyToClipboard(text: string, type: "account" | "amount" | "ref") {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "account") {
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2000);
      } else if (type === "amount") {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
      } else if (type === "ref") {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      }
    }
  }

  // 15-minute countdown timer & automated status polling when in "watching" mode
  useEffect(() => {
    if (verificationMode !== "watching") return;

    // Countdown tick
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-polling check every 5 seconds for incoming SMS auto-match
    let isCancelled = false;
    async function checkStatus() {
      try {
        const query = reference
          ? `reference=${encodeURIComponent(reference)}`
          : `tran_id=${encodeURIComponent(tranId)}`;
        const res = await fetch(`/api/v1/payments/rocket/check-status?${query}`);
        if (!res.ok) return;
        const data = await res.json();

        if (isCancelled) return;

        if (data.is_confirmed && data.redirect_url) {
          setVerificationMode("matched");
          clearInterval(timer);
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 1200);
        } else if (data.is_cancelled) {
          clearInterval(timer);
          alert("এই বুকিংটির সময়সীমা শেষ হওয়ায় সাময়িক সিট হোল্ড বাতিল করা হয়েছে।");
          window.location.href = `/payment-result?status=cancel&reference=${encodeURIComponent(reference)}`;
        }
      } catch {}
    }

    const poller = setInterval(checkStatus, 5000);
    // Initial check
    checkStatus();

    return () => {
      isCancelled = true;
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [verificationMode, reference, tranId]);

  async function handleConfirmPayment(e: React.FormEvent) {
    e.preventDefault();
    const cleanTrx = trxId.trim().toUpperCase();
    const cleanPhone = senderPhone.replace(/^\+88/, "").trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      setTrxError("দয়া করে আপনার প্রেরক রকেট মোবাইল নম্বর সঠিকভাবে লিখুন (কমপক্ষে ১০-১১ ডিজিট)।");
      return;
    }

    if (!cleanTrx || cleanTrx.length < 6) {
      setTrxError("দয়া করে রকেট ফিরতি এসএমএস থেকে প্রাপ্ত সঠিক ট্রানজেকশন আইডি (TrxID) লিখুন।");
      return;
    }

    setTrxError("");
    setLoading(true);
    setActionType("confirm");

    try {
      // Call the Hybrid Smart Matcher verification endpoint
      const res = await fetch("/api/v1/payments/rocket/verify-trx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tran_id: tranId,
          payment_id: paymentId,
          trx_id: cleanTrx,
          sender_phone: cleanPhone,
          amount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTrxError(data.detail || "ভেরিফিকেশন সম্পন্ন হয়নি। দয়া করে সঠিক TrxID লিখুন।");
        setLoading(false);
        setActionType(null);
        return;
      }

      // CASE A: Instant 1-second auto-match! (SMS already in database)
      if (data.status === "matched_instant" && data.redirect_url) {
        setVerificationMode("matched");
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 800);
        return;
      }

      // CASE B: Hybrid Fallback (Awaiting DBBL SMS or staff approval, 15m hold)
      if (data.status === "pending_verification") {
        setHoldExpiresAt(data.hold_expires_at || null);
        setSecondsRemaining(15 * 60);
        setVerificationMode("watching");
        setLoading(false);
        setActionType(null);
      }
    } catch {
      setTrxError("সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। আবার চেষ্টা করুন।");
      setLoading(false);
      setActionType(null);
    }
  }

  async function handleCancelPayment() {
    if (window.confirm("আপনি কি পেমেন্ট বাতিল করতে চান? বুকিংটির সাময়িক সিট হোল্ড মুক্ত হয়ে যাবে।")) {
      setLoading(true);
      setActionType("cancel");
      const callbackUrl = `/api/v1/payments/rocket/callback?status=cancel&tran_id=${encodeURIComponent(
        tranId
      )}&paymentID=${encodeURIComponent(paymentId)}&reference=${encodeURIComponent(reference)}`;
      window.location.href = callbackUrl;
    }
  }

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-[#F3F4F6] px-4 py-8 sm:py-14 flex flex-col items-center justify-start text-slate-800 font-sans">
      {/* Clean Top Bar */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between px-1 text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium transition"
        >
          <span>←</span>
          <span>সাভার ট্যুর লাভার</span>
        </Link>
        <span className="text-slate-500 font-medium">হেল্পলাইন: 01646-325350</span>
      </div>

      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-lg border border-slate-200">
        {/* DBBL Rocket Official Header */}
        <div className="bg-[#8C1D7D] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight leading-none">Rocket</span>
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                রকেট
              </span>
            </div>
            <p className="text-[11px] text-pink-100 font-medium mt-1">
              Dutch-Bangla Bank · ডাচ-বাংলা ব্যাংক
            </p>
          </div>
          <span className="text-sm font-semibold opacity-95">পেমেন্ট গেটওয়ে</span>
        </div>

        {/* Merchant & Booking Details Strip */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-slate-500 text-[11px]">মার্চেন্ট:</span>
              <p className="font-semibold text-slate-900 text-sm">{merchantName}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">{title}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[11px]">বুকিং রেফারেন্স:</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="font-mono font-bold text-slate-900 text-xs tracking-wide">
                  {reference || "STL-PENDING"}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(reference, "ref")}
                  className="rounded bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 text-[10px] font-semibold transition cursor-pointer"
                >
                  {copiedRef ? "কপিড" : "কপি"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-slate-200/80 pt-3">
            <div>
              <span className="text-[11px] text-slate-500">প্রদেয় অগ্রিম টাকা:</span>
              <div className="text-2xl font-black text-[#8C1D7D]">{formatBDT(numAmount)}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(String(Math.round(numAmount)), "amount")}
              className="rounded-lg bg-purple-50 hover:bg-purple-100 text-[#8C1D7D] border border-purple-200 px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
            >
              {copiedAmount ? "টাকা কপি হয়েছে" : "টাকা কপি করুন"}
            </button>
          </div>
        </div>

        {/* SCREEN 1: INSTANT SUCCESS CELEBRATION */}
        {verificationMode === "matched" && (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-slate-900">পেমেন্ট সফলভাবে ভেরিফাই হয়েছে!</h2>
            <p className="text-sm text-slate-600">
              ডাচ-বাংলা ব্যাংক এসএমএস দ্বারা আপনার পেমেন্ট ১০০% কনফার্ম করা হয়েছে। আপনার অফিসিয়াল ই-টিকেট তৈরি হচ্ছে...
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full">
                <span className="animate-spin text-purple-700">⟳</span> রিডাইরেক্ট করা হচ্ছে...
              </span>
            </div>
          </div>
        )}

        {/* SCREEN 2: PENDING VERIFICATION COUNTDOWN */}
        {verificationMode === "watching" && (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-2">
              <span className="text-xs font-semibold text-amber-900">
                পেমেন্ট রিকোয়েস্ট গ্রহণ করা হয়েছে
              </span>
              <div className="font-mono text-3xl font-black text-[#8C1D7D] tracking-wider">
                {formatCountdown(secondsRemaining)}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                আপনার TrxID: <strong className="font-mono text-slate-900">{trxId}</strong><br />
                রকেট থেকে এসএমএস নিশ্চিত হওয়ার সাথে সাথেই এই পেজটি স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const query = reference
                  ? `reference=${encodeURIComponent(reference)}`
                  : `tran_id=${encodeURIComponent(tranId)}`;
                fetch(`/api/v1/payments/rocket/check-status?${query}`)
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.is_confirmed && data.redirect_url) {
                      window.location.href = data.redirect_url;
                    } else {
                      alert("লেনদেনটি এখনও ভেরিফাই হচ্ছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।");
                    }
                  });
              }}
              className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 text-xs font-semibold transition cursor-pointer"
            >
              পুনরায় চেক করুন
            </button>

            <button
              type="button"
              onClick={handleCancelPayment}
              className="w-full text-center text-xs text-slate-500 hover:text-rose-600 py-1 transition cursor-pointer"
            >
              পেমেন্ট বাতিল করুন
            </button>
          </div>
        )}

        {/* SCREEN 3: NORMAL REAL PAYMENT ENTRY FORM */}
        {verificationMode === "form" && (
          <div className="p-6 space-y-5">
            {/* Merchant Account Highlight Box */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-purple-900 font-medium">রকেট মার্চেন্ট নম্বর:</span>
                <div className="font-mono text-xl font-black text-slate-900 tracking-wider">
                  {merchantAccount}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(merchantAccount, "account")}
                className="rounded-lg bg-[#8C1D7D] hover:bg-[#741267] text-white px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                {copiedAccount ? "কপি হয়েছে" : "নম্বর কপি"}
              </button>
            </div>

            {/* Clean Instructions */}
            <div className="text-xs text-slate-600 space-y-1.5 pl-1 leading-relaxed border-l-2 border-[#8C1D7D]/40">
              <p>১. রকেট অ্যাপে যান অথবা ডায়াল করুন <strong>*322#</strong></p>
              <p>২. <strong>Merchant Pay</strong> নির্বাচন করে মার্চেন্ট নম্বরে <strong>{formatBDT(numAmount)}</strong> পাঠান</p>
              <p>৩. রেফারেন্সে লিখুন <strong>{reference || "STL"}</strong></p>
              <p>৪. পেমেন্ট শেষে পাওয়া <strong>TxnID / TrxID</strong> নিচের বক্সে লিখে কনফার্ম করুন</p>
            </div>

            {/* Real Transaction Submission Form */}
            <form onSubmit={handleConfirmPayment} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  যে রকেট নম্বর থেকে টাকা পাঠিয়েছেন (Sender Rocket Number) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => {
                    setSenderPhone(e.target.value);
                    setTrxError("");
                  }}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-[#8C1D7D] focus:bg-white focus:ring-2 focus:ring-[#8C1D7D]/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  রকেট ট্রানজেকশন আইডি (Rocket TrxID) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => {
                      setTrxId(e.target.value.toUpperCase());
                      setTrxError("");
                    }}
                    placeholder="যেমন: 2938475891 বা 8AK9MP10"
                    className="w-full rounded-xl border-2 border-purple-300 bg-white px-4 py-3 text-base font-mono font-black tracking-wider text-purple-950 outline-none focus:border-[#8C1D7D] focus:ring-3 focus:ring-[#8C1D7D]/20 transition placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-black text-purple-900/60 uppercase">
                    TrxID
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  রকেট থেকে পাওয়া কনফার্মেশন এসএমএসে TxnID / TrxID নম্বরটি পাবেন।
                </p>
              </div>

              {trxError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{trxError}</span>
                </div>
              )}

              {/* Confirm Payment Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#8C1D7D] hover:bg-[#741267] text-white py-3 text-sm font-semibold shadow-xs transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? "যাচাই করা হচ্ছে..." : `পেমেন্ট নিশ্চিত করুন (${formatBDT(numAmount)})`}
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 transition cursor-pointer"
              >
                পেমেন্ট বাতিল করুন
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Clean Footer */}
      <div className="w-full max-w-md mt-4 text-center text-xs text-slate-500">
        কোনো সমস্যা হলে যোগাযোগ করুন: <strong>01646-325350</strong>
      </div>
    </main>
  );
}

export default function RocketPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] text-slate-600">
          <p>লোড হচ্ছে...</p>
        </div>
      }
    >
      <RocketRealPaymentContent />
    </Suspense>
  );
}
