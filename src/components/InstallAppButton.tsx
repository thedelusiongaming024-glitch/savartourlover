"use client";

import React from "react";
import { usePwa } from "@/context/PwaContext";
import { useLanguage } from "@/context/LanguageContext";

interface InstallAppButtonProps {
  variant?: "navbar" | "drawer" | "footer" | "card";
  className?: string;
  onClickCustom?: () => void;
}

export function InstallAppButton({
  variant = "navbar",
  className = "",
  onClickCustom,
}: InstallAppButtonProps) {
  const { isInstalled, isStandalone, promptInstall } = usePwa();
  const { isBn } = useLanguage();

  // If already opened as a standalone app, don't show install buttons
  if (isStandalone || isInstalled) return null;

  const handleClick = async () => {
    if (onClickCustom) onClickCustom();
    await promptInstall();
  };

  if (variant === "drawer") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-4 py-3 text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-lg">
            📲
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight">
              {isBn ? "অ্যাপ ইনস্টল করুন" : "Install Mobile App"}
            </div>
            <div className="text-[11px] text-emerald-100 font-normal">
              {isBn ? "সহজ কিস্তি ও বুকিং ট্র্যাকিং" : "1-tap bookings & offline tickets"}
            </div>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
          {isBn ? "ইনস্টল" : "Install"}
        </span>
      </button>
    );
  }

  if (variant === "footer") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/60 px-3.5 py-2 text-xs font-semibold text-emerald-900 transition-all hover:bg-emerald-100 hover:border-emerald-500/60 ${className}`}
      >
        <span className="text-sm">📲</span>
        <span>{isBn ? "আমাদের অ্যাপ ইনস্টল করুন" : "Install Mobile App"}</span>
      </button>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 p-4 sm:p-5 shadow-xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/android-chrome-192x192.png"
              alt="Savar Tour Lover"
              className="h-12 w-12 rounded-xl shadow-xs border border-emerald-100 shrink-0"
            />
            <div>
              <h4 className="font-display text-sm sm:text-base font-semibold text-ink">
                {isBn ? "সাভার ট্যুর লাভার মোবাইল অ্যাপ" : "Savar Tour Lover Mobile App"}
              </h4>
              <p className="text-xs text-ink-soft">
                {isBn
                  ? "১ ক্লিকে বুকিং, ইনস্ট্যান্ট কিউআর টিকেট ও অফলাইন অ্যাক্সেস"
                  : "Instant 1-tap booking, offline QR tickets & exclusive app discounts"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="btn btn-emerald !py-2.5 !px-4 text-xs font-semibold shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>📲</span>
            <span>{isBn ? "ইনস্টল করুন" : "Install App"}</span>
          </button>
        </div>
      </div>
    );
  }

  // Default: navbar pill
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Install Savar Tour Lover App"
      className={`hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-all hover:bg-emerald-100 hover:border-emerald-600/60 active:scale-95 ${className}`}
    >
      <span>📲</span>
      <span>{isBn ? "অ্যাপ" : "App"}</span>
    </button>
  );
}
