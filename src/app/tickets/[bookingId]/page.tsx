"use client";

import { getAuthHeaders } from "@/lib/clientAuth";
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import type { DbBooking } from "@/server/types";
import { TICKET_COMPANY_INFO, isTicketVisible, getTicketVisibilityStatus } from "@/lib/ticketUtils";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";

function formatBDT(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  return "৳" + Math.round(num).toLocaleString("en-BD");
}

function formatDate(dateStr?: string, isBn?: boolean): string {
  if (!dateStr) return isBn ? "তারিখ নির্ধারিত হয়নি" : "Date unassigned";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function StandaloneTicketPage() {
  const params = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "true";
  const { isBn } = useLanguage();

  const [booking, setBooking] = useState<DbBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const printTriggeredRef = useRef(false);

  useEffect(() => {
    async function loadTicket() {
      setIsLoading(true);
      try {
        const linkToken = searchParams.get("token");
        const res = await fetch(
          `/api/v1/tickets/${params.bookingId}${linkToken ? `?token=${encodeURIComponent(linkToken)}` : ""}`,
          { headers: getAuthHeaders(), credentials: "same-origin" }
        );
        if (!res.ok) {
          throw new Error("Could not find ticket for this booking reference.");
        }
        const data = await res.json();
        setBooking(data.booking);

        const origin = typeof window !== "undefined" ? window.location.origin : "https://savartourlover.com";
        // Embed the signed clearance token so scanning the QR on the customer's own phone can pay the balance.
        const clearanceLink = `${origin}/clearance/${data.booking.id}${
          data.clearance_token ? `?token=${encodeURIComponent(data.clearance_token)}` : ""
        }`;
        const qr = await QRCode.toDataURL(clearanceLink, {
          width: 240,
          margin: 1,
          color: { dark: "#064e3b", light: "#ffffff" },
        });
        setQrCodeUrl(qr);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load ticket.");
      } finally {
        setIsLoading(false);
      }
    }
    loadTicket();
  }, [params.bookingId, searchParams]);

  useEffect(() => {
    if (shouldAutoPrint && booking && qrCodeUrl && !printTriggeredRef.current) {
      printTriggeredRef.current = true;
      setTimeout(() => {
        window.print();
      }, 600);
    }
  }, [shouldAutoPrint, booking, qrCodeUrl]);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 800);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-deep border-t-transparent" />
        <p className="text-sm font-medium text-slate-600">
          {isBn ? "টিকিট তৈরি হচ্ছে…" : "Generating E-Ticket…"}
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            ✕
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            {isBn ? "টিকিট পাওয়া যায়নি" : "Ticket Not Found"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || (isBn ? "এই বুকিংয়ের কোনো টিকিট পাওয়া যায়নি।" : "No ticket found for this booking reference.")}
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-deep px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
          >
            ← {isBn ? "প্রোফাইলে ফিরে যান" : "Back to Profile"}
          </Link>
        </div>
      </div>
    );
  }

  const isVisible = isTicketVisible(booking.departure_date);
  const visibilityStatus = getTicketVisibilityStatus(booking.departure_date, isBn);

  if (!isVisible) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-md border border-amber-200 text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Icon name="clock" className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            {isBn ? "টিকিটের ডাউনলোডের মেয়াদ শেষ হয়েছে" : "Ticket Download Window Expired"}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {isBn
              ? "যাত্রার পরের দিন পর্যন্ত টিকিট ডাউনলোড সক্রিয় থাকে। আপনার এই ট্যুরটি সফলভাবে সম্পন্ন হয়েছে।"
              : "Ticket downloads remain active through the day after departure. This journey has concluded."}
          </p>
          <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-700 font-medium">
            <p>Tour: <strong>{booking.tour_title}</strong></p>
            <p className="mt-0.5">Departure: {formatDate(booking.departure_date, isBn)}</p>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href="/profile"
              className="w-full sm:w-auto rounded-xl bg-emerald-deep px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110"
            >
              {isBn ? "প্রোফাইলে ফিরে যান" : "Go to My Profile"}
            </Link>
            <Link
              href="/tours"
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isBn ? "নতুন ট্যুর বুক করুন" : "Explore New Tours"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const total = parseFloat(booking.total_price) || 0;
  const paid = parseFloat(booking.amount_paid) || 0;
  const due = parseFloat(booking.amount_due) || 0;
  const seats = booking.selected_seats || [];
  const ticketNo = `STL-TKT-${booking.reference || booking.id.slice(-6).toUpperCase()}`;

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Top bar with back link and print button (hidden on print) */}
        <div className="flex items-center justify-between no-print bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-deep transition"
          >
            ← {isBn ? "প্রোফাইলে ফিরে যান" : "Back to Profile"}
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-slate-500 font-medium">
              {visibilityStatus.message}
            </span>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-deep hover:brightness-110 px-4 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-95"
            >
              <Icon name="receipt" className="h-4 w-4" />
              <span>{isPrinting ? (isBn ? "প্রস্তুত হচ্ছে…" : "Printing…") : isBn ? "🖨️ প্রিন্ট / PDF সংরক্ষণ" : "🖨️ Print / Save as PDF"}</span>
            </button>
          </div>
        </div>

        {/* Printable Ticket */}
        <div className="relative rounded-2xl bg-white border-2 border-emerald-900/40 shadow-lg overflow-hidden print:border-2 print:shadow-none">
          {/* Centered Logo Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.06] select-none">
            <img
              src={TICKET_COMPANY_INFO.logoBadgeUrl}
              alt="Watermark"
              className="w-72 sm:w-96 h-auto grayscale"
            />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-5 sm:p-6 text-white border-b-4 border-amber-500 print:bg-emerald-950">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-xl bg-white p-1.5 shadow-sm shrink-0 flex items-center justify-center">
                    <img
                      src={TICKET_COMPANY_INFO.logoBadgeUrl}
                      alt="Savar Tour Lover"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                      {TICKET_COMPANY_INFO.name}{" "}
                      <span className="text-emerald-300 text-sm sm:text-base font-normal">
                        ({TICKET_COMPANY_INFO.nameBn})
                      </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-emerald-200 font-medium">
                      {TICKET_COMPANY_INFO.tagline}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                  <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                    ✓ {isBn ? "অফিসিয়াল ই-টিকিট" : "Official E-Ticket Pass"}
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-amber-300">
                    {ticketNo}
                  </p>
                </div>
              </div>
            </div>

            {/* Tour & Passenger Information */}
            <div className="grid sm:grid-cols-2 gap-4 p-5 sm:p-6 bg-slate-50/70 border-b border-dashed border-slate-300">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isBn ? "ট্যুর বিবরণ" : "Tour Itinerary"}
                </span>
                <h2 className="font-display text-lg font-bold text-emerald-950">
                  {booking.tour_title}
                </h2>
                <div className="text-xs text-slate-700 space-y-1 pt-1">
                  <p>
                    📅 <strong>{isBn ? "যাত্রার তারিখ: " : "Departure Date: "}</strong>
                    <span className="font-semibold text-slate-900">
                      {formatDate(booking.departure_date, isBn)}
                    </span>
                  </p>
                  <p>
                    📍 <strong>{isBn ? "পিক-আপ পয়েন্ট: " : "Pick-up Point: "}</strong>
                    <span className="font-semibold text-slate-900">
                      {booking.pickup_point || "Savar Main Counter"}
                    </span>
                  </p>
                  <p>
                    ⏱️ <strong>{isBn ? "রিপোর্টিং: " : "Reporting: "}</strong>
                    <span>{isBn ? "যাত্রার ৩০ মিনিট আগে" : "30 mins before departure"}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 border-t sm:border-t-0 border-slate-200 pt-3 sm:pt-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isBn ? "যাত্রীর বিবরণ" : "Lead Passenger"}
                </span>
                <h3 className="font-semibold text-base text-slate-900">
                  {booking.customer_full_name || "Traveler"}
                </h3>
                <div className="text-xs text-slate-700 space-y-1 pt-1">
                  <p>
                    📞 <strong>{isBn ? "মোবাইল: " : "Phone: "}</strong>
                    <span className="font-mono">{booking.customer_phone_number || "N/A"}</span>
                  </p>
                  <p>
                    👥 <strong>{isBn ? "মোট যাত্রী: " : "Total Travelers: "}</strong>
                    <span className="font-semibold">{booking.traveler_count} {isBn ? "জন" : "Person(s)"}</span>
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <strong className="text-xs text-slate-900">{isBn ? "বরাদ্দকৃত আসন: " : "Assigned Seats: "}</strong>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-900 px-2.5 py-0.5 text-xs font-bold text-white">
                      💺 {seats.length > 0 ? seats.join(", ") : "Assigned"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passenger Manifest */}
            {booking.travelers && booking.travelers.length > 1 && (
              <div className="px-5 sm:px-6 py-3 bg-white border-b border-dashed border-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  {isBn ? "সহযাত্রীদের তালিকা" : "Passenger Manifest"}:
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {booking.travelers.map((t, idx) => (
                    <span
                      key={t.id || idx}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800"
                    >
                      <span className="text-slate-400 font-mono">{idx + 1}.</span>
                      <strong className="text-slate-900">{t.full_name}</strong>
                      {t.seat_number && (
                        <span className="ml-1 rounded bg-emerald-100 text-emerald-800 px-1 text-[11px] font-semibold">
                          {t.seat_number}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 p-5 sm:p-6 bg-emerald-50/50 border-b border-dashed border-slate-300">
              <div className="rounded-xl border border-emerald-100 bg-white/90 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  {isBn ? "মোট প্যাকেজ মূল্য" : "Total Price"}
                </span>
                <p className="mt-0.5 text-sm sm:text-base font-bold text-slate-900">
                  {formatBDT(total)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white/90 p-2.5">
                <span className="text-[10px] font-bold uppercase text-emerald-700">
                  {isBn ? "পরিশোধিত" : "Amount Paid"}
                </span>
                <p className="mt-0.5 text-sm sm:text-base font-bold text-emerald-700">
                  {formatBDT(paid)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white/90 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  {due > 0 ? (isBn ? "ট্যুর দিনে প্রদেয়" : "Due Balance") : (isBn ? "বকেয়া" : "Due Balance")}
                </span>
                <p className={`mt-0.5 text-sm sm:text-base font-bold ${due > 0 ? "text-amber-700" : "text-blue-700"}`}>
                  {due > 0 ? formatBDT(due) : (isBn ? "৳০ (পরিশোধিত)" : "৳0 (Cleared)")}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white/90 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  {isBn ? "স্ট্যাটাস" : "Ticket Status"}
                </span>
                <p className={`mt-0.5 text-xs font-extrabold uppercase ${due > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {due > 0
                    ? isBn ? "অগ্রিম নিশ্চিত" : "ADVANCE CONFIRMED"
                    : isBn ? "সম্পূর্ণ নিশ্চিত" : "CONFIRMED & FULLY PAID"}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white/90 p-2.5 col-span-2 sm:col-span-1 space-y-1">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">
                    {isBn ? "অগ্রিম মাধ্যম" : "Advance System"}
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-slate-900 truncate">
                    {booking.advance_payment_method === "cash_on_hand" || booking.payment_method === "cash_on_hand"
                      ? (isBn ? "💵 হাতে নগদ" : "💵 Cash on Hand")
                      : (isBn ? "💳 অনলাইন" : "💳 SSLCommerz")}
                  </p>
                  {booking.cash_approved_by && (
                    <span className="text-[9px] text-emerald-800 font-semibold block mt-0.5">
                      ✓ {isBn ? `অনুমোদিত: ${booking.cash_approved_by}` : `Verified: ${booking.cash_approved_by}`}
                    </span>
                  )}
                </div>

                {due > 0 ? (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-[9px] font-bold uppercase text-amber-700 block">
                      {isBn ? "বকেয়া মাধ্যম" : "Due System"}
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-amber-900 truncate">
                      {booking.due_payment_method === "cash_on_hand"
                        ? (isBn ? "💵 ট্যুর দিনে নগদ" : "💵 Cash on Tour Day")
                        : (isBn ? "💳 অনলাইন / নগদ" : "💳 SSL / Cash")}
                    </p>
                  </div>
                ) : booking.due_payment_method ? (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-[9px] font-bold uppercase text-emerald-700 block">
                      {isBn ? "বকেয়া পরিশোধ" : "Due Cleared"}
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-emerald-800 truncate">
                      {booking.due_payment_method === "cash_on_hand"
                        ? (isBn ? "💵 হাতে নগদ (পরিশোধিত)" : "💵 Hand Cash (Cleared)")
                        : (isBn ? "💳 অনলাইন (পরিশোধিত)" : "💳 Online (Cleared)")}
                    </p>
                    {booking.due_cash_approved_by && (
                      <span className="text-[9px] text-emerald-800 font-medium block">
                        ✓ {booking.due_cash_approved_by}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 bg-white border-b border-slate-200">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-950">
                  <span>🛡️ {isBn ? "ডিজিটাল বোর্ডিং পাস ও ভেরিফিকেশন কোড" : "Digital Boarding Pass & Verification"}</span>
                </div>
                <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                  {isBn
                    ? "যাত্রা শুরুর সময় আপনার ট্যুর হোস্টকে এই টিকিটের কিউআর কোডটি প্রদর্শন করুন। ক্যামেরা দিয়ে স্ক্যান করলেই বোর্ডিং নিশ্চিত হয়ে যাবে।"
                    : "Show this digital pass or printed voucher upon boarding. The tour conductor will scan this QR code to instantly verify your seat reservation."}
                </p>
                <p className="text-[11px] font-mono text-slate-500 pt-1">
                  Ref: <strong>{booking.reference}</strong> | Gate Clearance: <strong>PASS-OK</strong>
                </p>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div className="rounded-xl border-2 border-emerald-900/20 p-1.5 bg-white shadow-xs">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="h-24 w-24 object-contain" />
                  ) : (
                    <div className="h-24 w-24 flex items-center justify-center text-xs text-slate-400">
                      Loading QR…
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[10px] font-bold text-emerald-900 tracking-wider">
                  SCAN TO VERIFY
                </span>
              </div>
            </div>

            {/* Guidelines */}
            <div className="p-4 sm:p-5 bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
              <p className="font-bold text-slate-900 mb-1.5">
                📌 {isBn ? "গুরুত্বপূর্ণ নির্দেশনাবলী:" : "Important Traveler Instructions:"}
              </p>
              <ul className="space-y-1 pl-4 list-disc marker:text-emerald-700 leading-relaxed text-[11px]">
                <li>
                  {isBn
                    ? "যাত্রার নির্ধারিত সময়ের অন্তত ৩০ মিনিট পূর্বে নির্বাচিত পিক-আপ পয়েন্টে উপস্থিত থাকুন।"
                    : "Arrive at your departure meeting point at least 30 minutes prior to departure."}
                </li>
                <li>
                  {isBn
                    ? "জাতীয় পরিচয়পত্র (NID), পাসপোর্ট অথবা স্টুডেন্ট আইডি কার্ড সাথে রাখা আবশ্যক।"
                    : "All travelers must carry a valid National ID (NID), Passport, or Student ID card."}
                </li>
                <li>
                  {isBn
                    ? "কোনো বকেয়া টাকা থাকলে যাত্রার পূর্বে SSLCommerz অথবা যাত্রার দিন সকালে ট্যুর হোস্টের নিকট হাতে নগদে পরিশোধ করুন।"
                    : "Any outstanding balance may be cleared online via SSLCommerz or paid in Hand Cash directly to your tour host on departure morning."}
                </li>
                <li>
                  {isBn
                    ? `যেকোনো জরুরি প্রয়োজনে আমাদের ২৪/৭ হেল্পলাইনে কল করুন: ${TICKET_COMPANY_INFO.phones[0]}`
                    : `For emergency tour assistance, call our 24/7 hotline: ${TICKET_COMPANY_INFO.phones[0]}`}
                </li>
              </ul>
            </div>

            {/* Footer */}
            <div className="bg-slate-950 p-5 sm:p-6 text-slate-300 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
                <div>
                  <h4 className="font-display text-sm font-bold text-white">
                    {TICKET_COMPANY_INFO.name} ({TICKET_COMPANY_INFO.nameBn})
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    📍 {isBn ? TICKET_COMPANY_INFO.addressBn : TICKET_COMPANY_INFO.addressEn}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    📞 {TICKET_COMPANY_INFO.phones.join(" • ")}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    🌐 <span className="text-white underline">{TICKET_COMPANY_INFO.website}</span> | ✉️ {TICKET_COMPANY_INFO.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
                <p>© {new Date().getFullYear()} Savar Tour Lover. All rights reserved.</p>
                <p>System Generated Official Travel E-Voucher & Boarding Document</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
