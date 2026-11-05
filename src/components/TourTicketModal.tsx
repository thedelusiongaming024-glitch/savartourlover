"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import type { DbBooking } from "@/server/types";
import { TICKET_COMPANY_INFO } from "@/lib/ticketUtils";
import { Icon } from "@/components/Icon";

interface TourTicketModalProps {
  booking: DbBooking | null;
  isOpen: boolean;
  onClose: () => void;
  isBn?: boolean;
}

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

export function TourTicketModal({ booking, isOpen, onClose, isBn = false }: TourTicketModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const printTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clean up any pending print timeouts when the modal unmounts
  useEffect(() => {
    return () => {
      for (const id of printTimeoutsRef.current) clearTimeout(id);
      printTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!booking) return;

    const origin = typeof window !== "undefined" ? window.location.origin : "https://savartourlover.com";
    const clearanceUrl = `${origin}/clearance/${booking.id}`;

    QRCode.toDataURL(clearanceUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#064e3b", // Deep emerald
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [booking]);

  if (!isOpen || !booking) return null;

  const total = parseFloat(booking.total_price) || 0;
  const paid = parseFloat(booking.amount_paid) || 0;
  const due = parseFloat(booking.amount_due) || 0;
  const seats = booking.selected_seats || [];
  const ticketNo = `STL-TKT-${booking.reference || booking.id.slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    setIsPrinting(true);
    const content = ticketRef.current;
    if (!content) {
      setIsPrinting(false);
      return;
    }

    // Use hidden iframe method for clean print without dialog messing up main page
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      setIsPrinting(false);
      return;
    }

    const printStyles = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:wght@600;700;800&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #ffffff !important;
          color: #0f172a;
          margin: 0;
          padding: 0;
        }

        .ticket-wrapper {
          position: relative;
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #064e3b;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: none !important;
        }

        .watermark-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 1;
          opacity: 0.06;
        }

        .watermark-overlay img {
          width: 440px;
          height: auto;
          filter: grayscale(100%);
        }

        .ticket-content {
          position: relative;
          z-index: 2;
        }

        .header-section {
          background: linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%) !important;
          color: #ffffff !important;
          padding: 20px 26px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #d97706;
        }

        .header-logo {
          height: 52px;
          width: auto;
          background: #ffffff;
          padding: 4px 8px;
          border-radius: 8px;
        }

        .badge-verified {
          background: #ecfdf5 !important;
          color: #065f46 !important;
          border: 1px solid #a7f3d0 !important;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          padding: 20px 26px;
          background: #f8fafc;
          border-bottom: 1px dashed #cbd5e1;
        }

        .seat-badge {
          background: #064e3b !important;
          color: #ffffff !important;
          padding: 4px 12px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.5px;
        }

        .financial-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          padding: 16px 26px;
          background: #f0fdf4;
          border-bottom: 1px dashed #cbd5e1;
        }

        .qr-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 26px;
          border-bottom: 1px solid #e2e8f0;
        }

        .instructions-box {
          padding: 14px 26px;
          background: #fafafa;
          font-size: 11px;
          color: #475569;
          line-height: 1.5;
          border-bottom: 1px solid #e2e8f0;
        }

        .footer-branding {
          padding: 14px 26px;
          background: #0f172a;
          color: #e2e8f0;
          font-size: 11px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-branding a, .footer-branding span {
          color: #93c5fd;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      </style>
    `;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Savar Tour Lover E-Ticket - ${booking.reference || booking.id}</title>
          ${printStyles}
        </head>
        <body>
          <div class="ticket-wrapper">
            <!-- Center Watermark -->
            <div class="watermark-overlay">
              <img src="/images/logo-badge.png" alt="Watermark" />
            </div>

            <div class="ticket-content">
              <!-- Header -->
              <div class="header-section">
                <div>
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                    <img src="/images/logo-badge.png" alt="Savar Tour Lover" class="header-logo" />
                    <div>
                      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; font-family: 'Fraunces', serif;">
                        ${TICKET_COMPANY_INFO.name} (${TICKET_COMPANY_INFO.nameBn})
                      </h1>
                      <p style="margin: 2px 0 0; font-size: 11px; color: #a7f3d0; font-weight: 600;">
                        ${TICKET_COMPANY_INFO.tagline}
                      </p>
                    </div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="badge-verified">✓ Official E-Ticket Pass</div>
                  <p style="margin: 6px 0 0; font-family: monospace; font-size: 12px; font-weight: 700; color: #fef08a;">
                    ${ticketNo}
                  </p>
                </div>
              </div>

              <!-- Main Tour & Passenger Details -->
              <div class="info-grid">
                <div>
                  <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">
                    Tour Package
                  </div>
                  <div style="font-size: 16px; font-weight: 800; color: #064e3b; margin-top: 2px;">
                    ${booking.tour_title}
                  </div>
                  <div style="font-size: 12px; color: #334155; margin-top: 4px;">
                    <strong>Destination:</strong> ${booking.tour_title.replace(" Package Tour", "")}
                  </div>
                  <div style="font-size: 12px; color: #334155; margin-top: 2px;">
                    📅 <strong>Departure Date:</strong> ${formatDate(booking.departure_date, isBn)}
                  </div>
                  <div style="font-size: 12px; color: #334155; margin-top: 2px;">
                    📍 <strong>Pick-up Point:</strong> ${booking.pickup_point || "Savar Main Counter"}
                  </div>
                </div>

                <div>
                  <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">
                    Passenger Details
                  </div>
                  <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                    ${booking.customer_full_name || "Traveler"}
                  </div>
                  <div style="font-size: 12px; color: #334155; margin-top: 4px;">
                    📞 <strong>Mobile:</strong> ${booking.customer_phone_number || "N/A"}
                  </div>
                  <div style="font-size: 12px; color: #334155; margin-top: 2px;">
                    👥 <strong>Total Travelers:</strong> ${booking.traveler_count} Person(s)
                  </div>
                  <div style="font-size: 12px; color: #334155; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
                    <strong>Assigned Seats:</strong>
                    <span class="seat-badge">${seats.length > 0 ? seats.join(", ") : "Guaranteed Assigned"}</span>
                  </div>
                </div>
              </div>

              <!-- Multi-Passenger Manifest (if applicable) -->
              ${
                booking.travelers && booking.travelers.length > 1
                  ? `
                <div style="padding: 12px 26px; background: #ffffff; border-bottom: 1px dashed #cbd5e1; font-size: 11px;">
                  <strong style="color: #064e3b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Traveler Manifest:</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px;">
                    ${booking.travelers
                      .map(
                        (t, idx) => `
                      <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        ${idx + 1}. <strong>${t.full_name}</strong> (Seat: ${t.seat_number || "Open"})
                      </span>
                    `
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }

              <!-- Financial Breakdown Strip -->
              <div class="financial-strip">
                <div>
                  <div style="font-size: 10px; color: #475569; text-transform: uppercase; font-weight: 700;">Package Total</div>
                  <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formatBDT(total)}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #065f46; text-transform: uppercase; font-weight: 700;">Amount Paid</div>
                  <div style="font-size: 15px; font-weight: 800; color: #065f46; margin-top: 2px;">${formatBDT(paid)}</div>
                </div>
                <div>
                  <div style="font-size: 10px; color: ${due > 0 ? "#b45309" : "#0284c7"}; text-transform: uppercase; font-weight: 700;">
                    ${due > 0 ? "Due on Tour Day" : "Due Balance"}
                  </div>
                  <div style="font-size: 15px; font-weight: 800; color: ${due > 0 ? "#b45309" : "#0284c7"}; margin-top: 2px;">
                    ${due > 0 ? formatBDT(due) : "৳0 (Cleared)"}
                  </div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #475569; text-transform: uppercase; font-weight: 700;">Payment Status</div>
                  <div style="font-size: 13px; font-weight: 800; color: ${due > 0 ? "#b45309" : "#065f46"}; margin-top: 3px;">
                    ${due > 0 ? "ADVANCE CONFIRMED" : "CONFIRMED & FULLY PAID"}
                  </div>
                </div>
                <div>
                  <div style="font-size: 10px; color: #475569; text-transform: uppercase; font-weight: 700;">Payment System</div>
                  <div style="font-size: 11px; font-weight: 700; color: #064e3b; margin-top: 3px;">
                    <div>Adv: ${
                      booking.advance_payment_method === "cash_on_hand" || booking.payment_method === "cash_on_hand" || booking.payment_method === "cash"
                        ? "💵 CASH ON HAND"
                        : booking.advance_payment_method === "Rocket payment" || booking.payment_method === "Rocket payment"
                        ? "🚀 ROCKET PAYMENT"
                        : "📱 BKASH PAYMENT"
                    }</div>
                    ${
                      due > 0
                        ? `<div style="color: #b45309; margin-top: 2px;">Due: ${booking.due_payment_method === "cash_on_hand" ? "💵 CASH ON TOUR DAY" : "⏳ PENDING"}</div>`
                        : booking.due_payment_method
                        ? `<div style="color: #065f46; margin-top: 2px;">Due: ${booking.due_payment_method === "cash_on_hand" ? "💵 CASH (CLEARED)" : booking.due_payment_method === "Rocket payment" ? "🚀 ROCKET (CLEARED)" : "📱 BKASH (CLEARED)"}</div>`
                        : ""
                    }
                  </div>
                </div>
              </div>

              <!-- Security QR Code & Conductor Clearance -->
              <div class="qr-section">
                <div style="max-width: 520px;">
                  <div style="font-size: 13px; font-weight: 800; color: #064e3b; display: flex; align-items: center; gap: 6px;">
                    <span>🛡️ Verified Digital Boarding Pass & Clearance Voucher</span>
                  </div>
                  <p style="margin: 4px 0 0; font-size: 11px; color: #475569; line-height: 1.4;">
                    Present this digital ticket on your phone or show this printed copy to your tour host upon boarding.
                    The host scans this security QR code with their phone to instantly confirm your seat allocation and passenger clearance.
                  </p>
                  <p style="margin: 6px 0 0; font-size: 10px; color: #64748b; font-family: monospace;">
                    Reference: <strong>${booking.reference}</strong> | Booking ID: <strong>${booking.id}</strong>
                  </p>
                </div>
                <div style="text-align: center; margin-left: 20px;">
                  ${
                    qrCodeUrl
                      ? `<img src="${qrCodeUrl}" alt="Security QR Code" style="width: 100px; height: 100px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 2px;" />`
                      : `<div style="width: 100px; height: 100px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 9px;">Scan Pass</div>`
                  }
                  <div style="font-size: 9px; font-weight: 700; color: #065f46; margin-top: 2px;">SCAN TO VERIFY</div>
                </div>
              </div>

              <!-- Important Guidelines Box -->
              <div class="instructions-box">
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">Important Traveler Guidelines:</div>
                <ul style="margin: 0; padding-left: 18px; space-y: 2px;">
                  <li><strong>Reporting Time:</strong> Please arrive at your selected boarding location at least 30 minutes before departure.</li>
                  <li><strong>Identity Document:</strong> Adult travelers must carry a valid National ID (NID), Passport, or Student ID card.</li>
                  <li><strong>Luggage:</strong> Standard travel backpack or suitcase (1 personal luggage item per seat).</li>
                  <li><strong>Balance Payment:</strong> If any balance remains due, it must be settled before tour departure via bKash payment or cash to host.</li>
                  <li><strong>Emergency Hotline:</strong> 24/7 dedicated traveler concierge is reachable at <strong>${TICKET_COMPANY_INFO.phones[0]}</strong>.</li>
                </ul>
              </div>

              <!-- Official Agency Footer & Contact Details -->
              <div class="footer-branding">
                <div>
                  <div style="font-weight: 700; font-size: 12px; color: #ffffff;">${TICKET_COMPANY_INFO.name}</div>
                  <div style="margin-top: 2px; color: #cbd5e1;">📍 ${TICKET_COMPANY_INFO.addressEn}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600;">📞 ${TICKET_COMPANY_INFO.phones.join(" • ")}</div>
                  <div style="margin-top: 2px;">🌐 <span>${TICKET_COMPANY_INFO.website}</span> | ✉️ <span>${TICKET_COMPANY_INFO.email}</span></div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    printTimeoutsRef.current.push(setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setIsPrinting(false);
      printTimeoutsRef.current.push(setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 1000));
    }, 500));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-white/60 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Modal Controls */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 p-1 flex items-center justify-center text-emerald-400">
              <Icon name="ticket" className="h-4 w-4" />
            </div>
            <span className="font-display font-semibold text-sm sm:text-base">
              {isBn ? "ডিজিটাল ভ্রমণ টিকিট ও বোর্ডিং পাস" : "Official E-Ticket & Boarding Pass"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Icon name="receipt" className="h-3.5 w-3.5" />
              <span>{isPrinting ? (isBn ? "প্রস্তুত হচ্ছে…" : "Printing…") : isBn ? "🖨️ প্রিন্ট / PDF ডাউনলোড" : "🖨️ Print / Save as PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-slate-300 hover:text-white transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Ticket Container */}
        <div className="max-h-[82vh] overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div
            ref={ticketRef}
            className="relative mx-auto rounded-2xl bg-white border-2 border-emerald-900/40 shadow-md overflow-hidden"
          >
            {/* Elegant Background Logo Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.06] select-none">
              <img
                src={TICKET_COMPANY_INFO.logoBadgeUrl}
                alt="Watermark"
                className="w-72 sm:w-96 h-auto grayscale"
              />
            </div>

            <div className="relative z-10">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-4 sm:p-6 text-white border-b-4 border-amber-500">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white p-1.5 shadow-sm shrink-0 flex items-center justify-center">
                      <img
                        src={TICKET_COMPANY_INFO.logoBadgeUrl}
                        alt="Savar Tour Lover"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight">
                        {TICKET_COMPANY_INFO.name}{" "}
                        <span className="text-emerald-300 text-sm sm:text-base font-normal">
                          ({TICKET_COMPANY_INFO.nameBn})
                        </span>
                      </h2>
                      <p className="text-xs sm:text-sm text-emerald-200 font-medium">
                        {TICKET_COMPANY_INFO.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                    <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                      ✓ {isBn ? "যাচাইকৃত অফিসিয়াল ই-টিকিট" : "Verified E-Ticket"}
                    </span>
                    <p className="mt-1 font-mono text-xs sm:text-sm font-bold text-amber-300">
                      {ticketNo}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Booking & Passenger Info */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 sm:p-6 bg-slate-50/70 border-b border-dashed border-slate-300">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {isBn ? "ট্যুর প্যাকেজ" : "Tour Package Details"}
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-emerald-950">
                    {booking.tour_title}
                  </h3>
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
                      ⏱️ <strong>{isBn ? "রিপোর্টিং সময়: " : "Reporting Time: "}</strong>
                      <span>{isBn ? "যাত্রার ৩০ মিনিট পূর্বে" : "30 mins before departure"}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 border-t sm:border-t-0 border-slate-200 pt-3 sm:pt-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {isBn ? "যাত্রীর বিবরণ" : "Lead Passenger"}
                  </span>
                  <h4 className="font-semibold text-base text-slate-900">
                    {booking.customer_full_name || "Traveler"}
                  </h4>
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
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-900 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                        💺 {seats.length > 0 ? seats.join(", ") : "Assigned"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-traveler list if present */}
              {booking.travelers && booking.travelers.length > 1 && (
                <div className="px-4 sm:px-6 py-3 bg-white border-b border-dashed border-slate-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {isBn ? "সকল সহযাত্রীদের তালিকা" : "Passenger Manifest"}:
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

              {/* Financial Breakdown Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 p-4 sm:p-6 bg-emerald-50/50 border-b border-dashed border-slate-300">
                <div className="rounded-xl border border-emerald-100 bg-white/80 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {isBn ? "মোট প্যাকেজ মূল্য" : "Total Price"}
                  </span>
                  <p className="mt-0.5 text-sm sm:text-base font-bold text-slate-900">
                    {formatBDT(total)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white/80 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">
                    {isBn ? "পরিশোধিত" : "Amount Paid"}
                  </span>
                  <p className="mt-0.5 text-sm sm:text-base font-bold text-emerald-700">
                    {formatBDT(paid)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white/80 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {due > 0 ? (isBn ? "ট্যুর দিনে প্রদেয়" : "Due Balance") : (isBn ? "বকেয়া" : "Due Balance")}
                  </span>
                  <p className={`mt-0.5 text-sm sm:text-base font-bold ${due > 0 ? "text-amber-700" : "text-blue-700"}`}>
                    {due > 0 ? formatBDT(due) : (isBn ? "৳০ (পরিশোধিত)" : "৳0 (Cleared)")}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white/80 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    {isBn ? "স্ট্যাটাস" : "Ticket Status"}
                  </span>
                  <p className={`mt-0.5 text-xs font-extrabold uppercase ${due > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {due > 0
                      ? isBn ? "অগ্রিম নিশ্চিত" : "ADVANCE PAID"
                      : isBn ? "সম্পূর্ণ নিশ্চিত" : "FULLY CONFIRMED"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-white/80 p-2.5 col-span-2 sm:col-span-1 space-y-1">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-500 block">
                      {isBn ? "অগ্রিম মাধ্যম" : "Advance System"}
                    </span>
                    <p className="mt-0.5 text-xs font-bold text-slate-900 truncate">
                      {booking.advance_payment_method === "cash_on_hand" || booking.payment_method === "cash_on_hand" || booking.payment_method === "cash"
                        ? (isBn ? "💵 হাতে নগদ" : "💵 Cash on Hand")
                        : booking.advance_payment_method === "Rocket payment" || booking.payment_method === "Rocket payment"
                        ? (isBn ? "🚀 রকেট পেমেন্ট" : "🚀 Rocket payment")
                        : (isBn ? "📱 বিকাশ পেমেন্ট" : "📱 Bkash payment")}
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
                          : booking.due_payment_method === "Rocket payment"
                          ? (isBn ? "🚀 রকেট" : "🚀 Rocket")
                          : (isBn ? "📱 বিকাশ / নগদ" : "📱 bKash / Cash")}
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
                          : booking.due_payment_method === "Rocket payment"
                          ? (isBn ? "🚀 রকেট (পরিশোধিত)" : "🚀 Rocket (Cleared)")
                          : (isBn ? "📱 বিকাশ (পরিশোধিত)" : "📱 Bkash (Cleared)")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Security QR Code & Conductor Clearance */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-6 bg-white border-b border-slate-200">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-950">
                    <span>🛡️ {isBn ? "সুরক্ষিত ডিজিটাল বোর্ডিং পাস ও ভেরিফিকেশন কোড" : "Digital Boarding Pass & Verification"}</span>
                  </div>
                  <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                    {isBn
                      ? "যাত্রা শুরুর সময় আপনার ট্যুর হোস্টকে এই টিকিটের কিউআর কোডটি প্রদর্শন করুন। ক্যামেরা দিয়ে স্ক্যান করলেই তাৎক্ষণিক বোর্ডিং নিশ্চিত হয়ে যাবে।"
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

              {/* Important Passenger Guidelines */}
              <div className="p-4 sm:p-5 bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                <p className="font-bold text-slate-900 mb-1.5">
                  📌 {isBn ? "গুরুত্বপূর্ণ নির্দেশনাবলী:" : "Important Traveler Instructions:"}
                </p>
                <ul className="space-y-1 pl-4 list-disc marker:text-emerald-700 leading-relaxed text-[11px] sm:text-xs">
                  <li>
                    {isBn
                      ? "যাত্রার নির্ধারিত সময়ের অন্তত ৩০ মিনিট আগে নির্বাচিত পিক-আপ পয়েন্টে উপস্থিত থাকুন।"
                      : "Arrive at your departure meeting point at least 30 minutes prior to departure."}
                  </li>
                  <li>
                    {isBn
                      ? "জাতীয় পরিচয়পত্র (NID), পাসপোর্ট অথবা স্টুডেন্ট আইডি কার্ড সাথে রাখা আবশ্যক।"
                      : "All travelers must carry a valid National ID (NID), Passport, or Student ID card."}
                  </li>
                  <li>
                    {isBn
                      ? "কোনো বকেয়া টাকা থাকলে যাত্রার পূর্বে বিকাশ পেমেন্ট অথবা ট্যুর হোস্টের মাধ্যমে পরিশোধ করুন।"
                      : "Any outstanding balance must be cleared before or upon bus boarding."}
                  </li>
                  <li>
                    {isBn
                      ? `যেকোনো জরুরি প্রয়োজনে আমাদের ২৪/৭ হেল্পলাইনে কল করুন: ${TICKET_COMPANY_INFO.phones[0]}`
                      : `For emergency tour assistance, call our 24/7 hotline: ${TICKET_COMPANY_INFO.phones[0]}`}
                  </li>
                </ul>
              </div>

              {/* Footer: Official Agency Contact, Address & Website */}
              <div className="bg-slate-950 p-4 sm:p-6 text-slate-300 text-xs">
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

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between bg-white px-5 py-3.5 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            💡 {isBn ? "টিপ: প্রিন্ট অপশন থেকে 'Save as PDF' সিলেক্ট করে সরাসরি টিকিট সংরক্ষণ করতে পারেন।" : "Tip: Select 'Save as PDF' in the print preview dialog to save this ticket to your phone/PC."}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-deep hover:brightness-110 px-4 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Icon name="receipt" className="h-4 w-4" />
              <span>{isPrinting ? (isBn ? "প্রস্তুত হচ্ছে…" : "Printing…") : isBn ? "🖨️ প্রিন্ট / PDF সংরক্ষণ" : "🖨️ Print / Save as PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
