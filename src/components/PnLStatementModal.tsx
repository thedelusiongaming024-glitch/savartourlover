"use client";

import React, { useState } from "react";
import type { DbExpense, DbSupplier } from "@/server/types";

export interface AgencyOverview {
  total_revenue: string;
  total_direct_cost: string;
  total_operational_expense: string;
  gross_profit: string;
  net_profit: string;
  bookings_count: number;
  active_tours_count: number;
  pending_advances: string;
  due_on_tour_day: string;
  supplier_payables: string;
}

export interface PnLStatementParams {
  overview: AgencyOverview | null;
  expenses: DbExpense[];
  suppliers: DbSupplier[];
  currentUser?: {
    username: string;
    role?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  isBn?: boolean;
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBdt(val: number | string | undefined | null): string {
  const num = typeof val === "string" ? parseFloat(val) : Number(val || 0);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${Math.round(num).toLocaleString("en-BD")}`;
}

export function generatePnLStatementHtml(params: PnLStatementParams): string {
  const { overview, expenses = [], suppliers = [], currentUser, isBn = false } = params;

  const now = new Date();
  const currentDate = now.toLocaleDateString(isBn ? "bn-BD" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const currentTime = now.toLocaleTimeString(isBn ? "bn-BD" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rev = parseFloat(overview?.total_revenue || "0");
  const due = parseFloat(overview?.due_on_tour_day || "0");
  const directCost = parseFloat(overview?.total_direct_cost || "0");
  const opExp = parseFloat(overview?.total_operational_expense || "0");
  const grossProfit = parseFloat(overview?.gross_profit || "0");
  const netProfit = parseFloat(overview?.net_profit || "0");

  const grossMarginPct = rev > 0 ? ((grossProfit / rev) * 100).toFixed(1) : "0.0";
  const netMarginPct = rev > 0 ? ((netProfit / rev) * 100).toFixed(1) : "0.0";

  // Category aggregations for Direct Costs (COGS)
  const cogsCategories = [
    { key: "hotel", en: "Hotel & Resort Accommodations", bn: "হোটেল ও রিসোর্ট আবাসন" },
    { key: "transport", en: "Transport & Bus Charters", bn: "পরিবহন ও বাস চার্টার" },
    { key: "guide", en: "Tour Guide & Team Lead Fees", bn: "ট্যুর গাইড ও লিড ফি" },
    { key: "food", en: "Food, Catering & Refreshments", bn: "খাবার ও ক্যাটারিং" },
    { key: "boat", en: "Boat & Ferry Transfers", bn: "নৌকা ও ট্রলার ভাড়া" },
  ];

  const cogsRows = cogsCategories.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.key)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
    return {
      label: isBn ? cat.bn : cat.en,
      amount: total,
    };
  });

  // Category aggregations for Operating Expenses
  const opCategories = [
    { key: "office", en: "Office Space & Physical Hub Rent", bn: "অফিস ভাড়া ও স্পেস" },
    { key: "utilities", en: "Utilities, Electricity & Broadband", bn: "বিদ্যুৎ, ইন্টারনেট ও বিল" },
    { key: "marketing", en: "Marketing & Facebook Ad Campaigns", bn: "ফেসবুক বিজ্ঞাপন ও মার্কেটিং" },
    { key: "software", en: "Hosting, Domains, SMS & Software Tools", bn: "ডোমেইন, হোস্টিং ও সফটওয়্যার" },
    { key: "other", en: "Miscellaneous Operational Overheads", bn: "অন্যান্য প্রশাসনিক খরচ" },
  ];

  const opRows = opCategories.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.key)
      .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);
    return {
      label: isBn ? cat.bn : cat.en,
      amount: total,
    };
  });

  // Recent expense ledger audit rows
  const sortedExpenses = [...expenses]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 15);

  const supplierMap = new Map<string, string>();
  for (const s of suppliers) {
    supplierMap.set(s.id, s.name);
  }

  const prepName = currentUser?.first_name || currentUser?.username || "Authorized Staff";
  const prepRole = currentUser?.role ? currentUser.role.replace(/_/g, " ").toUpperCase() : "FINANCE MANAGER";
  const reportDocId = `STL-PL-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  return `<!DOCTYPE html>
<html lang="${isBn ? "bn" : "en"}">
<head>
  <meta charset="utf-8">
  <title>Savar Tour Lover - Official Profit &amp; Loss Statement (${reportDocId})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Hind+Siliguri:wght@400;600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.45;
    }

    .statement-wrapper {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
    }

    /* Corporate Header */
    .header {
      border-bottom: 3px solid #047857;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      height: 52px;
      width: auto;
      object-fit: contain;
      border-radius: 8px;
    }

    .brand-title {
      font-size: 21px;
      font-weight: 900;
      color: #064e3b;
      margin: 0 0 2px 0;
      letter-spacing: -0.4px;
      line-height: 1.1;
    }

    .brand-tagline {
      font-size: 10px;
      font-weight: 700;
      color: #d97706;
      margin: 0 0 3px 0;
    }

    .brand-info {
      font-size: 8.5px;
      color: #475569;
      line-height: 1.35;
      margin: 0;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-title-badge {
      display: inline-block;
      background: #064e3b;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 4px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .meta-line {
      font-size: 9px;
      color: #475569;
      margin: 1.5px 0;
    }

    .meta-line strong {
      color: #0f172a;
    }

    /* Executive KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 7px 9px;
      background: #f8fafc;
      text-align: center;
    }

    .kpi-card.revenue {
      background: #f0fdf4;
      border-color: #86efac;
    }

    .kpi-card.direct {
      background: #fff1f2;
      border-color: #fecdd3;
    }

    .kpi-card.gross {
      background: #f0fdfa;
      border-color: #99f6e4;
    }

    .kpi-card.net-profit {
      background: #ecfdf5;
      border-color: #6ee7b7;
    }

    .kpi-card.net-loss {
      background: #fef2f2;
      border-color: #fca5a5;
    }

    .kpi-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #64748b;
      margin-bottom: 2px;
    }

    .kpi-val {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }

    .kpi-card.revenue .kpi-val { color: #047857; }
    .kpi-card.direct .kpi-val { color: #be123c; }
    .kpi-card.gross .kpi-val { color: #0d9488; }
    .kpi-card.net-profit .kpi-val { color: #059669; }
    .kpi-card.net-loss .kpi-val { color: #dc2626; }

    .kpi-sub {
      font-size: 8px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 600;
    }

    /* Section Headers */
    .section-header {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 3px;
      margin-top: 10px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-total {
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
    }

    /* Financial Tables */
    .pnl-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
      font-size: 9.5px;
    }

    .pnl-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8px;
      letter-spacing: 0.3px;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      text-align: left;
    }

    .pnl-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 8px;
      color: #334155;
    }

    .pnl-table tr:nth-child(even) {
      background: #f8fafc;
    }

    .pnl-table td.amount {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      color: #0f172a;
    }

    .subtotal-row {
      background: #f1f5f9 !important;
      font-weight: 800;
      border-top: 1.5px solid #94a3b8 !important;
    }

    .subtotal-row td {
      color: #0f172a !important;
      font-weight: 800 !important;
    }

    /* Gross Margin Banner */
    .margin-strip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 6px 0 10px 0;
      font-size: 10px;
      font-weight: 800;
    }

    .margin-strip-val {
      font-family: monospace;
      font-size: 12px;
      font-weight: 900;
    }

    /* Final Net Position Box */
    .net-summary-box {
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 10px 0 14px 0;
      border: 2px solid;
    }

    .net-summary-box.profit {
      background: #ecfdf5;
      border-color: #059669;
      color: #064e3b;
    }

    .net-summary-box.loss {
      background: #fef2f2;
      border-color: #dc2626;
      color: #991b1b;
    }

    .net-main-title {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .net-formula {
      font-size: 8.5px;
      opacity: 0.85;
      font-weight: 600;
      margin-top: 1px;
    }

    .net-main-val {
      font-size: 18px;
      font-weight: 900;
      font-family: monospace;
    }

    /* Signatures Section */
    .signatures {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      text-align: center;
      page-break-inside: avoid;
    }

    .sig-col {
      flex: 1;
    }

    .sig-line {
      border-bottom: 1px dashed #475569;
      height: 32px;
      margin-bottom: 4px;
    }

    .sig-title {
      font-size: 9px;
      font-weight: 800;
      color: #0f172a;
    }

    .sig-sub {
      font-size: 8px;
      color: #64748b;
    }

    .seal-circle {
      width: 70px;
      height: 44px;
      border: 1px dashed #94a3b8;
      border-radius: 50%;
      margin: 0 auto 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: bold;
    }

    .footer-note {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
      font-size: 7.5px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div class="statement-wrapper">
    <!-- Corporate Header -->
    <div class="header">
      <div class="brand-section">
        <img src="/images/logo-badge.png" alt="Savar Tour Lover" class="brand-logo" onerror="this.style.display='none'" />
        <div>
          <h1 class="brand-title">Savar Tour Lover (সাভার ট্যুর লাভার)</h1>
          <p class="brand-tagline">আপনার স্বপ্ন উড়তে দিন · Let Your Dreams Fly</p>
          <p class="brand-info">
            Savar Pollibidut, Kobarsthan Road, Savar, Dhaka 1340, Bangladesh<br>
            Hotlines: +880 1620-592884, +880 1646-325350 · Email: savartourlover@gmail.com · Web: www.savartourlover.com
          </p>
        </div>
      </div>
      <div class="doc-meta">
        <div class="doc-title-badge">
          ${isBn ? "প্রফিট ও লস (P&amp;L) স্টেটমেন্ট" : "Profit &amp; Loss Statement"}
        </div>
        <div class="meta-line">Doc ID: <strong>${reportDocId}</strong></div>
        <div class="meta-line">Date: <strong>${currentDate}</strong> (${currentTime})</div>
        <div class="meta-line">Prepared By: <strong>${escapeHtml(prepName)}</strong></div>
        <div class="meta-line">Role: <strong>${escapeHtml(prepRole)}</strong></div>
        <div class="meta-line">Currency: <strong>Bangladeshi Taka (BDT / ৳)</strong></div>
      </div>
    </div>

    <!-- Executive KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card revenue">
        <div class="kpi-label">${isBn ? "মোট গ্রস রেভিনিউ" : "Gross Revenue"}</div>
        <div class="kpi-val">${formatBdt(rev)}</div>
        <div class="kpi-sub">${isBn ? "ভ্রমণ প্যাকেজ বিক্রি" : "Customer Tour Sales"}</div>
      </div>
      <div class="kpi-card direct">
        <div class="kpi-label">${isBn ? "সরাসরি পরিচালন ব্যয় (COGS)" : "Direct Tour Costs"}</div>
        <div class="kpi-val">${formatBdt(directCost)}</div>
        <div class="kpi-sub">${isBn ? "হোটেল, বাস ও লজিস্টিকস" : "Hotels, Transport & Ops"}</div>
      </div>
      <div class="kpi-card gross">
        <div class="kpi-label">${isBn ? "গ্রস প্রফিট (মার্জিন)" : "Gross Profit (Margin)"}</div>
        <div class="kpi-val" style="color: ${grossProfit >= 0 ? "#0d9488" : "#be123c"}">${formatBdt(grossProfit)}</div>
        <div class="kpi-sub">${grossMarginPct}% ${isBn ? "গ্রস মার্জিন" : "Gross Margin"}</div>
      </div>
      <div class="kpi-card ${netProfit >= 0 ? "net-profit" : "net-loss"}">
        <div class="kpi-label">${isBn ? "নিট প্রফিট / মুনাফা" : "Net Profit / (Loss)"}</div>
        <div class="kpi-val">${formatBdt(netProfit)}</div>
        <div class="kpi-sub">${netMarginPct}% ${isBn ? "নিট মার্জিন" : "Net Margin"}</div>
      </div>
    </div>

    <!-- 1. GROSS REVENUE -->
    <div class="section-header">
      <span>1. ${isBn ? "গ্রস রেভিনিউ ও বুকিং আয়" : "Gross Operational Revenue"}</span>
      <span class="section-total" style="color: #047857">${formatBdt(rev)}</span>
    </div>
    <table class="pnl-table">
      <thead>
        <tr>
          <th style="width: 55%">${isBn ? "আয়ের বিবরণ" : "Revenue Account Description"}</th>
          <th style="width: 25%">${isBn ? "ক্যাটেগরি / স্থিতি" : "Accounting Classification"}</th>
          <th style="width: 20%; text-align: right">${isBn ? "পরিমাণ" : "Amount (BDT)"}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${isBn ? "ভ্রমণ প্যাকেজ বুকিং থেকে সংগৃহীত অর্থ (Realized Revenue)" : "Verified Customer Package Payments (Realized Inflow)"}</td>
          <td>Operating Revenue</td>
          <td class="amount">${formatBdt(rev)}</td>
        </tr>
        <tr>
          <td style="color: #b45309">
            ${isBn ? "ট্যুরের দিনে আদায়যোগ্য বকেয়া (Unrealized Receivables)" : "Tour-Day Balance Due (Unrealized Receivables)"}
          </td>
          <td style="color: #b45309">Pending Settlement</td>
          <td class="amount" style="color: #b45309">${formatBdt(due)}</td>
        </tr>
        <tr class="subtotal-row">
          <td colspan="2">${isBn ? "মোট গ্রস রেভিনিউ (আদায়কৃত অর্থ)" : "Total Gross Realized Revenue"}</td>
          <td class="amount" style="color: #047857">${formatBdt(rev)}</td>
        </tr>
      </tbody>
    </table>

    <!-- 2. DIRECT COSTS (COGS) -->
    <div class="section-header" style="margin-top: 12px;">
      <span>2. ${isBn ? "ট্যুর সরাসরি পরিচালন ব্যয় (COGS / Direct Costs)" : "Tour Operating Direct Costs (COGS)"}</span>
      <span class="section-total" style="color: #be123c">(${formatBdt(directCost)})</span>
    </div>
    <table class="pnl-table">
      <thead>
        <tr>
          <th style="width: 55%">${isBn ? "সরাসরি ব্যয়ের খাত" : "Cost of Goods Sold (COGS) Account"}</th>
          <th style="width: 25%">${isBn ? "ক্যাটেগরি কোড" : "Category"}</th>
          <th style="width: 20%; text-align: right">${isBn ? "পরিমাণ" : "Amount (BDT)"}</th>
        </tr>
      </thead>
      <tbody>
        ${cogsRows
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>Direct Cost</td>
            <td class="amount">${formatBdt(row.amount)}</td>
          </tr>`
          )
          .join("")}
        <tr class="subtotal-row">
          <td colspan="2">${isBn ? "মোট সরাসরি পরিচালন ব্যয় (Total COGS)" : "Total Direct Tour Costs (COGS)"}</td>
          <td class="amount" style="color: #be123c">(${formatBdt(directCost)})</td>
        </tr>
      </tbody>
    </table>

    <!-- GROSS PROFIT STRIP -->
    <div class="margin-strip">
      <span style="color: #0f172a">
        ${isBn ? "গ্রস প্রফিট / মোট পরিচালন লাভ (Gross Margin)" : "GROSS PROFIT (Operating Margin = Revenue - Direct Costs)"}
      </span>
      <span class="margin-strip-val" style="color: ${grossProfit >= 0 ? "#047857" : "#dc2626"}">
        ${formatBdt(grossProfit)} (${grossMarginPct}%)
      </span>
    </div>

    <!-- 3. GENERAL OVERHEADS -->
    <div class="section-header">
      <span>3. ${isBn ? "সাধারণ পরিচালন ও প্রশাসনিক ওভারহেড (Overheads)" : "General Operating Overheads & Admin Expenses"}</span>
      <span class="section-total" style="color: #be123c">(${formatBdt(opExp)})</span>
    </div>
    <table class="pnl-table">
      <thead>
        <tr>
          <th style="width: 55%">${isBn ? "প্রশাসনিক ব্যয়ের খাত" : "Operating Overhead Account"}</th>
          <th style="width: 25%">${isBn ? "ক্যাটেগরি কোড" : "Category"}</th>
          <th style="width: 20%; text-align: right">${isBn ? "পরিমাণ" : "Amount (BDT)"}</th>
        </tr>
      </thead>
      <tbody>
        ${opRows
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>Operating Expense</td>
            <td class="amount">${formatBdt(row.amount)}</td>
          </tr>`
          )
          .join("")}
        <tr class="subtotal-row">
          <td colspan="2">${isBn ? "মোট প্রশাসনিক পরিচালন ওভারহেড" : "Total General Operating Overheads"}</td>
          <td class="amount" style="color: #be123c">(${formatBdt(opExp)})</td>
        </tr>
      </tbody>
    </table>

    <!-- 4. NET PROFIT FINAL TOTAL -->
    <div class="net-summary-box ${netProfit >= 0 ? "profit" : "loss"}">
      <div>
        <div class="net-main-title">
          ${isBn ? "নিট মুনাফা / (নিট লোকসান) — NET PROFIT / (LOSS)" : "NET PROFIT / (NET LOSS) AFTER ALL EXPENSES"}
        </div>
        <div class="net-formula">
          ${isBn ? "গ্রস প্রফিট থেকে সমস্ত পরিচালন ওভারহেড বাদ দিয়ে (Gross Profit - Operating Overheads)" : "Net Margin Formula: Gross Profit (৳" + Math.round(grossProfit).toLocaleString("en-BD") + ") - Operating Overheads (৳" + Math.round(opExp).toLocaleString("en-BD") + ")"}
        </div>
      </div>
      <div style="text-align: right">
        <div class="net-main-val">${formatBdt(netProfit)}</div>
        <div style="font-size: 9px; font-weight: 700; opacity: 0.9">${netMarginPct}% Net Margin</div>
      </div>
    </div>

    ${
      sortedExpenses.length > 0
        ? `
    <!-- 5. ITEMIZED AUDIT TRAIL -->
    <div class="section-header" style="margin-top: 14px;">
      <span>${isBn ? "সাম্প্রতিক ব্যয় ও ভেন্ডর প্রদান অডিট ট্রেল" : "Itemized Expense & Vendor Disbursal Audit Trail (Top " + sortedExpenses.length + ")"}</span>
      <span class="section-total">${sortedExpenses.length} Records</span>
    </div>
    <table class="pnl-table">
      <thead>
        <tr>
          <th style="width: 6%; text-align: center">#</th>
          <th style="width: 14%">${isBn ? "তারিখ" : "Date"}</th>
          <th style="width: 38%">${isBn ? "ব্যয়ের বিবরণ ও শিরোনাম" : "Description / Expense Title"}</th>
          <th style="width: 16%">${isBn ? "ক্যাটেগরি" : "Category"}</th>
          <th style="width: 14%">${isBn ? "সরবরাহকারী" : "Vendor"}</th>
          <th style="width: 12%; text-align: right">${isBn ? "পরিমাণ" : "Amount"}</th>
        </tr>
      </thead>
      <tbody>
        ${sortedExpenses
          .map((e, idx) => {
            const supplierName = e.id && supplierMap.get((e as any).supplier_id) ? supplierMap.get((e as any).supplier_id) : "—";
            return `
          <tr>
            <td style="text-align: center; font-family: monospace">${idx + 1}</td>
            <td style="font-family: monospace">${escapeHtml(e.date || "—")}</td>
            <td style="font-weight: 600">${escapeHtml(e.description || (e as any).title || "Operational Expense")}</td>
            <td style="text-transform: capitalize">${escapeHtml(e.category)}</td>
            <td>${escapeHtml(supplierName)}</td>
            <td class="amount">${formatBdt(e.amount)}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    `
        : ""
    }

    <!-- Official Corporate Signatures -->
    <div class="signatures">
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-title">${escapeHtml(prepName)}</div>
        <div class="sig-sub">Prepared By (${escapeHtml(prepRole)})</div>
      </div>
      <div class="sig-col">
        <div class="seal-circle">OFFICIAL<br>SEAL</div>
        <div class="sig-title">Audit &amp; Finance Wing</div>
        <div class="sig-sub">Savar Tour Lover ERP</div>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-title">Managing Director &amp; CEO</div>
        <div class="sig-sub">Authorized Executive Signatory</div>
      </div>
    </div>

    <!-- ERP Digital Verification Notice -->
    <div class="footer-note">
      This is a certified digital financial statement automatically generated by Savar Tour Lover Enterprise Management System.<br>
      All recorded revenues and expenses correspond to verified mobile banking (bKash/Rocket), digital gateway callbacks, and supplier disbursement receipts.<br>
      System Verification Code: ${reportDocId} · Generated at: ${currentDate} ${currentTime}
    </div>
  </div>
</body>
</html>`;
}

export function printPnLStatementHtml(htmlContent: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
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
      }, 400);
      return;
    }
  } catch (err) {
    console.warn("Iframe print failed, falling back to popup window", err);
  }

  // Fallback popup window
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

export function downloadPnLStatementHtml(htmlContent: string, filename = "Savar-Tour-Lover-Profit-Loss-Statement.html") {
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface PnLStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview: AgencyOverview | null;
  expenses: DbExpense[];
  suppliers: DbSupplier[];
  currentUser?: {
    username: string;
    role?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  initialIsBn?: boolean;
}

export function PnLStatementModal({
  isOpen,
  onClose,
  overview,
  expenses = [],
  suppliers = [],
  currentUser,
  initialIsBn = false,
}: PnLStatementModalProps) {
  const [isBn, setIsBn] = useState(initialIsBn);

  if (!isOpen) return null;

  const html = generatePnLStatementHtml({
    overview,
    expenses,
    suppliers,
    currentUser,
    isBn,
  });

  const handlePrint = () => {
    printPnLStatementHtml(html);
  };

  const handleDownload = () => {
    downloadPnLStatementHtml(html, `Savar-Tour-Lover-PnL-Statement-${new Date().toISOString().split("T")[0]}.html`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex h-full max-h-[95vh] w-full max-w-5xl flex-col rounded-2xl bg-slate-900 shadow-2xl border border-slate-700 overflow-hidden">
        {/* Modal Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-800/90 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 text-lg">
              🖨️
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isBn ? "অফিসিয়াল প্রফিট ও লস (P&L) স্টেটমেন্ট প্রিভিউ" : "Official Profit & Loss Statement Preview"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isBn ? "A4 প্রিন্ট প্রস্তুত ও সার্টিফাইড হিসাব রিপোর্ট" : "A4 Print-Ready Corporate Financial Audit"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setIsBn(!isBn)}
              className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-600 transition cursor-pointer"
              title="Toggle Bengali / English"
            >
              {isBn ? "English View" : "বাংলা ভিউ"}
            </button>

            {/* Download HTML */}
            <button
              type="button"
              onClick={handleDownload}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-600 transition cursor-pointer"
              title="Download standalone HTML statement"
            >
              <span>📥</span>
              HTML
            </button>

            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition cursor-pointer"
            >
              <span>🖨️</span>
              {isBn ? "প্রিন্ট / PDF সংরক্ষণ" : "Print / Save as PDF"}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview Body */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-3 sm:p-6 flex justify-center">
          <div className="w-full max-w-[820px] rounded-lg bg-white p-6 sm:p-8 shadow-xl text-slate-900 border border-slate-200">
            <iframe
              srcDoc={html}
              title="Printable Statement Preview"
              className="h-[750px] w-full border-0 rounded"
              style={{ minHeight: "750px" }}
            />
          </div>
        </div>

        {/* Modal Footer Tips Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">💡 Tip:</span>
            <span>
              {isBn
                ? "প্রিন্ট ডায়ালগ ওপেন হলে Destination থেকে 'Save as PDF' সিলেক্ট করে পূর্ণাঙ্গ PDF সংরক্ষণ করুন।"
                : "Select 'Save as PDF' in the destination dropdown of the print dialog to export a certified PDF document."}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            {isBn ? "বন্ধ করুন" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}
