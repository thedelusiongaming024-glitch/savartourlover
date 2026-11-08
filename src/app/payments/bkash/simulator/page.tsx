"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function formatBDT(amount: number): string {
  return "৳" + Math.round(amount).toLocaleString("en-BD");
}

function cleanInitialPhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/-\d+$/, "").replace(/^\+88/, "").trim();
}

// Crisp official-style bKash Origami Bird vector logo
function BkashLogo({ className = "h-7 w-7 text-white" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <polygon points="50,14 14,38 32,55 50,14" />
      <polygon points="50,14 32,55 75,55 50,14" opacity="0.92" />
      <polygon points="75,55 92,68 58,68 75,55" />
      <polygon points="32,55 14,74 44,74 32,55" opacity="0.88" />
      <polygon points="14,38 2,27 14,58 14,38" opacity="0.96" />
    </svg>
  );
}

function BKashPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || "";
  const amount = searchParams.get("amount") || "0";
  const reference = searchParams.get("reference") || "";
  const title = searchParams.get("title") || "ট্যুর বুকিং";
  const [paymentId] = useState(() => searchParams.get("payment_id") || `BKA-${Date.now()}`);
  const defaultPhone = searchParams.get("cus_phone") || "";
  const cusName = searchParams.get("cus_name") || "";

  // User input states
  const [senderPhone, setSenderPhone] = useState(() => cleanInitialPhone(defaultPhone));
  const [trxId, setTrxId] = useState("");
  const [trxError, setTrxError] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Verification states: "form" | "watching" | "matched"
  const [verificationMode, setVerificationMode] = useState<"form" | "watching" | "matched">("form");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [loading, setLoading] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const personalBkashNumber = process.env.NEXT_PUBLIC_BKASH_ACCOUNT_NUMBER || "01620592884";
  const recipientName = process.env.NEXT_PUBLIC_BKASH_ACCOUNT_NAME || "সাভার ট্যুর লাভার";

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

  // 15-minute countdown and polling for verification
  useEffect(() => {
    if (verificationMode !== "watching") return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let isCancelled = false;
    async function checkStatus() {
      try {
        const query = reference
          ? `reference=${encodeURIComponent(reference)}`
          : `tran_id=${encodeURIComponent(tranId)}`;
        const res = await fetch(`/api/v1/payments/bkash/check-status?${query}`);
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
          alert("সময়সীমা শেষ হওয়ায় বুকিংটি বাতিল করা হয়েছে।");
          window.location.href = `/payment-result?status=cancel&reference=${encodeURIComponent(reference)}`;
        }
      } catch {}
    }

    const poller = setInterval(checkStatus, 5000);
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

    if (!cleanPhone || cleanPhone.length < 11) {
      setTrxError("দয়া করে আপনার ১১ ডিজিটের বিকাশ নম্বরটি সঠিকভাবে লিখুন।");
      return;
    }

    if (!cleanTrx || cleanTrx.length < 6) {
      setTrxError("দয়া করে বিকাশ এসএমএস থেকে পাওয়া সঠিক TrxID লিখুন।");
      return;
    }

    setTrxError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/payments/bkash/verify-trx", {
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
        setTrxError(data.detail || "ভেরিফিকেশন সম্পন্ন হয়নি। TrxID যাচাই করে আবার চেষ্টা করুন।");
        setLoading(false);
        return;
      }

      // Instant match
      if (data.status === "matched_instant" && data.redirect_url) {
        setVerificationMode("matched");
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 800);
        return;
      }

      // Pending verification window
      if (data.status === "pending_verification") {
        setSecondsRemaining(15 * 60);
        setVerificationMode("watching");
        setLoading(false);
      }
    } catch {
      setTrxError("সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
      setLoading(false);
    }
  }

  function handleCancelPayment() {
    if (window.confirm("আপনি কি পেমেন্ট বাতিল করতে চান? বুকিংয়ের সিট ছেড়ে দেওয়া হবে।")) {
      const callbackUrl = `/api/v1/payments/bkash/callback?status=cancel&reference=${encodeURIComponent(
        reference
      )}&tran_id=${encodeURIComponent(tranId)}`;
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
        {/* Authentic bKash Brand Header */}
        <div className="bg-[#E2136E] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BkashLogo className="h-7 w-7 text-white fill-current" />
            <span className="text-2xl font-black tracking-tight leading-none">bKash</span>
          </div>
          <span className="text-sm font-semibold opacity-95">পেমেন্ট গেটওয়ে</span>
        </div>

        {/* Merchant & Order Summary */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-slate-500 text-[11px]">প্রাপক:</span>
              <p className="font-semibold text-slate-900 text-sm">{recipientName}</p>
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
              <div className="text-2xl font-black text-[#E2136E]">{formatBDT(numAmount)}</div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(String(Math.round(numAmount)), "amount")}
              className="rounded-lg bg-pink-50 hover:bg-pink-100 text-[#E2136E] border border-pink-200 px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
            >
              {copiedAmount ? "টাকা কপি হয়েছে" : "টাকা কপি করুন"}
            </button>
          </div>
        </div>

        {/* SCREEN 1: SUCCESS CONFIRMED */}
        {verificationMode === "matched" && (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-lg font-bold text-slate-900">পেমেন্ট সফল হয়েছে</h2>
            <p className="text-xs text-slate-600">
              আপনার বিকাশ লেনদেন সফলভাবে নিশ্চিত হয়েছে। টিকেট পেজে নেওয়া হচ্ছে...
            </p>
          </div>
        )}

        {/* SCREEN 2: PENDING VERIFICATION COUNTDOWN */}
        {verificationMode === "watching" && (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-center space-y-2">
              <span className="text-xs font-semibold text-amber-900">
                পেমেন্ট রিকোয়েস্ট গ্রহণ করা হয়েছে
              </span>
              <div className="font-mono text-3xl font-black text-[#E2136E] tracking-wider">
                {formatCountdown(secondsRemaining)}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                আপনার TrxID: <strong className="font-mono text-slate-900">{trxId}</strong><br />
                বিকাশ থেকে এসএমএস নিশ্চিত হওয়ার সাথে সাথেই এই পেজটি স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const query = reference
                  ? `reference=${encodeURIComponent(reference)}`
                  : `tran_id=${encodeURIComponent(tranId)}`;
                fetch(`/api/v1/payments/bkash/check-status?${query}`)
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

        {/* SCREEN 3: STANDARD PAYMENT FORM */}
        {verificationMode === "form" && (
          <div className="p-6 space-y-5">
            {/* Account Number Card */}
            <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-pink-900 font-medium">বিকাশ পার্সোনাল নম্বর:</span>
                <div className="font-mono text-xl font-black text-slate-900 tracking-wider">
                  {personalBkashNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(personalBkashNumber, "account")}
                className="rounded-lg bg-[#E2136E] hover:bg-[#C2105D] text-white px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
              >
                {copiedAccount ? "কপি হয়েছে" : "নম্বর কপি"}
              </button>
            </div>

            {/* Clean Instructions */}
            <div className="text-xs text-slate-600 space-y-1.5 pl-1 leading-relaxed border-l-2 border-[#E2136E]/40">
              <p>১. বিকাশ অ্যাপে যান অথবা ডায়াল করুন <strong>*247#</strong></p>
              <p>২. <strong>Send Money</strong> নির্বাচন করে উপরে দেওয়া নম্বরে <strong>{formatBDT(numAmount)}</strong> পাঠান</p>
              <p>৩. রেফারেন্সে লিখুন <strong>{reference || "STL"}</strong></p>
              <p>৪. লেনদেন শেষে প্রাপ্ত <strong>TrxID</strong> নিচের বক্সে লিখুন</p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleConfirmPayment} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  যে নম্বর থেকে টাকা পাঠিয়েছেন:
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-[#E2136E] focus:ring-1 focus:ring-[#E2136E] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিকাশ ট্রানজেকশন আইডি (TrxID):
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => {
                    setTrxId(e.target.value.toUpperCase());
                    setTrxError("");
                  }}
                  placeholder="যেমন: BLA9X1K8O2"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider text-slate-900 outline-none focus:border-[#E2136E] focus:ring-1 focus:ring-[#E2136E] transition placeholder:tracking-normal placeholder:font-sans"
                />
              </div>

              {trxError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                  {trxError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#E2136E] hover:bg-[#C2105D] text-white py-3 text-sm font-semibold shadow-xs transition disabled:opacity-60 cursor-pointer"
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

export default function BKashSimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center text-slate-600 text-sm">
          লোড হচ্ছে...
        </div>
      }
    >
      <BKashPaymentContent />
    </Suspense>
  );
}
