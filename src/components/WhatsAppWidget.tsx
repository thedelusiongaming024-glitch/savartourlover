"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export function WhatsAppWidget() {
  const pathname = usePathname();
  const { isBn } = useLanguage();

  // Hide widget inside the staff management dashboard
  if (pathname?.startsWith("/staff")) {
    return null;
  }

  const whatsappUrl = "https://wa.me/8801646325350";
  const tooltipText = isBn ? "হোয়াটসঅ্যাপে কথা বলুন" : "Chat on WhatsApp";
  const ariaLabel = isBn
    ? "সাভার ট্যুর লাভার হোয়াটসঅ্যাপে চ্যাট করুন"
    : "Chat with Savar Tour Lover on WhatsApp";

  return (
    <aside
      aria-label="WhatsApp Support"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center group select-none pointer-events-auto"
    >
      {/* Expandable tooltip on hover / focus */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-full"
      >
        <span
          className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/95 text-slate-800 text-xs font-semibold shadow-lg border border-slate-200/80 backdrop-blur-xs transform transition-all duration-300 opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 pointer-events-none"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2" />
          {tooltipText}
        </span>

        {/* WhatsApp Icon Circle Button */}
        <div className="relative flex items-center justify-center h-13 w-13 sm:h-14 sm:w-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-950/25 transition-all duration-300 ease-out hover:scale-110 active:scale-95 hover:bg-[#20bd5a] hover:shadow-xl hover:shadow-[#25D366]/40 cursor-pointer">
          {/* Subtle pulse ring behind button */}
          <span className="absolute -inset-1 rounded-full bg-[#25D366]/35 animate-ping -z-10 group-hover:animate-none" />

          {/* Online indicator badge */}
          <span className="absolute top-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white" />

          {/* Official WhatsApp SVG Vector */}
          <svg
            className="w-7 h-7 sm:w-8 sm:h-8 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.43 1.03 2.6.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.31z" />
          </svg>
        </div>
      </a>
    </aside>
  );
}
