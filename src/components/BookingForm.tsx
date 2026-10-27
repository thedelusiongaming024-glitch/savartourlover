"use client";

import { useState, useEffect, useRef } from "react";
import type { Tour } from "@/lib/types";
import { DEFAULT_PICKUP_POINTS } from "@/lib/pickupPoints";
import { BusSeatSelector } from "@/components/BusSeatSelector";
import { TourDepartureCalendar } from "@/components/TourDepartureCalendar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

interface BookingFormProps {
  tour: Tour;
  finalPrice: number;
  advanceAmount: number;
}

type Step = "form" | "submitting" | "redirecting" | "cash_confirmed" | "error" | "offline";

function formatBDT(amount: number): string {
  return "৳" + Math.round(amount).toLocaleString("en-BD");
}

function CashCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    setTimeLeft(Math.max(0, Math.floor(diff / 1000)));
  }, [expiresAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const s = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(s);
      if (s <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (timeLeft === null) return null;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  if (isExpired) {
    return (
      <div className="rounded-xl bg-rose-100 border border-rose-300 p-3 text-center text-rose-800 font-bold text-sm">
        ❌ 10-Minute Window Expired. Seats have been automatically released.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-center">
      <div className="text-xs text-amber-800 font-medium">Time Remaining for Admin Approval:</div>
      <div className="text-2xl font-mono font-extrabold text-amber-900 tracking-wider my-0.5">
        ⏳ {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      <p className="text-[11px] text-amber-700">
        Admin will verify physical cash and approve from the admin panel within 10 minutes.
      </p>
    </div>
  );
}

interface AppliedPromo {
  code: string;
  title?: string;
  discount_type: "percent" | "flat";
  discount_value: string;
  discount_amount: number;
  tour_id?: string | null;
  tour_title?: string | null;
}

export function BookingForm({ tour, finalPrice, advanceAmount }: BookingFormProps) {
  const availablePickupPoints =
    Array.isArray(tour.pickupPoints) && tour.pickupPoints.length > 0
      ? tour.pickupPoints
      : DEFAULT_PICKUP_POINTS;

  const [step, setStep] = useState<Step>(tour.id ? "form" : "offline");
  const [error, setError] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departureId, setDepartureId] = useState(tour.departures?.[0]?.id ?? "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarContainerRef.current && !calendarContainerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCalendarOpen]);

  function formatDepartureDateDisplay(dateStr?: string) {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-").map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
        }
      }
    } catch {}
    return "";
  }
  const [pickupPoint, setPickupPoint] = useState<string>(availablePickupPoints[0] || "");
  const [isCustomPickup, setIsCustomPickup] = useState<boolean>(false);
  const [customPickupText, setCustomPickupText] = useState<string>("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<"full" | "partial">(
    tour.allowPartialPayment === false ? "full" : "partial"
  );
  const [paymentMethod, setPaymentMethod] = useState<"Bkash payment" | "Rocket payment" | "cash_on_hand">("Bkash payment");
  const [cashBookingData, setCashBookingData] = useState<{
    reference: string;
    expiresAt: string;
    amount: number;
    isFull: boolean;
    phone: string;
    bookingId: string;
  } | null>(null);

  // Promo code states
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  const selectedDeparture =
    tour.departures?.find((d) => d.id === departureId) || tour.departures?.[0];
  const departureTotalSeats =
    selectedDeparture?.totalSeats ||
    tour.total_seats ||
    tour.totalSeats ||
    tour.capacity ||
    40;
  const departureBookedSeats = selectedDeparture?.bookedSeats || [];

  const travelerCount = selectedSeats.length > 0 ? selectedSeats.length : 1;
  const rawTotalPrice = finalPrice * travelerCount;

  // Dynamic promo calculation
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === "percent") {
      const pct = parseFloat(appliedPromo.discount_value || "0") || 0;
      promoDiscount = Math.round((rawTotalPrice * pct) / 100);
    } else {
      promoDiscount = Math.round(parseFloat(appliedPromo.discount_value || "0") || 0);
    }
    promoDiscount = Math.min(promoDiscount, rawTotalPrice);
  }

  const totalFinalPrice = Math.max(0, rawTotalPrice - promoDiscount);
  const advancePercent = tour.advancePercent ?? (finalPrice > 0 ? Math.round((advanceAmount / finalPrice) * 100) : 40);
  const totalAdvanceAmount = Math.round((totalFinalPrice * advancePercent) / 100);
  const dueOnTourDay = paymentPlan === "full" ? 0 : Math.max(0, totalFinalPrice - totalAdvanceAmount);

  function handleDepartureChange(newId: string) {
    setDepartureId(newId);
    setSelectedSeats([]); // reset seats for new date
    setError("");
  }

  function handleSeatsChange(newSeats: string[]) {
    setSelectedSeats(newSeats);
    if (error) setError("");
  }

  async function handleApplyPromo(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanCode = promoInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError("Please enter a promo code.");
      return;
    }

    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      const res = await fetch(`${API_BASE}/offers/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          tour_id: tour.id,
          tour_slug: tour.slug,
          total_amount: rawTotalPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error || "Invalid promo code for this tour.");
        setAppliedPromo(null);
      } else {
        setAppliedPromo({
          code: data.code || cleanCode,
          title: data.title,
          discount_type: data.discount_type,
          discount_value: String(data.discount_value),
          discount_amount: Number(data.discount_amount) || 0,
          tour_id: data.tour_id,
          tour_title: data.tour_title,
        });
        setPromoSuccess(
          `Promo "${data.code || cleanCode}" applied! Saved ${formatBDT(data.discount_amount || 0)}.`
        );
        setPromoInput("");
      }
    } catch {
      setPromoError("Unable to validate promo code. Please check your connection and try again.");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoSuccess("");
    setPromoError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tour.id) return;

    if (selectedSeats.length === 0) {
      setError("Please select at least 1 seat on the bus layout before proceeding.");
      return;
    }

    const finalPickupPoint = isCustomPickup ? customPickupText.trim() : pickupPoint;
    if (isCustomPickup && !finalPickupPoint) {
      setError("Please specify your desired pick-up location.");
      return;
    }

    setStep("submitting");
    setError("");

    try {
      const bookingRes = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tour_id: tour.id,
          departure_id: departureId || undefined,
          traveler_count: selectedSeats.length,
          payment_plan: paymentPlan,
          customer_full_name: name,
          customer_phone_number: phone,
          customer_email: email,
          pickup_point: finalPickupPoint,
          selected_seats: selectedSeats,
          promo_code: appliedPromo ? appliedPromo.code : undefined,
          payment_method: paymentMethod,
        }),
      });

      if (!bookingRes.ok) {
        const body = await bookingRes.json().catch(() => ({}));
        throw new Error(
          typeof body === "object"
            ? Object.values(body).flat().join(" ") || "Could not create booking."
            : "Could not create booking."
        );
      }

      const booking = await bookingRes.json();

      if (booking.customer_token) {
        try {
          localStorage.setItem("tourlover_customer_token", booking.customer_token);
          localStorage.setItem("atithi_customer_token", booking.customer_token);
          if (booking.customer) {
            localStorage.setItem("tourlover_customer", JSON.stringify(booking.customer));
            localStorage.setItem("atithi_customer", JSON.stringify(booking.customer));
          }
          // The server already set the (httpOnly) session cookie on this response —
          // no need to (and, being httpOnly, no way to) set it again from JS.
        } catch {}
      }

      if (paymentMethod === "cash_on_hand") {
        setCashBookingData({
          reference: booking.reference || booking.id,
          expiresAt: booking.cash_approval_expires_at || "",
          amount: paymentPlan === "full" ? totalFinalPrice : totalAdvanceAmount,
          isFull: paymentPlan === "full",
          phone: phone,
          bookingId: booking.id,
        });
        setStep("cash_confirmed");
        return;
      }

      const paymentRes = await fetch(`${API_BASE}/payments/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          payment_type: paymentPlan === "full" ? "full" : "advance",
          payment_method: paymentMethod,
        }),
      });

      if (!paymentRes.ok) {
        throw new Error("Booking was created, but starting payment failed. Our team will contact you to complete it.");
      }

      const payment = await paymentRes.json();
      setStep("redirecting");
      if (payment.redirect_url) {
        window.location.assign(payment.redirect_url);
      } else {
        throw new Error("Payment gateway did not return a redirect URL.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("error");
    }
  }

  if (step === "offline") {
    return (
      <div className="rounded-2xl border border-white/40 bg-white/60 p-5 text-sm text-ink-soft backdrop-blur">
        Live booking isn&apos;t available in preview mode right now — please contact us directly to
        reserve this tour, or try again once the booking service is back online.
      </div>
    );
  }

  if (step === "cash_confirmed" && cashBookingData) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-300 bg-white/95 p-5 sm:p-6 backdrop-blur shadow-md animate-in fade-in">
        <div className="text-center space-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-2xl font-bold">
            💵
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Cash Booking Reserved!
          </h3>
          <p className="text-xs text-slate-600">
            Booking Reference: <strong className="font-mono text-emerald-800 font-bold text-sm">{cashBookingData.reference}</strong>
          </p>
        </div>

        {/* Live 10-Minute Countdown Clock */}
        <CashCountdown expiresAt={cashBookingData.expiresAt} />

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
          <div className="flex justify-between border-b border-slate-200/80 pb-2 font-medium">
            <span>Payment Amount ({cashBookingData.isFull ? "Full Payment" : "Advance Deposit"}):</span>
            <span className="font-extrabold text-slate-900 text-sm">{formatBDT(cashBookingData.amount)}</span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div>
              <span className="font-bold text-slate-800">🏢 Office Address:</span>
              <p className="text-slate-600 mt-0.5">Savar Pollibidut, Kobarsthan Road, Savar, Dhaka</p>
            </div>
            <div>
              <span className="font-bold text-slate-800">📞 Counter Hotlines:</span>
              <p className="text-slate-600 font-mono mt-0.5">+880 1620-592884 · +880 1929-582426</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 leading-relaxed">
          <strong>✓ Security Instruction:</strong> Please hand over physical cash to the counter executive immediately. The admin will verify and approve your booking from the admin panel within the <strong>10-minute window</strong>. Once approved, your official E-Ticket and Boarding Pass will be immediately available in your profile.
        </div>

        <div className="pt-1 flex flex-col sm:flex-row gap-2">
          <a
            href="/profile"
            className="flex-1 rounded-xl bg-emerald-deep px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xs hover:brightness-110 transition"
          >
            Go to My Profile / Bookings →
          </a>
          <button
            type="button"
            onClick={() => setStep("form")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Book Another Tour
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur shadow-sm">
      {/* Traveler contact info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-soft font-medium">Full name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 outline-none focus:border-emerald-deep"
            placeholder="Karim Hasan"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink-soft font-medium">Phone number</span>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 outline-none focus:border-emerald-deep"
            placeholder="+8801XXXXXXXXX"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink-soft font-medium">Email (optional)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 outline-none focus:border-emerald-deep"
          placeholder="you@example.com"
        />
      </label>

      {/* Scheduled Departure Calendar View */}
      {tour.departures && tour.departures.length > 0 ? (
        <div ref={calendarContainerRef} className="flex flex-col gap-1.5 text-sm relative">
          <div className="flex items-center justify-between">
            <span className="text-ink-soft font-medium flex items-center gap-1.5">
              <span>📅</span>
              <span>Departure Date (যাত্রার তারিখ)</span>
            </span>
            {selectedDeparture && (
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                {selectedDeparture.seatsRemaining} seats available
              </span>
            )}
          </div>

          {/* Standard Input Trigger matching Full name, Phone, Email & Pick-up Point */}
          <button
            type="button"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            aria-expanded={isCalendarOpen}
            className="w-full flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 outline-none focus:border-emerald-deep text-slate-800 text-sm font-medium hover:bg-white hover:border-emerald-300 transition cursor-pointer text-left shadow-2xs group"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-emerald-700 text-base leading-none">🗓️</span>
              {selectedDeparture ? (
                <span className="font-semibold text-slate-900 truncate">
                  {selectedDeparture.date}
                  {formatDepartureDateDisplay(selectedDeparture.date) && (
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      ({formatDepartureDateDisplay(selectedDeparture.date)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-slate-400">Select departure date</span>
              )}
            </div>

            <svg
              className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ml-2 ${
                isCalendarOpen ? "rotate-180 text-emerald-700" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible / Popover Calendar Card */}
          {isCalendarOpen && (
            <div className="mt-1 rounded-2xl border border-slate-200/90 bg-white shadow-xl p-1 z-20 animate-in fade-in zoom-in-95 duration-150">
              <TourDepartureCalendar
                departures={tour.departures}
                selectedDepartureId={departureId}
                onSelectDeparture={(depId) => {
                  handleDepartureChange(depId);
                }}
                onClose={() => setIsCalendarOpen(false)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 text-center font-medium">
          ⚠️ No scheduled departures currently configured for this tour. Please contact our support for private booking.
        </div>
      )}

      {/* Boarding Pick-up Point Selection */}
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-soft font-medium flex items-center gap-1.5">
            Pick-up Point (বোর্ডিং পয়েন্ট)
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            Pick Your Location.
          </span>
        </div>
        <select
          value={isCustomPickup ? "__custom__" : pickupPoint}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setIsCustomPickup(true);
            } else {
              setIsCustomPickup(false);
              setPickupPoint(e.target.value);
            }
          }}
          className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 outline-none focus:border-emerald-deep text-slate-800 text-sm font-medium"
        >
          {availablePickupPoints.map((pt) => (
            <option key={pt} value={pt}>
              📍 {pt}
            </option>
          ))}
          <option value="__custom__">➕ Other Location (Custom Pick-up Spot)</option>
        </select>

        {isCustomPickup && (
          <input
            type="text"
            required
            value={customPickupText}
            onChange={(e) => setCustomPickupText(e.target.value)}
            placeholder="e.g. Nabinagar Bypass, Hemayetpur, or specify your location"
            className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 outline-none focus:border-emerald-deep text-slate-800 text-sm"
          />
        )}
      </div>

      {/* Interactive Bus Seat Selection */}
      <div className="rounded-xl border border-white/70 bg-white/70 p-3 sm:p-4 backdrop-blur-xs">
        <div className="mb-2 text-center">
          <h4 className="text-sm font-semibold text-slate-800">
            Select Your Bus Seats
          </h4>
          <p className="text-xs text-slate-500">
            Pick your preferred seat(s) on the bus layout below.
          </p>
        </div>

        <BusSeatSelector
          totalSeats={departureTotalSeats}
          bookedSeats={departureBookedSeats}
          selectedSeats={selectedSeats}
          onSeatsChange={handleSeatsChange}
          disabled={step === "submitting" || step === "redirecting"}
        />
      </div>

      {/* Promo Code Entry */}
      <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
            🎟️ Have a Promo Code? (প্রোমো কোড)
          </span>
          {appliedPromo && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Code Applied
            </span>
          )}
        </div>

        {appliedPromo ? (
          <div className="flex items-center justify-between rounded-lg bg-white border border-emerald-300 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                {appliedPromo.code}
              </span>
              <span className="text-xs text-emerald-900 font-medium">
                Saved {formatBDT(promoDiscount)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value.toUpperCase());
                setPromoError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyPromo();
                }
              }}
              placeholder="e.g. BANDARBAN50, ARKO118"
              className="flex-1 uppercase font-mono text-xs rounded-xl border border-white/80 bg-white/90 px-3 py-2 outline-none focus:border-emerald-600 text-slate-900 placeholder:text-slate-400 placeholder:font-sans"
            />
            <button
              type="button"
              onClick={() => handleApplyPromo()}
              disabled={promoLoading || !promoInput.trim()}
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2 text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              {promoLoading ? "Applying..." : "Apply"}
            </button>
          </div>
        )}

        {promoError && (
          <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg p-2 animate-in fade-in">
            ⚠️ {promoError}
          </p>
        )}
        {promoSuccess && !promoError && (
          <p className="text-xs text-emerald-700 font-medium bg-emerald-100/60 border border-emerald-200 rounded-lg p-2 animate-in fade-in">
            ✓ {promoSuccess}
          </p>
        )}
      </div>

      {/* Pricing and seats breakdown */}
      {selectedSeats.length > 0 && (
        <div className="rounded-xl bg-slate-50/90 p-3 border border-slate-200/80 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex justify-between text-slate-600">
            <span>Selected Seats ({selectedSeats.length}):</span>
            <span className="font-semibold text-emerald-800">{selectedSeats.join(", ")}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Price per seat:</span>
            <span>{formatBDT(finalPrice)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Seats Subtotal:</span>
            <span>{formatBDT(rawTotalPrice)}</span>
          </div>
          {promoDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50/80 px-2 py-1 rounded border border-emerald-200/50">
              <span>Promo Discount ({appliedPromo?.code}):</span>
              <span>-{formatBDT(promoDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-900 font-semibold border-t border-slate-200 pt-1">
            <span>Total Tour Cost:</span>
            <span className={promoDiscount > 0 ? "text-emerald-800" : ""}>{formatBDT(totalFinalPrice)}</span>
          </div>
        </div>
      )}

      {/* Payment plan selection */}
      {tour.allowPartialPayment !== false && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-ink-soft font-medium">Payment Option</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-all ${
                paymentPlan === "partial"
                  ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                  : "border-white/60 bg-white/80"
              }`}
            >
              <input
                type="radio"
                name="paymentPlan"
                checked={paymentPlan === "partial"}
                onChange={() => setPaymentPlan("partial")}
              />
              <div>
                <div className="font-semibold text-ink">Pay {formatBDT(totalAdvanceAmount)}</div>
                <div className="text-[11px] text-ink-soft">Advance confirmation now</div>
              </div>
            </label>
            <label
              className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-all ${
                paymentPlan === "full"
                  ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                  : "border-white/60 bg-white/80"
              }`}
            >
              <input
                type="radio"
                name="paymentPlan"
                checked={paymentPlan === "full"}
                onChange={() => setPaymentPlan("full")}
              />
              <div>
                <div className="font-semibold text-ink">Pay {formatBDT(totalFinalPrice)}</div>
                <div className="text-[11px] text-ink-soft">Full payment in one step</div>
              </div>
            </label>
          </div>
          {dueOnTourDay > 0 && selectedSeats.length > 0 && (
            <span className="text-xs text-ink-faint">
              Remaining {formatBDT(dueOnTourDay)} due on tour day via online self-pay link or cash to host.
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {/* Payment Method Selector (Online vs Cash on Hand) */}
      <div className="flex flex-col gap-2 text-sm pt-1">
        <span className="text-ink-soft font-medium flex items-center justify-between">
          <span>Payment Method (পেমেন্ট মাধ্যম)</span>
          <span className="text-[11px] text-emerald-800 font-semibold">Choose How to Pay</span>
        </span>
        <div className="grid gap-2 sm:grid-cols-3">
          <label
            className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
              paymentMethod === "Bkash payment"
                ? "border-pink-600 bg-pink-50/80 shadow-xs ring-1 ring-pink-600"
                : "border-white/60 bg-white/80 hover:bg-white"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              className="mt-0.5 accent-pink-600"
              checked={paymentMethod === "Bkash payment"}
              onChange={() => setPaymentMethod("Bkash payment")}
            />
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1">
                <span> bKash</span>
                <span className="text-[10px] bg-pink-100 text-pink-800 px-1 py-0.2 rounded font-bold">বিকাশ</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                bKash Payment Gateway
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
              paymentMethod === "Rocket payment"
                ? "border-[#8C1D7D] bg-purple-50/80 shadow-xs ring-1 ring-[#8C1D7D]"
                : "border-white/60 bg-white/80 hover:bg-white"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              className="mt-0.5 accent-[#8C1D7D]"
              checked={paymentMethod === "Rocket payment"}
              onChange={() => setPaymentMethod("Rocket payment")}
            />
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1">
                <span> Rocket</span>
                <span className="text-[10px] bg-purple-100 text-purple-900 px-1 py-0.2 rounded font-bold">রকেট</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                DBBL Rocket Gateway
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
              paymentMethod === "cash_on_hand"
                ? "border-amber-600 bg-amber-50/80 shadow-xs ring-1 ring-amber-600"
                : "border-white/60 bg-white/80 hover:bg-white"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              className="mt-0.5 accent-amber-700"
              checked={paymentMethod === "cash_on_hand"}
              onChange={() => setPaymentMethod("cash_on_hand")}
            />
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-1">
                <span> Hand Cash</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">হাতে নগদ</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Counter cash (10m approval)
              </div>
            </div>
          </label>
        </div>

        
      </div>

      {/* Payment Gateway Trust Banner */}
      {paymentMethod === "Rocket payment" ? (
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-purple-950">
            <span>🔒 Dutch-Bangla Bank Rocket Merchant Payment</span>
          </div>
          <p className="text-[11px] text-purple-800">
            মার্চেন্ট: <strong>SHIMUL HASAN PRINCE</strong> · রকেট একাউন্ট: <strong className="font-mono text-purple-950 font-bold">016205930072</strong>
          </p>
          <div className="mt-1 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-lg bg-white/90 border border-purple-300 px-2.5 py-1 text-[11px] text-purple-900 font-medium">
            <span>TID: <strong className="font-mono text-purple-950 font-bold">60084230</strong></span>
            <span className="text-slate-400">·</span>
            <span>মার্চেন্ট ID: <strong className="font-mono text-purple-950 font-bold">999016205930072</strong></span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-700 font-semibold">রকেট মার্চেন্ট পেমেন্ট ও TrxID কনফার্মেশন</span>
          </div>
        </div>
      ) : paymentMethod === "Bkash payment" ? (
        <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-3 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-pink-950">
            <span>🔒 100% Secure Checkout via bKash Payment Gateway</span>
          </div>
          <p className="text-[11px] text-pink-800">
            Fast, secure, and encrypted payment directly through your bKash wallet
          </p>
          <div className="mt-1 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-lg bg-white/90 border border-pink-300 px-2.5 py-1 text-[11px] text-pink-900 font-medium">
            <span>🧪 Sandbox Test Number:</span>
            <strong className="font-mono text-pink-950 font-bold">01770618575</strong>
            <span className="text-slate-400">·</span>
            <span>OTP: <strong className="font-mono text-pink-950 font-bold">123456</strong></span>
            <span className="text-slate-400">·</span>
            <span>PIN: <strong className="font-mono text-pink-950 font-bold">12121</strong></span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-950">
            <span>🏢 Savar Office Counter / Tour Host Cash Verification</span>
          </div>
          <p className="mt-0.5 text-[11px] text-amber-800">
            Hand over cash at counter · Admin will verify and activate ticket within 10 minutes
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={step === "submitting" || step === "redirecting"}
        className={`w-full rounded-xl px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60 shadow-xs cursor-pointer ${
          paymentMethod === "cash_on_hand"
            ? "bg-amber-800 hover:bg-amber-900"
            : paymentMethod === "Rocket payment"
            ? "bg-[#8C1D7D] hover:bg-[#741267]"
            : "bg-[#D12053] hover:bg-[#b01742]"
        }`}
      >
        {step === "submitting"
          ? "Creating your booking…"
          : step === "redirecting"
            ? (paymentMethod === "Rocket payment" ? "Connecting to Rocket Gateway…" : "Connecting to bKash…")
            : selectedSeats.length === 0
              ? "Select seats to continue"
              : paymentMethod === "cash_on_hand"
                ? `Reserve & Pay Cash by Hand — ${formatBDT(paymentPlan === "full" ? totalFinalPrice : totalAdvanceAmount)}`
                : paymentMethod === "Rocket payment"
                  ? `Pay with Rocket — ${formatBDT(paymentPlan === "full" ? totalFinalPrice : totalAdvanceAmount)}`
                  : `Pay with bKash — ${formatBDT(paymentPlan === "full" ? totalFinalPrice : totalAdvanceAmount)}`}
      </button>
    </form>
  );
}
