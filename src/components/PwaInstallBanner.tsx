"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePwa } from "@/context/PwaContext";
import { useLanguage } from "@/context/LanguageContext";
import { usePathname } from "next/navigation";

export function PwaInstallBanner() {
  const { isInstalled, isStandalone, isBannerDismissed, promptInstall, dismissBanner } = usePwa();
  const { isBn } = useLanguage();
  const pathname = usePathname();
  const [delayedVisible, setDelayedVisible] = useState(false);

  // Delay showing the banner by 2.5s so initial page navigation is uninterrupted
  useEffect(() => {
    if (isInstalled || isStandalone || isBannerDismissed) {
      setDelayedVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setDelayedVisible(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isInstalled, isStandalone, isBannerDismissed]);

  // Don't show on admin staff dashboard or payment gateway screens
  if (pathname?.startsWith("/staff") || pathname?.startsWith("/payments")) {
    return null;
  }

  if (isInstalled || isStandalone || isBannerDismissed || !delayedVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Install Savar Tour Lover App"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-3 inset-x-3 z-40 mx-auto max-w-md sm:bottom-4 sm:right-4 sm:left-auto"
      >
        <div className="glass-strong flex items-center justify-between gap-3 rounded-2xl p-3 shadow-2xl border border-emerald-400/40 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/android-chrome-192x192.png"
              alt="Savar Tour Lover"
              className="h-10 w-10 rounded-xl shadow-xs border border-emerald-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs font-bold text-ink truncate">
                  {isBn ? "সাভার ট্যুর লাভার" : "Savar Tour Lover"}
                </span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                  App
                </span>
              </div>
              <p className="text-[11px] text-ink-soft truncate leading-tight">
                {isBn ? "১ ক্লিকে ইনস্টল করুন ও টিকিট দেখুন" : "Install app for 1-tap fast booking"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={promptInstall}
              className="btn btn-emerald !py-1.5 !px-3 text-xs font-semibold shadow-xs flex items-center gap-1"
            >
              <span>📲</span>
              <span>{isBn ? "ইনস্টল" : "Install"}</span>
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss banner"
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
