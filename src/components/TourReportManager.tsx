"use client";

import React, { useState, useMemo } from "react";
import type { DbBooking, DbTour, DbDestination, DbCustomerUser } from "@/server/types";
import type { CustomerWithDetails } from "@/app/staff/dashboard/page";

interface TourReportManagerProps {
  bookings: DbBooking[];
  tours: DbTour[];
  destinations: DbDestination[];
  customers?: CustomerWithDetails[] | DbCustomerUser[];
  currentUser?: { username: string; first_name?: string; last_name?: string; role?: string } | null;
}

function formatBDT(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return "৳" + Math.round(num || 0).toLocaleString("en-BD");
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "Open Date";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generatePrintableReportHtml(params: {
  bookings: DbBooking[];
  totals: {
    bookingsCount: number;
    activeBookingsCount: number;
    travelersCount: number;
    revenue: number;
    paid: number;
    due: number;
    occupiedSeats: string[];
  };
  tourTitle: string;
  destinationName: string;
  departureDateStr: string;
  statusScope: string;
  printedBy: string;
}): string {
  const { bookings, totals, tourTitle, destinationName, departureDateStr, statusScope, printedBy } = params;

  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rowsHtml = bookings
    .map((b, idx) => {
      const seatsList = b.selected_seats && b.selected_seats.length > 0 ? b.selected_seats.join(", ") : "—";
      const travNames =
        b.travelers && b.travelers.length > 0
          ? b.travelers.map((t) => t.full_name).join(", ")
          : `${b.customer_full_name} (${b.traveler_count} pers.)`;
      const pickup = b.pickup_point
        ? b.pickup_point.replace(/Seats:\s*([A-Za-z0-9,\s]+)/, "").trim() || "Default Point"
        : "Default Point";
      const statusLabel = b.status.replace(/_/g, " ").toUpperCase();

      const promoCode = b.promo_code || b.special_requests?.match(/\[Promo:\s*([A-Za-z0-9_\-]+)/)?.[1];
      const discountVal = b.discount_amount || b.special_requests?.match(/\[Promo:\s*[A-Za-z0-9_\-]+\s*\(-৳?([0-9,.]+)\)\]/)?.[1];

      return `
        <tr style="background: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
          <td style="text-align: center; font-family: monospace; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 6px;">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; color: #0f172a; border: 1px solid #cbd5e1; padding: 5px 6px;">${escapeHtml(b.reference || b.id)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 5px 6px;">
            <div style="font-weight: bold; color: #0f172a;">${escapeHtml(b.customer_full_name)}</div>
            <div style="color: #047857; font-size: 9px; font-family: monospace; font-weight: 600;">${escapeHtml(b.customer_phone_number)}</div>
          </td>
          <td style="font-family: monospace; font-weight: bold; color: #047857; text-align: center; border: 1px solid #cbd5e1; padding: 5px 6px;">${escapeHtml(seatsList)}</td>
          <td style="font-size: 9.5px; color: #334155; border: 1px solid #cbd5e1; padding: 5px 6px;">${escapeHtml(travNames)}</td>
          <td style="font-size: 9.5px; color: #475569; border: 1px solid #cbd5e1; padding: 5px 6px;">${escapeHtml(pickup)}</td>
          <td style="text-align: right; font-weight: 600; border: 1px solid #cbd5e1; padding: 5px 6px;">
            <div>৳${Math.round(Number(b.total_price || 0)).toLocaleString("en-BD")}</div>
            ${promoCode ? `<div style="font-size: 8px; color: #b45309; font-weight: bold; margin-top: 2px;">🎟️ ${escapeHtml(promoCode)}${discountVal ? ` (-৳${Math.round(Number(discountVal)).toLocaleString("en-BD")})` : ""}</div>` : ""}
          </td>
          <td style="text-align: right; font-weight: bold; color: #047857; border: 1px solid #cbd5e1; padding: 5px 6px;">৳${Math.round(Number(b.amount_paid || 0)).toLocaleString("en-BD")}</td>
          <td style="text-align: right; font-weight: bold; color: #b45309; border: 1px solid #cbd5e1; padding: 5px 6px;">৳${Math.round(Number(b.amount_due || 0)).toLocaleString("en-BD")}</td>
          <td style="text-align: center; font-size: 8.5px; font-weight: bold; border: 1px solid #cbd5e1; padding: 5px 6px;">${escapeHtml(statusLabel)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tour Manifest - ${escapeHtml(tourTitle)} - ${escapeHtml(departureDateStr)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 12px;
      font-size: 10px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      color: #047857;
      margin: 0 0 2px 0;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 2px 0;
    }
    .brand-contact {
      font-size: 9px;
      color: #64748b;
      margin: 0;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-type {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      margin: 0 0 3px 0;
    }
    .meta-text {
      font-size: 9.5px;
      color: #475569;
      margin: 1px 0;
    }
    .scope-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      gap: 15px;
    }
    .scope-item {
      flex: 1;
    }
    .scope-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .scope-val {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi-card {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-card.paid {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .kpi-card.due {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
    }
    .kpi-card.paid .kpi-label { color: #065f46; }
    .kpi-card.due .kpi-label { color: #92400e; }
    .kpi-val {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }
    .kpi-card.paid .kpi-val { color: #047857; }
    .kpi-card.due .kpi-val { color: #b45309; }
    .seats-summary {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 12px;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
    }
    th {
      background: #e2e8f0;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8.5px;
      color: #1e293b;
    }
    tfoot {
      background: #e2e8f0;
      font-weight: 800;
      border-top: 2px solid #64748b;
    }
    .signatures {
      margin-top: 25px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      gap: 30px;
      text-align: center;
      page-break-inside: avoid;
    }
    .sig-block {
      flex: 1;
    }
    .sig-line {
      border-bottom: 1px solid #475569;
      height: 35px;
      margin-bottom: 5px;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 8px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">Savar Tour Lover (সাভার ট্যুর লাভার)</h1>
      <p class="brand-sub">আপনার স্বপ্ন উড়তে দিন · Official Passenger Manifest & Revenue Settlement Report</p>
      <p class="brand-contact">Phones: 01620592884, 01646325350 · savartourlover@gmail.com · Savar Pollibidut, Kobarsthan Road, Savar, Dhaka, 1340</p>
    </div>
    <div class="doc-meta">
      <div class="doc-type">TOUR MANIFEST & REVENUE</div>
      <div class="meta-text">Date: <strong>${currentDate}</strong> (${currentTime})</div>
      <div class="meta-text">Prepared By: <strong>${escapeHtml(printedBy)}</strong></div>
    </div>
  </div>

  <div class="scope-box">
    <div class="scope-item">
      <div class="scope-label">Tour Package</div>
      <div class="scope-val">${escapeHtml(tourTitle)}</div>
    </div>
    <div class="scope-item">
      <div class="scope-label">Destination</div>
      <div class="scope-val">${escapeHtml(destinationName)}</div>
    </div>
    <div class="scope-item">
      <div class="scope-label">Departure Date</div>
      <div class="scope-val">${escapeHtml(departureDateStr)}</div>
    </div>
    <div class="scope-item">
      <div class="scope-label">Filter Scope</div>
      <div class="scope-val">${escapeHtml(statusScope)}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Bookings</div>
      <div class="kpi-val">${totals.bookingsCount}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Passengers</div>
      <div class="kpi-val">${totals.travelersCount}</div>
    </div>
    <div class="kpi-card paid">
      <div class="kpi-label">Total Paid / Collected</div>
      <div class="kpi-val">৳${Math.round(totals.paid).toLocaleString("en-BD")}</div>
    </div>
    <div class="kpi-card due">
      <div class="kpi-label">Total Due on Tour Day</div>
      <div class="kpi-val">৳${Math.round(totals.due).toLocaleString("en-BD")}</div>
    </div>
  </div>

  ${
    totals.occupiedSeats.length > 0
      ? `
  <div class="seats-summary">
    <strong>Bus Seats Occupied (${totals.occupiedSeats.length} seats):</strong>
    <span style="font-family: monospace; font-weight: bold; color: #047857; margin-left: 5px;">${totals.occupiedSeats.join(
      ", "
    )}</span>
  </div>`
      : ""
  }

  <table>
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">#</th>
        <th style="width: 80px;">Booking Ref</th>
        <th style="width: 140px;">Customer & Contact</th>
        <th style="width: 75px; text-align: center;">Seats</th>
        <th>Travelers List</th>
        <th style="width: 110px;">Pickup Point</th>
        <th style="width: 70px; text-align: right;">Total</th>
        <th style="width: 70px; text-align: right;">Paid</th>
        <th style="width: 70px; text-align: right;">Due</th>
        <th style="width: 75px; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="text-align: right; padding-right: 10px; border: 1px solid #cbd5e1; padding: 6px;">
          GRAND TOTALS (${totals.travelersCount} PASSENGERS · ${totals.occupiedSeats.length} SEATS):
        </td>
        <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px;">৳${Math.round(
          totals.revenue
        ).toLocaleString("en-BD")}</td>
        <td style="text-align: right; color: #047857; border: 1px solid #cbd5e1; padding: 6px;">৳${Math.round(
          totals.paid
        ).toLocaleString("en-BD")}</td>
        <td style="text-align: right; color: #b45309; border: 1px solid #cbd5e1; padding: 6px;">৳${Math.round(
          totals.due
        ).toLocaleString("en-BD")}</td>
        <td style="border: 1px solid #cbd5e1;"></td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">Tour Lead / Guide Signature</div>
      <div class="sig-sub">Passenger Roster Verification</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">Accounts Officer Signature</div>
      <div class="sig-sub">Cash & Online Payment Clearance</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">Management Authorization</div>
      <div class="sig-sub">Official Seal & Date</div>
    </div>
  </div>
</body>
</html>`;
}

function printHtmlContent(htmlContent: string) {
  // Method 1: Invisible isolated iframe (most reliable across all modern browsers)
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 3000);
      }, 350);
      return;
    }
  } catch (err) {
    console.warn("Iframe print failed, falling back to popup window", err);
  }

  // Method 2 fallback: popup print window
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}

export function TourReportManager({
  bookings = [],
  tours = [],
  destinations = [],
  currentUser,
}: TourReportManagerProps) {
  // Filter states
  const [selectedDestination, setSelectedDestination] = useState<string>("all");
  const [selectedTour, setSelectedTour] = useState<string>("all");
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  // Filter tours matching selected destination
  const availableTours = useMemo(() => {
    if (selectedDestination === "all") return tours;
    return tours.filter((t) => t.destination_slug === selectedDestination);
  }, [tours, selectedDestination]);

  // Extract all available departure dates from bookings and tour departures
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();

    for (const t of tours) {
      if (selectedTour !== "all" && t.id !== selectedTour && t.slug !== selectedTour) continue;
      if (selectedDestination !== "all" && t.destination_slug !== selectedDestination) continue;

      if (Array.isArray(t.departures)) {
        for (const dep of t.departures) {
          if (dep.departure_date) datesSet.add(dep.departure_date.slice(0, 10));
        }
      }
    }

    for (const b of bookings) {
      if (selectedTour !== "all" && b.tour_id !== selectedTour && b.tour_slug !== selectedTour) continue;
      if (selectedDestination !== "all" && b.destination_slug !== selectedDestination) continue;
      if (b.departure_date) datesSet.add(b.departure_date.slice(0, 10));
    }

    return Array.from(datesSet).sort();
  }, [bookings, tours, selectedTour, selectedDestination]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedDestination("all");
    setSelectedTour("all");
    setSelectedDepartureDate("all");
    setDateFrom("");
    setDateTo("");
    setSelectedStatus("all");
    setPaymentFilter("all");
    setSearchQuery("");
  };

  // Filtered bookings calculation
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Destination filter
      if (selectedDestination !== "all") {
        const destMatch =
          b.destination_slug === selectedDestination ||
          tours.some(
            (t) => (t.id === b.tour_id || t.slug === b.tour_slug) && t.destination_slug === selectedDestination
          );
        if (!destMatch) return false;
      }

      // 2. Tour filter
      if (selectedTour !== "all") {
        if (b.tour_id !== selectedTour && b.tour_slug !== selectedTour) return false;
      }

      // 3. Departure Date filter
      const bDate = b.departure_date ? b.departure_date.slice(0, 10) : "";
      if (selectedDepartureDate !== "all") {
        if (bDate !== selectedDepartureDate) return false;
      }
      if (dateFrom && bDate && bDate < dateFrom) return false;
      if (dateTo && bDate && bDate > dateTo) return false;

      // 4. Booking Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "confirmed_any") {
          const isConf =
            b.status === "confirmed_advance_paid" ||
            b.status === "confirmed_fully_paid" ||
            b.status === "cleared_on_tour_day";
          if (!isConf) return false;
        } else if (b.status !== selectedStatus) {
          return false;
        }
      }

      // 5. Payment Due status filter
      if (paymentFilter !== "all") {
        const dueNum = Number(b.amount_due || 0);
        if (paymentFilter === "has_due" && dueNum <= 0) return false;
        if (paymentFilter === "fully_paid" && dueNum > 0) return false;
        if (paymentFilter === "partial" && (Number(b.amount_paid || 0) <= 0 || dueNum <= 0)) return false;
      }

      // 6. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = b.reference?.toLowerCase().includes(q);
        const nameMatch = b.customer_full_name?.toLowerCase().includes(q);
        const phoneMatch = b.customer_phone_number?.toLowerCase().includes(q);
        const emailMatch = b.customer_email?.toLowerCase().includes(q);
        const pickupMatch = b.pickup_point?.toLowerCase().includes(q);
        const seatsMatch = b.selected_seats?.some((s) => s.toLowerCase().includes(q));
        const travelersMatch = b.travelers?.some((t) => t.full_name?.toLowerCase().includes(q));
        const trxMatch =
          b.transaction_id?.toLowerCase().includes(q) ||
          b.advance_transaction_id?.toLowerCase().includes(q) ||
          b.due_transaction_id?.toLowerCase().includes(q);

        if (!refMatch && !nameMatch && !phoneMatch && !emailMatch && !pickupMatch && !seatsMatch && !travelersMatch && !trxMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    bookings,
    tours,
    selectedDestination,
    selectedTour,
    selectedDepartureDate,
    dateFrom,
    dateTo,
    selectedStatus,
    paymentFilter,
    searchQuery,
  ]);

  // Aggregate calculations
  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalTravelers = 0;
    const allSeats: string[] = [];

    for (const b of filteredBookings) {
      if (b.status !== "cancelled" && b.status !== "refunded") {
        totalRevenue += Number(b.total_price || 0);
        totalPaid += Number(b.amount_paid || 0);
        totalDue += Number(b.amount_due || 0);
        totalTravelers += Number(b.traveler_count || 1);
        if (Array.isArray(b.selected_seats)) {
          for (const s of b.selected_seats) {
            if (s) allSeats.push(s.trim().toUpperCase());
          }
        }
      }
    }

    const uniqueSeats = Array.from(new Set(allSeats)).sort();

    return {
      bookingsCount: filteredBookings.length,
      activeBookingsCount: filteredBookings.filter((b) => b.status !== "cancelled" && b.status !== "refunded").length,
      travelersCount: totalTravelers,
      revenue: totalRevenue,
      paid: totalPaid,
      due: totalDue,
      occupiedSeats: uniqueSeats,
    };
  }, [filteredBookings]);

  // Active tour and destination objects for labels
  const currentTourObj = tours.find((t) => t.id === selectedTour || t.slug === selectedTour);
  const currentDestObj = destinations.find((d) => d.slug === selectedDestination);

  // Generate printable HTML string on demand
  const currentReportHtml = useMemo(() => {
    const tourTitle = currentTourObj ? currentTourObj.title : "All Selected Tours";
    const destName = currentDestObj ? currentDestObj.name : "All Destinations";
    const dateStr =
      selectedDepartureDate !== "all"
        ? formatDateDisplay(selectedDepartureDate)
        : dateFrom || dateTo
        ? `${dateFrom || "Start"} to ${dateTo || "End"}`
        : "All Scheduled Departures";

    return generatePrintableReportHtml({
      bookings: filteredBookings,
      totals,
      tourTitle,
      destinationName: destName,
      departureDateStr: dateStr,
      statusScope: selectedStatus.replace(/_/g, " "),
      printedBy: currentUser?.username || "Admin / Host",
    });
  }, [
    filteredBookings,
    totals,
    currentTourObj,
    currentDestObj,
    selectedDepartureDate,
    dateFrom,
    dateTo,
    selectedStatus,
    currentUser,
  ]);

  // Direct trigger: prints or downloads PDF directly!
  const handlePrintPdf = () => {
    printHtmlContent(currentReportHtml);
  };

  // Direct HTML report download
  const handleDownloadHtml = () => {
    const blob = new Blob([currentReportHtml], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `tour_manifest_${selectedTour !== "all" ? selectedTour : "all"}_${new Date().toISOString().slice(0, 10)}.html`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredBookings.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "SL",
      "Booking Reference",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Tour Title",
      "Destination",
      "Departure Date",
      "Traveler Count",
      "Selected Seats",
      "Traveler Names",
      "Pickup Point",
      "Total Price (BDT)",
      "Advance Paid (BDT)",
      "Amount Due (BDT)",
      "Booking Status",
      "Transaction ID",
      "Created At",
    ];

    const rows = filteredBookings.map((b, idx) => {
      const seatsStr = b.selected_seats && b.selected_seats.length > 0 ? b.selected_seats.join("; ") : "N/A";
      const travNamesStr =
        b.travelers && b.travelers.length > 0
          ? b.travelers.map((t) => `${t.full_name}${t.seat_number ? ` (${t.seat_number})` : ""}`).join("; ")
          : b.customer_full_name;
      const trxIdStr = b.transaction_id || b.advance_transaction_id || b.due_transaction_id || "N/A";

      return [
        idx + 1,
        `"${b.reference || b.id}"`,
        `"${b.customer_full_name}"`,
        `"${b.customer_phone_number}"`,
        `"${b.customer_email || ""}"`,
        `"${b.tour_title}"`,
        `"${b.destination_slug || ""}"`,
        `"${b.departure_date ? b.departure_date.slice(0, 10) : "Open"}"`,
        b.traveler_count,
        `"${seatsStr}"`,
        `"${travNamesStr}"`,
        `"${(b.pickup_point || "").replace(/"/g, '""')}"`,
        Number(b.total_price || 0),
        Number(b.amount_paid || 0),
        Number(b.amount_due || 0),
        `"${b.status}"`,
        `"${trxIdStr}"`,
        `"${b.created_at || ""}"`,
      ];
    });

    rows.push([
      "TOTALS",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totals.travelersCount,
      `"Seats: ${totals.occupiedSeats.length}"`,
      "",
      "",
      totals.revenue,
      totals.paid,
      totals.due,
      "",
      "",
      "",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `tour_manifest_report_${selectedTour !== "all" ? selectedTour : "all_tours"}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 mb-1.5">
            <span>📊 Tour Intelligence & Reports</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Tour Manifest & Customer Revenue Reports
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Filter customer bookings by destination, individual tour, departure date, or payment status. Calculate instant revenue and export professional PDF manifests.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handlePrintPdf}
            disabled={filteredBookings.length === 0}
            className="rounded-xl bg-emerald-700 px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
            title="Export/Save as PDF"
          >
            <span>📄 Print PDF</span>
          </button>
          <button
            onClick={() => setShowPdfModal(true)}
            disabled={filteredBookings.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 sm:px-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
            title="Preview on screen before printing"
          >
            <span>👁️ Preview</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filteredBookings.length === 0}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 sm:px-3.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>📥 Export CSV</span>
          </button>
          <button
            onClick={handleResetFilters}
            className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer flex items-center justify-center gap-1"
            title="Reset All Filters"
          >
            <span>↻ Reset</span>
          </button>
        </div>
      </div>

      {/* ================= FILTER PANEL ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span>🔍 Filter Criteria</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {filteredBookings.length} results matching
            </span>
          </h3>
          {(selectedDestination !== "all" ||
            selectedTour !== "all" ||
            selectedDepartureDate !== "all" ||
            dateFrom ||
            dateTo ||
            selectedStatus !== "all" ||
            paymentFilter !== "all" ||
            searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Destination Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Destination</label>
            <select
              value={selectedDestination}
              onChange={(e) => {
                setSelectedDestination(e.target.value);
                setSelectedTour("all");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
            >
              <option value="all">All Destinations ({destinations.length})</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tour Package Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tour Package</label>
            <select
              value={selectedTour}
              onChange={(e) => {
                setSelectedTour(e.target.value);
                setSelectedDepartureDate("all");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
            >
              <option value="all">All Tours ({availableTours.length})</option>
              {availableTours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Departure Date Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date</label>
            <select
              value={selectedDepartureDate}
              onChange={(e) => setSelectedDepartureDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
            >
              <option value="all">All Departures ({availableDates.length} dates)</option>
              {availableDates.map((dateStr) => (
                <option key={dateStr} value={dateStr}>
                  {formatDateDisplay(dateStr)} ({dateStr})
                </option>
              ))}
            </select>
          </div>

          {/* Booking / Payment Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
            >
              <option value="all">All Booking Statuses</option>
              <option value="confirmed_any">Confirmed (Advance & Full)</option>
              <option value="confirmed_advance_paid">Advance Paid</option>
              <option value="confirmed_fully_paid">Fully Paid</option>
              <option value="cleared_on_tour_day">Cleared On Tour Day</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Date Range & Search */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Date Range: From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSelectedDepartureDate("all");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Date Range: To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setSelectedDepartureDate("all");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Search Passenger, Seat or Ref
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, phone, seats (e.g. A1)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= FINANCIAL & PASSENGER KPI CARDS ================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bookings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totals.bookingsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totals.activeBookingsCount} active</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Travelers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totals.travelersCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Passengers</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Booked Seats</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{totals.occupiedSeats.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={totals.occupiedSeats.join(", ")}>
            {totals.occupiedSeats.length > 0
              ? totals.occupiedSeats.slice(0, 5).join(", ") +
                (totals.occupiedSeats.length > 5 ? "..." : "")
              : "None"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Value (Tk)</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatBDT(totals.revenue)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Gross Revenue</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Amount Paid (Tk)</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{formatBDT(totals.paid)}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Collected</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Amount Due (Tk)</p>
          <p className="mt-1 text-xl font-bold text-amber-800">{formatBDT(totals.due)}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Due On Tour Day</p>
        </div>
      </div>

      {/* ================= PASSENGER MANIFEST & CUSTOMER TABLE ================= */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {currentTourObj ? currentTourObj.title : "All Tours"} Manifest
            </h3>
            <p className="text-xs text-slate-500">
              {selectedDepartureDate !== "all"
                ? `Departure: ${formatDateDisplay(selectedDepartureDate)}`
                : "All Departures"}{" "}
              · {filteredBookings.length} Customer Bookings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
            >
              <span>🖨️ Print / Save as PDF</span>
            </button>
            <button
              onClick={() => setShowPdfModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <span>👁️ Preview</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 w-10">#</th>
                <th className="px-3.5 py-3">Reference</th>
                <th className="px-3.5 py-3">Customer (Lead)</th>
                <th className="px-3.5 py-3">Tour & Date</th>
                <th className="px-3.5 py-3">Seats & Travelers</th>
                <th className="px-3.5 py-3">Pickup Location</th>
                <th className="px-3.5 py-3">Financials (Tk)</th>
                <th className="px-3.5 py-3">Status</th>
                <th className="px-3.5 py-3 text-right">Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No bookings match the selected filters.</p>
                    <p className="text-xs mt-1 text-slate-400">Try adjusting destination, tour, or date filters above.</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b, idx) => {
                  const seatsList = b.selected_seats || [];
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3.5 py-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-mono font-semibold text-slate-900">
                        {b.reference || b.id}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900">{b.customer_full_name}</div>
                        <a
                          href={`tel:${b.customer_phone_number}`}
                          className="text-xs text-emerald-800 hover:underline font-mono"
                        >
                          {b.customer_phone_number}
                        </a>
                        {b.customer_email && (
                          <div className="text-[11px] text-slate-400">{b.customer_email}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-medium text-slate-900">{b.tour_title}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>📅 {formatDateDisplay(b.departure_date)}</span>
                          {b.destination_slug && (
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] uppercase font-semibold text-slate-600">
                              {b.destination_slug}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {seatsList.length > 0 ? (
                            seatsList.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">No seat assigned</span>
                          )}
                          <span className="text-xs font-medium text-slate-500 ml-1">
                            ({b.traveler_count} pers.)
                          </span>
                        </div>
                        {b.travelers && b.travelers.length > 1 && (
                          <div
                            className="text-[11px] text-slate-400 mt-1 truncate max-w-xs"
                            title={b.travelers.map((t) => t.full_name).join(", ")}
                          >
                            Travelers: {b.travelers.map((t) => t.full_name).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="text-xs font-medium text-slate-800">
                          {b.pickup_point
                            ? b.pickup_point.replace(/Seats:\s*([A-Za-z0-9,\s]+)/, "").trim() || "Default Point"
                            : "Dhaka Point"}
                        </div>
                        {b.special_requests && (
                          <div
                            className="text-[11px] text-amber-700 italic mt-0.5 max-w-xs truncate"
                            title={b.special_requests}
                          >
                            Note: {b.special_requests}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900">{formatBDT(b.total_price)}</div>
                        {(b.promo_code || (b.special_requests && b.special_requests.includes("[Promo: "))) && (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-200">
                            <span>🎟️</span>
                            <span>{b.promo_code || b.special_requests?.match(/\[Promo:\s*([A-Za-z0-9_\-]+)/)?.[1]}</span>
                            {(b.discount_amount || b.special_requests?.match(/\[Promo:\s*[A-Za-z0-9_\-]+\s*\(-৳?([0-9,.]+)\)\]/)?.[1]) && (
                              <span className="text-amber-700 font-normal">
                                (-৳{Math.round(Number(b.discount_amount || b.special_requests?.match(/\[Promo:\s*[A-Za-z0-9_\-]+\s*\(-৳?([0-9,.]+)\)\]/)?.[1] || 0)).toLocaleString("en-BD")})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-emerald-800 font-medium mt-0.5">
                          Paid: {formatBDT(b.amount_paid)}
                        </div>
                        {Number(b.amount_due) > 0 ? (
                          <div className="text-xs text-amber-800 font-bold">
                            Due: {formatBDT(b.amount_due)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-700 font-semibold">✓ Cleared</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                            b.status === "confirmed_fully_paid" || b.status === "cleared_on_tour_day"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : b.status === "confirmed_advance_paid"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : b.status === "cancelled" || b.status === "refunded"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <a
                          href={`/clearance/${b.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition inline-block"
                        >
                          Pass ↗
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredBookings.length > 0 && (
              <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="px-3.5 py-3.5 text-right uppercase text-xs tracking-wider">
                    Total Summary ({totals.activeBookingsCount} active bookings):
                  </td>
                  <td className="px-3.5 py-3.5 text-xs">
                    {totals.travelersCount} travelers · {totals.occupiedSeats.length} seats
                  </td>
                  <td className="px-3.5 py-3.5"></td>
                  <td className="px-3.5 py-3.5 text-xs">
                    <div>Total: {formatBDT(totals.revenue)}</div>
                    <div className="text-emerald-800">Paid: {formatBDT(totals.paid)}</div>
                    <div className="text-amber-800">Due: {formatBDT(totals.due)}</div>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ================= ON-SCREEN PREVIEW MODAL ================= */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white p-5 sm:p-7 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Top Controls */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">PDF Report Document Preview</h3>
                <p className="text-xs text-slate-500">
                  Document formatted for standard A4 landscape with financial breakdown, seat manifest, and verification blocks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ Print / Save as PDF</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs flex items-center gap-1 cursor-pointer"
                  title="Download raw HTML document"
                >
                  <span>📥 HTML</span>
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Embedded Live Iframe Preview */}
            <div className="flex-1 overflow-hidden border border-slate-300 rounded-xl bg-slate-100 shadow-inner min-h-[480px]">
              <iframe
                srcDoc={currentReportHtml}
                title="Report Document Preview"
                className="w-full h-full min-h-[480px] border-none bg-white"
              />
            </div>

            {/* Modal Bottom Controls */}
            <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Tip: When the print dialog opens, select <strong>&ldquo;Save as PDF&rdquo;</strong> as the destination to download the complete PDF file directly.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer"
                >
                  🖨️ Print / Save as PDF
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
