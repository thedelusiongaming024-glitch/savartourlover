"use client";

import { useState, useEffect } from "react";
import { staffFetch } from "@/lib/staffAuth";
import type { SeoSettings } from "@/server/types";
import { DEFAULT_BANGLADESH_SEO_KEYWORDS } from "@/data/seo";

interface AdminSeoManagerProps {
  showNotification: (type: "success" | "error", message: string) => void;
}

export function AdminSeoManager({ showNotification }: AdminSeoManagerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seo, setSeo] = useState<SeoSettings | null>(null);

  // SERP preview state
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewLang, setPreviewLang] = useState<"en" | "bn">("en");

  // Page override tab
  const [activeOverridePage, setActiveOverridePage] = useState<"home" | "tours" | "destinations" | "journal" | "about" | "contact">("home");

  // Keyword input
  const [newKeywordInput, setNewKeywordInput] = useState("");

  useEffect(() => {
    fetchSeo();
  }, []);

  async function fetchSeo() {
    setLoading(true);
    try {
      const res = await staffFetch("/admin/seo");
      if (res.ok) {
        const data = await res.json();
        setSeo(data);
      } else {
        showNotification("error", "Failed to load SEO configuration.");
      }
    } catch {
      showNotification("error", "Error connecting to SEO server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!seo) return;
    setSaving(true);
    try {
      const res = await staffFetch("/admin/seo", {
        method: "PUT",
        body: JSON.stringify(seo),
      });

      if (res.ok) {
        showNotification("success", "SEO configurations saved and published live across Bangladesh!");
        const updated = await res.json();
        if (updated?.seo) {
          setSeo(updated.seo as SeoSettings);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification("error", err.detail || "Failed to save SEO settings.");
      }
    } catch {
      showNotification("error", "Error saving SEO configuration.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddKeyword() {
    if (!seo) return;
    const trimmed = newKeywordInput.trim();
    if (!trimmed) return;
    if (seo.keywords.includes(trimmed)) {
      setNewKeywordInput("");
      return;
    }
    setSeo({
      ...seo,
      keywords: [...seo.keywords, trimmed],
    });
    setNewKeywordInput("");
  }

  function handleRemoveKeyword(indexToRemove: number) {
    if (!seo) return;
    setSeo({
      ...seo,
      keywords: seo.keywords.filter((_, i) => i !== indexToRemove),
    });
  }

  function handleLoadTrendingBangladeshKeywords() {
    if (!seo) return;
    const currentSet = new Set(seo.keywords);
    const merged = [...seo.keywords];
    let addedCount = 0;

    for (const kw of DEFAULT_BANGLADESH_SEO_KEYWORDS) {
      if (!currentSet.has(kw)) {
        merged.push(kw);
        currentSet.add(kw);
        addedCount++;
      }
    }

    setSeo({
      ...seo,
      keywords: merged,
    });
    showNotification("success", `Added ${addedCount} top Bangladesh ranking keywords.`);
  }

  function handleSetSavarCoordinates() {
    if (!seo) return;
    setSeo({
      ...seo,
      geo_region: "BD-13",
      geo_placename: "Savar, Dhaka, Bangladesh",
      geo_latitude: "23.8583",
      geo_longitude: "90.2667",
      office_address_en: "Savar Pollibidut, Kobarsthan Road, Savar, Dhaka 1340, Bangladesh",
      office_address_bn: "সাভার পল্লীবিদ্যুৎ, কবরস্থান রোড, সাভার, ঢাকা ১৩৪০",
    });
    showNotification("success", "Geo coordinates and local address set to Savar, Dhaka.");
  }

  // Sanitize verification codes if user pasted full meta tag
  function cleanMetaCode(raw: string): string {
    const trimmed = raw.trim();
    const contentMatch = trimmed.match(/content=["']([^"']+)["']/i);
    if (contentMatch) return contentMatch[1];
    return trimmed;
  }

  if (loading || !seo) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm animate-pulse">
        <div className="text-3xl mb-3">🔍</div>
        <p className="text-sm font-medium">Loading SEO & Bangladesh Ranking Engine…</p>
      </div>
    );
  }

  // Active preview values
  const currentTitle =
    previewLang === "bn"
      ? seo.site_title_bn || seo.site_title
      : seo.site_title;

  const currentDesc =
    previewLang === "bn"
      ? seo.meta_description_bn || seo.meta_description
      : seo.meta_description;

  const titleLength = currentTitle.length;
  const descLength = currentDesc.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Status */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Google Bangladesh (#1 Ranking Engine)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              SEO & Search Engine Domination
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Target high-intent domestic travelers searching in Bangladesh on Google (google.com.bd).
              Manage bilingual meta tags, Rich JSON-LD Schemas, Savar/Dhaka Local SEO, and Webmaster verification codes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition backdrop-blur-xs"
            >
              <span>📄 /sitemap.xml</span>
              <span className="text-emerald-300">↗</span>
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition backdrop-blur-xs"
            >
              <span>🤖 /robots.txt</span>
              <span className="text-emerald-300">↗</span>
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 text-xs font-bold shadow-lg shadow-emerald-500/30 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save All SEO Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= 1. LIVE GOOGLE SERP SIMULATOR ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <h3 className="text-base font-bold text-slate-900">
                Google Bangladesh Live SERP Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time Google search snippet preview for Savar Tour Lover on google.com.bd
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Device Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  previewDevice === "desktop"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🖥️ Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  previewDevice === "mobile"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📱 Mobile
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewLang("en")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  previewLang === "en"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang("bn")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  previewLang === "bn"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🇧🇩 বাংলা
              </button>
            </div>
          </div>
        </div>

        {/* The Google Box */}
        <div className="mt-6 flex justify-center">
          <div
            className={`w-full transition-all duration-300 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs ${
              previewDevice === "mobile" ? "max-w-md border-slate-300 shadow-md" : "max-w-2xl"
            }`}
          >
            {/* Google Breadcrumbs & Favicon */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                S
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-900 truncate">
                  {seo.business_name_en || "Savar Tour Lover"}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {seo.canonical_base_url || "https://savartourlover.com"} › tours
                </div>
              </div>
            </div>

            {/* Clickable Title */}
            <div className="mt-2">
              <h4 className="text-base sm:text-lg font-normal text-blue-800 hover:underline cursor-pointer leading-snug line-clamp-2">
                {currentTitle}
              </h4>
            </div>

            {/* Snippet Description */}
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
              {currentDesc}
            </p>

            {/* Rich Snippets / Google Sitelinks Simulator */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span>★★★★★</span>
                <span>4.9 (128+)</span>
              </span>
              <span>·</span>
              <span className="font-medium text-slate-700">
                Price: {seo.price_range || "৳৳"} (40% Advance)
              </span>
              <span>·</span>
              <span className="text-emerald-700 font-medium">
                📍 {seo.geo_placename || "Savar, Dhaka"}
              </span>
            </div>
          </div>
        </div>

        {/* Meters */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">
              Title Length: <strong className="text-slate-900">{titleLength}</strong> chars
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                titleLength >= 40 && titleLength <= 65
                  ? "bg-emerald-100 text-emerald-800"
                  : titleLength > 65
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {titleLength >= 40 && titleLength <= 65
                ? "✓ Optimal (40-65)"
                : titleLength > 65
                ? "⚠️ May truncate on mobile (>65)"
                : "A bit short (<40)"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">
              Meta Description: <strong className="text-slate-900">{descLength}</strong> chars
            </span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                descLength >= 120 && descLength <= 165
                  ? "bg-emerald-100 text-emerald-800"
                  : descLength > 165
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {descLength >= 120 && descLength <= 165
                ? "✓ Optimal (120-165)"
                : descLength > 165
                ? "⚠️ May truncate on Google (>165)"
                : "A bit short (<120)"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 2. GLOBAL METADATA & BENGALI TARGETING ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-xl">🏷️</span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Global Meta Tags & Canonical Base
            </h3>
            <p className="text-xs text-slate-500">
              Bilingual titles, meta descriptions, and robots indexing controls.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Site Title (English) */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Site Title (English) *
            <input
              type="text"
              value={seo.site_title}
              onChange={(e) => setSeo({ ...seo, site_title: e.target.value })}
              placeholder="Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন | Best Bangladesh Tour Packages"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          {/* Site Title (Bengali) */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Site Title (Bengali / বাংলা) *
            <input
              type="text"
              value={seo.site_title_bn || ""}
              onChange={(e) => setSeo({ ...seo, site_title_bn: e.target.value })}
              placeholder="সাভার ট্যুর লাভার — আপনার স্বপ্ন উড়তে দিন | সেরা বাংলাদেশ ট্যুর প্যাকেজ"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Title Template */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Title Template (Sub-pages)
            <input
              type="text"
              value={seo.title_template}
              onChange={(e) => setSeo({ ...seo, title_template: e.target.value })}
              placeholder="%s | Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <span className="text-[11px] font-normal text-slate-400">
              Use %s where page title is inserted (e.g., &ldquo;Sajek Valley Tour | Savar Tour Lover&rdquo;)
            </span>
          </label>

          {/* Canonical Base URL */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Canonical Base URL *
            <input
              type="url"
              value={seo.canonical_base_url}
              onChange={(e) => setSeo({ ...seo, canonical_base_url: e.target.value })}
              placeholder="https://savartourlover.com"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <span className="text-[11px] font-normal text-slate-400">
              Prevents duplicate content penalties; used for sitemaps and OpenGraph tags.
            </span>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Meta Description (English) */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Meta Description (English) *
            <textarea
              rows={3}
              value={seo.meta_description}
              onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          {/* Meta Description (Bengali) */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Meta Description (Bengali / বাংলা)
            <textarea
              rows={3}
              value={seo.meta_description_bn || ""}
              onChange={(e) => setSeo({ ...seo, meta_description_bn: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>

        {/* Indexing Checkboxes */}
        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={seo.robots_index}
              onChange={(e) => setSeo({ ...seo, robots_index: e.target.checked })}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 h-4 w-4"
            />
            <span>Allow Search Engines to Index this Site (index)</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={seo.robots_follow}
              onChange={(e) => setSeo({ ...seo, robots_follow: e.target.checked })}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 h-4 w-4"
            />
            <span>Allow Search Engines to Follow Links (follow)</span>
          </label>
        </div>
      </div>

      {/* ================= 3. BANGLADESH TARGET KEYWORDS MANAGER ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bangladesh High-Intent Target Keywords ({seo.keywords.length})
              </h3>
              <p className="text-xs text-slate-500">
                Keywords injected into HTML headers and schemas to rank for domestic travel searches.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoadTrendingBangladeshKeywords}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer shrink-0"
          >
            <span>✨</span>
            <span>Load Top Bangladesh Travel Keywords</span>
          </button>
        </div>

        {/* Add keyword input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newKeywordInput}
            onChange={(e) => setNewKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddKeyword();
              }
            }}
            placeholder="Type a keyword (e.g., 'সাজেক ভ্রমণ প্যাকেজ' or 'Coxs Bazar luxury tour') and press Enter..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            + Add
          </button>
        </div>

        {/* Keywords Pill List */}
        <div className="flex flex-wrap gap-2 pt-1 max-h-60 overflow-y-auto p-1">
          {seo.keywords.map((kw, idx) => (
            <span
              key={`${kw}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200/80 transition"
            >
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(idx)}
                className="text-slate-400 hover:text-rose-600 transition text-sm leading-none cursor-pointer"
                title="Remove keyword"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* ================= 4. WEBMASTER VERIFICATION & TRACKING ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-xl">🛡️</span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Webmaster Verification & Analytics
            </h3>
            <p className="text-xs text-slate-500">
              Connect Google Search Console, Bing Webmaster, and visitor analytics.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Google Search Console */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Google Site Verification Code (Google Search Console)
            <input
              type="text"
              value={seo.google_site_verification || ""}
              onChange={(e) =>
                setSeo({ ...seo, google_site_verification: cleanMetaCode(e.target.value) })
              }
              placeholder="e.g. google-site-verification code from Google Console"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
            />
            <span className="text-[11px] font-normal text-slate-400">
              Injected as &lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt;
            </span>
          </label>

          {/* Bing Webmaster */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Bing Webmaster Verification (msvalidate.01)
            <input
              type="text"
              value={seo.bing_site_verification || ""}
              onChange={(e) =>
                setSeo({ ...seo, bing_site_verification: cleanMetaCode(e.target.value) })
              }
              placeholder="e.g. msvalidate.01 code"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Google Analytics 4 */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Google Analytics 4 (GA4) Measurement ID
            <input
              type="text"
              value={seo.google_analytics_id || ""}
              onChange={(e) => setSeo({ ...seo, google_analytics_id: e.target.value.trim() })}
              placeholder="G-XXXXXXXXXX"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
            />
            <span className="text-[11px] font-normal text-slate-400">
              Automatically injects the official Google gtag.js tag onto all visitor pages.
            </span>
          </label>

          {/* Meta Pixel */}
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Meta / Facebook Pixel ID
            <input
              type="text"
              value={seo.facebook_pixel_id || ""}
              onChange={(e) => setSeo({ ...seo, facebook_pixel_id: e.target.value.trim() })}
              placeholder="e.g. 123456789012345"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
            />
            <span className="text-[11px] font-normal text-slate-400">
              Tracks visitor pageviews and conversions for Facebook and Instagram ad campaigns.
            </span>
          </label>
        </div>
      </div>

      {/* ================= 5. LOCAL SEO & GEO TARGETING ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Local SEO & Bangladesh Geo Signals
              </h3>
              <p className="text-xs text-slate-500">
                Enables ranking in Google Local 3-Pack and Maps for searches like &ldquo;travel agency in Savar&rdquo; or &ldquo;Dhaka tour agency&rdquo;.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSetSavarCoordinates}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <span>📍</span>
            <span>Reset to Savar, Dhaka Coordinates</span>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Brand Legal / English Name *
            <input
              type="text"
              value={seo.business_name_en}
              onChange={(e) => setSeo({ ...seo, business_name_en: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Brand Bengali Name (বাংলা) *
            <input
              type="text"
              value={seo.business_name_bn}
              onChange={(e) => setSeo({ ...seo, business_name_bn: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Geo Region *
            <input
              type="text"
              value={seo.geo_region}
              onChange={(e) => setSeo({ ...seo, geo_region: e.target.value })}
              placeholder="BD-13 (Dhaka Division)"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Geo Placename *
            <input
              type="text"
              value={seo.geo_placename}
              onChange={(e) => setSeo({ ...seo, geo_placename: e.target.value })}
              placeholder="Savar, Dhaka, Bangladesh"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Latitude (N) *
            <input
              type="text"
              value={seo.geo_latitude}
              onChange={(e) => setSeo({ ...seo, geo_latitude: e.target.value })}
              placeholder="23.8583"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Longitude (E) *
            <input
              type="text"
              value={seo.geo_longitude}
              onChange={(e) => setSeo({ ...seo, geo_longitude: e.target.value })}
              placeholder="90.2667"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Office Address (English) *
            <input
              type="text"
              value={seo.office_address_en}
              onChange={(e) => setSeo({ ...seo, office_address_en: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Office Address (Bengali / বাংলা)
            <input
              type="text"
              value={seo.office_address_bn}
              onChange={(e) => setSeo({ ...seo, office_address_bn: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Official Hotline Phone *
            <input
              type="text"
              value={seo.contact_phone}
              onChange={(e) => setSeo({ ...seo, contact_phone: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Contact Email *
            <input
              type="email"
              value={seo.contact_email}
              onChange={(e) => setSeo({ ...seo, contact_email: e.target.value })}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Opening Hours
            <input
              type="text"
              value={seo.opening_hours}
              onChange={(e) => setSeo({ ...seo, opening_hours: e.target.value })}
              placeholder="Mo-Su 00:00-23:59"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>
      </div>

      {/* ================= 6. SOCIAL MEDIA & OPEN GRAPH ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-xl">🌐</span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Social Profiles & OpenGraph Share Cards
            </h3>
            <p className="text-xs text-slate-500">
              How links look when shared on WhatsApp, Facebook, and Twitter.
            </p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
          Default Social Share Image URL (og:image)
          <input
            type="text"
            value={seo.default_og_image}
            onChange={(e) => setSeo({ ...seo, default_og_image: e.target.value })}
            placeholder="/images/logo-badge.png or full https://..."
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Facebook Page URL
            <input
              type="url"
              value={seo.facebook_url || ""}
              onChange={(e) => setSeo({ ...seo, facebook_url: e.target.value })}
              placeholder="https://facebook.com/savartourlover"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Instagram URL
            <input
              type="url"
              value={seo.instagram_url || ""}
              onChange={(e) => setSeo({ ...seo, instagram_url: e.target.value })}
              placeholder="https://instagram.com/savartourlover"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            YouTube Channel URL
            <input
              type="url"
              value={seo.youtube_url || ""}
              onChange={(e) => setSeo({ ...seo, youtube_url: e.target.value })}
              placeholder="https://youtube.com/@savartourlover"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Twitter / X Handle
            <input
              type="text"
              value={seo.twitter_handle || ""}
              onChange={(e) => setSeo({ ...seo, twitter_handle: e.target.value })}
              placeholder="@savartourlover"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>
      </div>

      {/* ================= 7. PER-PAGE SEO OVERRIDES ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <span className="text-xl">📑</span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Per-Page SEO Overrides
            </h3>
            <p className="text-xs text-slate-500">
              Customize title and meta description for individual core sections.
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
          {(
            [
              { id: "home", label: "Homepage (/)" },
              { id: "tours", label: "Tours Catalog (/tours)" },
              { id: "destinations", label: "Destinations (/destinations)" },
              { id: "journal", label: "Travel Journal (/journal)" },
              { id: "about", label: "About Us (/about)" },
              { id: "contact", label: "Contact Us (/contact)" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveOverridePage(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                activeOverridePage === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Override Inputs */}
        <div className="space-y-4 pt-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Custom Page Title
            <input
              type="text"
              value={seo.pages?.[activeOverridePage]?.title || ""}
              onChange={(e) =>
                setSeo({
                  ...seo,
                  pages: {
                    ...(seo.pages || {}),
                    [activeOverridePage]: {
                      ...(seo.pages?.[activeOverridePage] || {}),
                      title: e.target.value,
                    },
                  },
                })
              }
              placeholder="Leave blank to use default template"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Custom Meta Description
            <textarea
              rows={3}
              value={seo.pages?.[activeOverridePage]?.description || ""}
              onChange={(e) =>
                setSeo({
                  ...seo,
                  pages: {
                    ...(seo.pages || {}),
                    [activeOverridePage]: {
                      ...(seo.pages?.[activeOverridePage] || {}),
                      description: e.target.value,
                    },
                  },
                })
              }
              placeholder="Leave blank to use global description"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </label>
        </div>
      </div>

      {/* ================= BOTTOM STICKY SAVE BAR ================= */}
      <div className="sticky bottom-4 z-40 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-4 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>SEO settings auto-sync to local database and Supabase PostgreSQL.</span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <span className="animate-spin text-sm">⏳</span>
              <span>Publishing SEO changes…</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Publish SEO Changes Live</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
