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
      )}&paymentID=${encodeURIComponent(paymentId)}`;
      window.location.href = callbackUrl;
    }
  }

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#260422] via-[#420a3a] to-[#170215] px-3 py-6 sm:py-12 flex flex-col items-center justify-start text-slate-800 font-sans">
      {/* Top Breadcrumb Header Bar */}
      <div className="w-full max-w-xl mb-3 flex items-center justify-between px-2 text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-pink-200 hover:text-white transition font-medium"
        >
          <span>←</span>
          <span>সাভার ট্যুর লাভার (Savar Tour Lover)</span>
        </Link>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-pink-200/90 font-mono text-[11px]">
          🔒 Smart Matcher Active
        </span>
      </div>

      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/20">
        {/* DBBL Rocket Official Header */}
        <div className="bg-gradient-to-r from-[#8C1D7D] via-[#751167] to-[#5a0c50] px-5 sm:px-7 py-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-inner border border-white/30">
                🚀
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Rocket</h1>
                  <span className="rounded-md bg-white/25 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                    রকেট
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-pink-100 font-medium leading-tight">
                  Dutch-Bangla Bank · ডাচ-বাংলা ব্যাংক মোবাইল ব্যাংকিং
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-block rounded-full bg-emerald-500/30 border border-emerald-300/50 px-3 py-1 text-[11px] font-bold text-emerald-200">
                ● অটো-ভেরিফিকেশন
              </span>
            </div>
          </div>
        </div>

        {/* Merchant & Booking Details Strip */}
        <div className="border-b border-purple-100 bg-purple-50/70 px-5 sm:px-7 py-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
            <div>
              <span className="text-slate-500 font-medium">মার্চেন্ট (Merchant):</span>
              <p className="font-bold text-purple-950 text-sm mt-0.5">{merchantName}</p>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-600 font-mono mt-0.5">
                <span>MID: <strong>{merchantId}</strong></span>
                <span>·</span>
                <span>TID: <strong>{merchantTid}</strong></span>
              </div>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-500 font-medium">বুকিং রেফারেন্স (Ref):</span>
              <div className="flex sm:justify-end items-center gap-1.5 mt-0.5">
                <span className="font-mono font-bold text-slate-900 text-sm tracking-wide">
                  {reference || "STL-PENDING"}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(reference, "ref")}
                  title="রেফারেন্স কপি করুন"
                  className="rounded-md bg-purple-200/80 hover:bg-purple-300 text-purple-950 px-1.5 py-0.5 text-[10px] font-bold cursor-pointer transition"
                >
                  {copiedRef ? "✓ কপিড" : "কপি"}
                </button>
              </div>
              <p className="truncate max-w-[240px] sm:ml-auto text-[11px] text-slate-600 font-medium mt-0.5">
                {title}
              </p>
              {cusName && (
                <p className="text-[11px] text-slate-500 font-medium">
                  যাত্রী: {cusName}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between border-t border-purple-200/80 pt-3">
            <div>
              <span className="font-bold text-purple-950 text-xs sm:text-sm">
                পরিশোধযোগ্য অগ্রিম (Payable Advance):
              </span>
              <p className="text-[10px] text-slate-500">বুকিং কনফার্মেশনের জন্য নির্ধারিত অগ্রিম টাকা</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-[#8C1D7D]">
                {formatBDT(numAmount)}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(String(Math.round(numAmount)), "amount")}
                className="rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-950 px-2 py-1 text-[10px] font-bold cursor-pointer transition shadow-xs"
              >
                {copiedAmount ? "✓ কপিড" : "টাকা কপি"}
              </button>
            </div>
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

        {/* SCREEN 2: HYBRID FALLBACK 15-MINUTE COUNTDOWN WATCHER */}
        {verificationMode === "watching" && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5 text-center space-y-3 shadow-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <span>⏱️ ভেরিফিকেশন পেন্ডিং (১৫ মিনিট সিট হোল্ড)</span>
              </div>

              <div>
                <p className="text-xs text-amber-950 font-medium">
                  আপনার ট্রানজেকশন আইডি ({trxId}) সিস্টেমে গ্রহণ করা হয়েছে।
                </p>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="font-mono text-4xl sm:text-5xl font-black text-[#8C1D7D] tracking-widest">
                    {formatCountdown(secondsRemaining)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1 font-medium">
                  বাকি সময় · এই সময়ের মধ্যে ব্যাংক এসএমএস আসলে স্বয়ংক্রিয়ভাবে টিকেট নিশ্চিত হবে
                </p>
              </div>

              <div className="border-t border-amber-200/80 pt-3 text-[11px] text-amber-950/90 leading-relaxed text-left space-y-1.5">
                <p className="font-semibold text-amber-900 flex items-center gap-1">
                  <span>ℹ️</span> <strong>পেমেন্ট ট্র্যাকিং স্ট্যাটাস:</strong>
                </p>
                <p>• ডাটাবেজে আপনার ট্রানজেকশন আইডি সংরক্ষিত হয়েছে।</p>
                <p>• মার্চেন্ট ফোনে ডাচ-বাংলা ব্যাংক থেকে এসএমএস পৌঁছানোমাত্রই পেজটি স্বয়ংক্রিয়ভাবে রিফ্রেশ হয়ে যাবে।</p>
                <p>• ১৫ মিনিটের মধ্যে ভেরিফাই না হলে আসনগুলো রিলিজ হয়ে যাবে।</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
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
                        alert("এখনও ব্যাংক এসএমএস প্রসেসিং হচ্ছে। দয়া করে কিছুক্ষণ অপেক্ষা করুন।");
                      }
                    });
                }}
                className="w-full rounded-xl bg-purple-100 hover:bg-purple-200 text-[#8C1D7D] py-3 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>⟳</span>
                <span>এখনই স্ট্যাটাস রিফ্রেশ করুন (Check Again)</span>
              </button>

              <button
                type="button"
                onClick={handleCancelPayment}
                className="text-xs text-slate-500 hover:text-rose-600 font-semibold py-2 transition cursor-pointer text-center"
              >
                ✕ পেমেন্ট বাতিল করে আসন মুক্ত করুন
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: NORMAL REAL PAYMENT ENTRY FORM */}
        {verificationMode === "form" && (
          <div className="p-5 sm:p-7 space-y-5">
            {/* Merchant Account Highlight Box */}
            <div className="rounded-2xl border-2 border-[#8C1D7D]/30 bg-purple-50/80 p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wide">
                    রকেট একাউন্ট থেকে পেমেন্ট করুন এই নম্বরে:
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-[#8C1D7D] tracking-wider">
                      {merchantAccount}
                    </span>
                    <span className="rounded-md bg-[#8C1D7D] text-white px-2 py-0.5 text-[10px] font-bold">
                      মার্চেন্ট
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(merchantAccount, "account")}
                  className="self-start sm:self-center shrink-0 rounded-xl bg-[#8C1D7D] hover:bg-[#741267] active:scale-95 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span>{copiedAccount ? "✓ নম্বর কপি হয়েছে!" : "📋 নম্বর কপি করুন"}</span>
                </button>
              </div>
            </div>

            {/* Real Payment Procedure Steps */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span>📱</span>
                <span>রকেট পেমেন্ট করার বাস্তব প্রক্রিয়া (Real Payment Procedure):</span>
              </div>

              <div className="space-y-2 pt-1">
                {[
                  { step: "১", title: "রকেট অ্যাপ খুলুন", desc: "আপনার মোবাইল থেকে রকেট অ্যাপ ওপেন করুন অথবা ডায়াল করুন *322#" },
                  { step: "২", title: "Merchant Pay বেছে নিন", desc: "মেনু থেকে \"Merchant Pay / পেমেন্ট\" অপশন সিলেক্ট করুন" },
                  { step: "৩", title: "মার্চেন্ট একাউন্ট নম্বর দিন", desc: `মার্চেন্ট নম্বর হিসেবে লিখুন: ${merchantAccount}` },
                  { step: "৪", title: "টাকার পরিমাণ লিখুন", desc: `সঠিক অগ্রিম টাকা লিখুন: ${formatBDT(numAmount)}` },
                  { step: "৫", title: "রেফারেন্স নম্বর দিন", desc: `রেফারেন্স বক্সে লিখুন: ${reference || "STL"}` },
                  { step: "৬", title: "রকেট পিন দিয়ে কনফার্ম করুন", desc: "আপনার নিজস্ব রকেট পিন (PIN) দিয়ে লেনদেন সম্পন্ন করুন" },
                  { step: "৭", title: "TrxID সংগ্রহ করুন", desc: "পেমেন্ট সফল হলে প্রাপ্ত ফিরতি SMS থেকে Transaction ID (TrxID) সংগ্রহ করুন" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-2.5 bg-white/80 rounded-xl p-2 border border-amber-200/60 shadow-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8C1D7D] text-white font-bold text-[10px]">
                      {item.step}
                    </span>
                    <div className="text-[11px] leading-tight">
                      <strong className="text-purple-950 font-bold">{item.title}:</strong>{" "}
                      <span className="text-slate-700">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
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
                className="w-full rounded-2xl bg-gradient-to-r from-[#8C1D7D] to-[#600f55] py-3.5 text-sm sm:text-base font-bold text-white shadow-lg hover:from-[#76156a] hover:to-[#500a46] active:scale-[0.99] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && actionType === "confirm" ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>ব্যাংক এসএমএস ভেরিফাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>পেমেন্ট ও বুকিং নিশ্চিত করুন ({formatBDT(numAmount)})</span>
                  </>
                )}
              </button>

              {/* Cancel Payment */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCancelPayment}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                >
                  ✕ পেমেন্ট বাতিল করুন (Cancel Payment)
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security & Support Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>🔒</span>
            <span>Dutch-Bangla Bank Hybrid Smart Matcher</span>
          </div>
          <div>
            রকেট হেল্পলাইন: <strong className="font-mono text-purple-950 font-bold">16216</strong>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RocketPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#260422] text-white">
          <p className="animate-pulse">Loading Rocket Payment Gateway...</p>
        </div>
      }
    >
      <RocketRealPaymentContent />
    </Suspense>
  );
}
