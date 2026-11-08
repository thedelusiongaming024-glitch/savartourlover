"use client";

import { useId } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { motion } from "framer-motion";

interface LanguageToggleProps {
  className?: string;
  variant?: "pill" | "subtle" | "compact" | "badge";
  showIcon?: boolean;
}

export function LanguageToggle({
  className = "",
  variant = "pill",
  showIcon = true,
}: LanguageToggleProps) {
  const { language, setLanguage, toggleLanguage, isBn } = useLanguage();
  const id = useId();

  // Compact one-click switch pill (e.g. for small headers or quick action)
  if (variant === "compact") {
    return (
      <button
        onClick={toggleLanguage}
        type="button"
        title={isBn ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
        aria-label="Toggle language between English and বাংলা"
        className={`group relative inline-flex items-center gap-1.5 rounded-full border border-emerald-950/10 bg-white/80 px-2.5 py-1 text-xs font-semibold text-emerald-950 shadow-2xs backdrop-blur-md transition-all hover:bg-white hover:border-emerald-950/20 active:scale-95 ${className}`}
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center text-emerald-700 transition-transform group-hover:rotate-12">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </span>
        <span className={!isBn ? "text-emerald-900 font-bold" : "text-slate-400 font-normal"}>
          EN
        </span>
        <span className="text-slate-300 font-light">/</span>
        <span className={`font-bengali ${isBn ? "text-emerald-900 font-bold" : "text-slate-400 font-normal"}`}>
          বাং
        </span>
      </button>
    );
  }

  // Expanded badge variant with full language names
  if (variant === "badge") {
    return (
      <div
        role="group"
        aria-label="Language selection / ভাষা নির্বাচন"
        className={`relative inline-flex items-center rounded-full bg-slate-900/[0.05] p-1 text-xs font-medium border border-slate-900/[0.08] backdrop-blur-md ${className}`}
      >
        <button
          type="button"
          onClick={() => setLanguage("en")}
          aria-pressed={!isBn}
          className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 active:scale-95 ${
            !isBn ? "text-emerald-950" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {!isBn && (
            <motion.span
              layoutId={`lang-pill-${id}`}
              className="absolute inset-0 rounded-full bg-white shadow-xs border border-emerald-900/10"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>🇬🇧</span>
            <span>English</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage("bn")}
          aria-pressed={isBn}
          className={`relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold font-bengali transition-colors duration-200 active:scale-95 ${
            isBn ? "text-emerald-950 font-bold" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {isBn && (
            <motion.span
              layoutId={`lang-pill-${id}`}
              className="absolute inset-0 rounded-full bg-white shadow-xs border border-emerald-900/10"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>🇧🇩</span>
            <span>বাংলা</span>
          </span>
        </button>
      </div>
    );
  }

  // Default sleek segmented pill (used in Navbar, Footer, and Page headers)
  return (
    <div
      role="group"
      aria-label="Language selection / ভাষা নির্বাচন"
      title="Switch language / ভাষা পরিবর্তন করুন"
      className={`group relative inline-flex items-center rounded-full bg-slate-900/[0.05] hover:bg-slate-900/[0.08] dark:bg-white/[0.07] p-0.5 text-xs border border-slate-900/[0.08] dark:border-white/[0.12] shadow-2xs backdrop-blur-md transition-all ${className}`}
    >
      {/* Globe Icon */}
      {showIcon && (
        <span
          className="pl-1.5 pr-0.5 text-slate-500 group-hover:text-emerald-800 transition-colors pointer-events-none select-none"
          aria-hidden="true"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </span>
      )}

      {/* English Pill */}
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={!isBn}
        className={`relative z-10 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors duration-200 active:scale-95 ${
          !isBn
            ? "text-emerald-950 font-bold"
            : "text-slate-600 hover:text-slate-950"
        }`}
      >
        {!isBn && (
          <motion.span
            layoutId={`lang-pill-${id}`}
            className="absolute inset-0 rounded-full bg-white shadow-xs border border-emerald-900/10"
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />
        )}
        <span className="relative z-10">EN</span>
      </button>

      {/* Bengali Pill */}
      <button
        type="button"
        onClick={() => setLanguage("bn")}
        aria-pressed={isBn}
        className={`relative z-10 rounded-full px-2.5 py-1 text-xs transition-colors duration-200 active:scale-95 font-bengali ${
          isBn
            ? "text-emerald-950 font-bold"
            : "text-slate-600 hover:text-slate-950 font-medium"
        }`}
      >
        {isBn && (
          <motion.span
            layoutId={`lang-pill-${id}`}
            className="absolute inset-0 rounded-full bg-white shadow-xs border border-emerald-900/10"
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />
        )}
        <span className="relative z-10">বাং</span>
      </button>
    </div>
  );
}
