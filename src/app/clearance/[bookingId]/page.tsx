"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { getAuthHeaders } from "@/lib/clientAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface ClearanceBooking {
  booking_reference: string;
  customer_name: string;
  tour_title: string;
  amount_paid?: string;
  amount_due: string;
  total_price?: string;
  is_cleared: boolean;
  departure_date?: string;
  traveler_count?: number;
  selected_seats?: string[];
  pickup_point?: string;
  payment_method?: string;
  advance_payment_method?: string;
  due_payment_method?: string;
  due_cash_approved_by?: string;
  booking_status?: string;
}

interface ResolveResponse {
  status: "verified" | "due_pending";
  message: string;
  amount_due?: string;
  booking: ClearanceBooking;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "expired" }
  | { kind: "invalid" }
  | { kind: "error"; message: string }
  | { kind: "resolved"; data: ResolveResponse };

function formatBDT(amount: string | number): string {
  return "৳" + Math.round(Number(amount)).toLocaleString("en-BD");
}

export default function ClearancePage() {
  const params = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [paying, setPaying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"Bkash payment" | "cash_on_hand">("Bkash payment");
  const [cashSuccessMsg, setCashSuccessMsg] = useState("");

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch(
          `${API_BASE}/clearance/${params.bookingId}${token ? `?token=${encodeURIComponent(token)}` : ""}`,
          { headers: getAuthHeaders(), credentials: "same-origin" }
        );
        if (res.status === 410) {
          setState({ kind: "expired" });
          return;
        }
        if (res.status === 400) {
          setState({ kind: "invalid" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", message: "Could not verify this booking right now." });
          return;
        }
        const data = (await res.json()) as ResolveResponse & { token?: string };
        if (data.token && !token) {
          setToken(data.token);
        }
        if (data.booking.due_payment_method === "cash_on_hand") {
          setSelectedMethod("cash_on_hand");
        }
        setState({ kind: "resolved", data });
      } catch {
        setState({ kind: "error", message: "Could not reach the server. Check your connection and reload." });
      }
    }
    resolve();
  }, [params.bookingId, token]);

  async function handlePayOnline() {
    setPaying(true);
    setCashSuccessMsg("");
    try {
      const activeToken = token || (state.kind === "resolved" && (state.data as any).token) || "";
      const res = await fetch(`${API_BASE}/clearance/${params.bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "same-origin",
        body: JSON.stringify({ method: "Bkash payment", token: activeToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Payment initiation failed.");
      }
      const data = await res.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not initiate payment. Please try again or contact support.");
      setPaying(false);
    }
  }

  async function handlePayHandCash() {
    setPaying(true);
    setCashSuccessMsg("");
    try {
      const activeToken = token || (state.kind === "resolved" && (state.data as any).token) || "";
      const res = await fetch(`${API_BASE}/clearance/${params.bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "same-origin",
        body: JSON.stringify({ method: "cash_on_hand", token: activeToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to record cash payment request.");
      }
      setCashSuccessMsg("বকেয়া টাকা হাতে নগদে পরিশোধের আবেদন গৃহীত হয়েছে। যাত্রার দিন ট্যুর হোস্টের নিকট টাকা বুঝিয়ে দিন।");
      if (state.kind === "resolved") {
        setState({
          kind: "resolved",
          data: {
            ...state.data,
            booking: {
              ...state.data.booking,
              due_payment_method: "cash_on_hand",
            },
          },
        });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not record cash payment request.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white/80 p-6 sm:p-8 text-center shadow-xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-white border border-emerald-500/20 p-1 shadow-xs mb-2">
            <img src="/images/logo-badge.png" alt="Savar Tour Lover" className="h-full w-full object-contain" />
          </div>
          <span className="font-display text-lg font-bold text-ink">Savar Tour Lover</span>
          <span className="text-xs font-semibold text-emerald-700">আপনার স্বপ্ন উড়তে দিন</span>
        </div>

        {state.kind === "loading" && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-deep/20 border-t-emerald-deep" />
            <p className="text-ink-soft">Verifying your booking…</p>
          </>
        )}

        {state.kind === "expired" && (
          <>
            <Icon name="clock" className="mx-auto mb-4 h-10 w-10 text-amber-500" />
            <h1 className="font-display text-xl font-semibold text-ink">This link has expired</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Please contact our team directly, or reach out to your tour host or support team.
            </p>
          </>
        )}

        {state.kind === "invalid" && (
          <>
            <Icon name="shield" className="mx-auto mb-4 h-10 w-10 text-rose-500" />
            <h1 className="font-display text-xl font-semibold text-ink">Invalid clearance link</h1>
            <p className="mt-2 text-sm text-ink-soft">This link doesn&apos;t match a valid booking.</p>
          </>
        )}

        {state.kind === "error" && (
          <>
            <Icon name="shield" className="mx-auto mb-4 h-10 w-10 text-rose-500" />
            <p className="text-sm text-ink-soft">{state.message}</p>
          </>
        )}

        {state.kind === "resolved" && state.data.status === "verified" && (
          <>
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-deep/10">
              <Icon name="check" className="h-8 w-8 text-emerald-deep" />
            </span>
            <h1 className="font-display text-xl font-semibold text-ink">Booking Confirmed — Fully Paid</h1>
            <div className="mt-4 space-y-1.5 text-sm text-ink-soft text-left bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="font-semibold text-ink text-base">{state.data.booking.tour_title}</p>
              <p className="font-mono text-xs text-slate-500">{state.data.booking.booking_reference}</p>
              <p>👤 Traveler: <strong>{state.data.booking.customer_name}</strong></p>
              {state.data.booking.departure_date && (
                <p className="text-xs">📅 Departure: {state.data.booking.departure_date.slice(0, 10)}</p>
              )}
              {state.data.booking.selected_seats && state.data.booking.selected_seats.length > 0 && (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  💺 Assigned Seats: {state.data.booking.selected_seats.join(", ")}
                </div>
              )}
              {state.data.booking.pickup_point && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <span>📍 Pick-up Point:</span>
                  <span className="font-semibold text-slate-900">{state.data.booking.pickup_point}</span>
                </div>
              )}
              
              {/* Payment Methods Breakdown */}
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Advance Payment:</span>
                  <span className="font-semibold text-slate-900">
                    {state.data.booking.advance_payment_method === "cash_on_hand" || state.data.booking.payment_method === "cash_on_hand"
                      ? "💵 Cash on Hand (হাতে নগদ)"
                      : "📱 Bkash payment (বিকাশ)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Due Settlement:</span>
                  <span className="font-semibold text-emerald-800">
                    {state.data.booking.due_payment_method === "cash_on_hand"
                      ? "💵 Cash on Hand (Cleared)"
                      : "📱 Bkash payment (Cleared)"}
                  </span>
                </div>
              </div>
            </div>
            
            <a
              href={`/tickets/${params.bookingId}`}
              className="mt-5 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-emerald-deep px-4 py-3 font-medium text-white transition hover:brightness-110 shadow-xs text-sm"
            >
              <span>🎟️ View / Print E-Ticket</span>
            </a>
          </>
        )}

        {state.kind === "resolved" && state.data.status === "due_pending" && (
          <>
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Icon name="receipt" className="h-7 w-7 text-amber-600" />
            </span>
            <h1 className="font-display text-xl font-bold text-ink">Remaining Balance Due</h1>
            <div className="mt-3 space-y-1.5 text-sm text-ink-soft text-left bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="font-semibold text-ink text-base">{state.data.booking.tour_title}</p>
              <p className="font-mono text-xs text-slate-500">{state.data.booking.booking_reference}</p>
              <p>👤 Traveler: <strong>{state.data.booking.customer_name}</strong></p>
              {state.data.booking.departure_date && (
                <p className="text-xs">📅 Departure: {state.data.booking.departure_date.slice(0, 10)}</p>
              )}
              {state.data.booking.selected_seats && state.data.booking.selected_seats.length > 0 && (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  💺 Assigned Seats: {state.data.booking.selected_seats.join(", ")}
                </div>
              )}
              {state.data.booking.pickup_point && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <span>📍 Pick-up:</span>
                  <span className="font-semibold text-slate-900">{state.data.booking.pickup_point}</span>
                </div>
              )}

              {/* Advance Payment Method Badge */}
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Advance System:</span>
                <span className="font-semibold text-slate-800">
                  {state.data.booking.advance_payment_method === "cash_on_hand" || state.data.booking.payment_method === "cash_on_hand"
                    ? "💵 Hand Cash (হাতে নগদ)"
                    : "📱 Bkash payment (বিকাশ)"}
                </span>
              </div>
            </div>

            <p className="mt-4 font-display text-3xl font-extrabold text-ink">
              {formatBDT(state.data.amount_due ?? state.data.booking.amount_due)}
            </p>
            <p className="text-xs text-slate-500">বকেয়া টাকা পরিশোধ মাধ্যম নির্বাচন করুন</p>

            {/* Hand Cash Success Notice */}
            {cashSuccessMsg && (
              <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 text-left space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>✓</span> {cashSuccessMsg}
                </p>
                <p className="text-[11px] text-emerald-700">
                  ট্যুর শুরু হওয়ার সময় ট্যুর হোস্ট আপনার নাম ও রেফারেন্স চেক করে নগদ টাকা রিসিভ করবেন।
                </p>
              </div>
            )}

            {/* Active Hand Cash Status Box */}
            {state.data.booking.due_payment_method === "cash_on_hand" && !cashSuccessMsg && (
              <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-left space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💵</span>
                  <div>
                    <h3 className="font-bold text-amber-950 text-xs sm:text-sm">হাতে নগদ পরিশোধ নির্বাচিত (Pay by Hand Cash)</h3>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      বাকি {formatBDT(state.data.amount_due ?? state.data.booking.amount_due)} টাকা ট্যুর শুরুর দিন ট্যুর হোস্টের কাছে বা সাভার অফিসে সরাসরি পরিশোধ করুন।
                    </p>
                  </div>
                </div>
                <div className="pt-1.5 text-[10px] text-amber-700 flex items-center justify-between border-t border-amber-200">
                  <span>স্ট্যাটাস: ট্যুর দিনে হোস্ট কর্তৃক গ্রহণ সাপেক্ষ</span>
                  <span className="font-mono font-bold">DUE CASH CONFIRMED</span>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="mt-4 space-y-2 text-left">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                পেমেন্ট সিস্টেম নির্বাচন (Choose Payment System):
              </label>

              {/* Option 1: Bkash payment */}
              <label
                onClick={() => setSelectedMethod("Bkash payment")}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                  selectedMethod === "Bkash payment"
                    ? "border-pink-600 bg-pink-50/70 shadow-xs ring-1 ring-pink-600"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="due_method"
                  checked={selectedMethod === "Bkash payment"}
                  onChange={() => setSelectedMethod("Bkash payment")}
                  className="mt-1 text-pink-600 focus:ring-pink-500 accent-pink-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      📱 বিকাশ পেমেন্ট (bKash Payment Gateway)
                    </span>
                    <span className="text-[10px] font-bold text-pink-800 bg-pink-100/90 px-2 py-0.5 rounded-full">
                      ইনস্ট্যান্ট নিশ্চিত
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Direct checkout via official bKash Payment Gateway API
                  </p>
                  <p className="mt-1 text-[10px] text-pink-800 bg-pink-100/80 rounded px-1.5 py-0.5 inline-block font-mono">
                    🧪 Sandbox Test Wallet: <strong>01770618575</strong> · OTP: <strong>123456</strong> · PIN: <strong>12121</strong>
                  </p>
                </div>
              </label>

              {/* Option 2: Hand Cash */}
              <label
                onClick={() => setSelectedMethod("cash_on_hand")}
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                  selectedMethod === "cash_on_hand"
                    ? "border-amber-600 bg-amber-50/70 shadow-xs ring-1 ring-amber-600"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="due_method"
                  checked={selectedMethod === "cash_on_hand"}
                  onChange={() => setSelectedMethod("cash_on_hand")}
                  className="mt-1 text-amber-600 focus:ring-amber-500 accent-amber-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      💵 হাতে নগদ পরিশোধ (Pay Cash to Tour Host)
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      ট্যুর দিনে প্রদেয়
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    ট্যুর শুরুর দিন সরাসরি ট্যুর হোস্টের নিকট বা সাভার অফিস কাউন্টারে ক্যাশ দিন
                  </p>
                </div>
              </label>
            </div>

            {!token && !(state.data as ResolveResponse & { token?: string }).token && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 text-left">
                To confirm this balance payment, please sign in or open the link from your e-ticket.
              </p>
            )}

            {/* Action Buttons */}
            {selectedMethod === "Bkash payment" ? (
              <button
                onClick={handlePayOnline}
                disabled={paying || (!token && !(state.data as ResolveResponse & { token?: string }).token)}
                className="mt-4 w-full rounded-xl bg-[#D12053] hover:bg-[#b01742] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60 shadow-xs text-sm cursor-pointer"
              >
                {paying ? "Connecting to bKash…" : `Pay ${formatBDT(state.data.amount_due ?? state.data.booking.amount_due)} via bKash Payment`}
              </button>
            ) : (
              <button
                onClick={handlePayHandCash}
                disabled={paying || (!token && !(state.data as ResolveResponse & { token?: string }).token)}
                className="mt-4 w-full rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60 shadow-xs text-sm cursor-pointer"
              >
                {paying ? "প্রক্রিয়াধীন…" : `💵 ট্যুর দিনে নগদ পরিশোধ নিশ্চিত করুন (${formatBDT(state.data.amount_due ?? state.data.booking.amount_due)})`}
              </button>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <a href={`/tickets/${params.bookingId}`} className="hover:text-emerald-700 underline font-medium">
                ← ই-টিকিট দেখুন
              </a>
              <a href="/profile" className="hover:text-emerald-700 underline font-medium">
                আমার প্রোফাইল
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
