"use client";

import React, { useState } from "react";
import { usePwa } from "@/context/PwaContext";
import { useLanguage } from "@/context/LanguageContext";
import { AnimatePresence, motion } from "framer-motion";

interface AdminInstallAppButtonProps {
  variant?: "header" | "banner" | "login";
  className?: string;
}

export function AdminInstallAppButton({
  variant = "header",
  className = "",
}: AdminInstallAppButtonProps) {
  const { isStandalone, isIos, canInstall, promptInstall } = usePwa();
  const { isBn } = useLanguage();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running in standalone mode (already installed & opened as app), hide install triggers
  if (isStandalone) {
    if (variant === "header") {
      return (
        <span
          className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800"
          title={isBn ? "অ্যাডমিন অ্যাপ মোডে চালু আছে" : "Running in Installed App Mode"}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>{isBn ? "অ্যাপ মোড" : "App Mode"}</span>
        </span>
      );
    }
    return null;
  }

  if (variant === "banner" && isDismissed) {
    return null;
  }

  const handleClick = async () => {
    // If browser supports native automated prompt (Android / Chrome with deferred prompt)
    if (canInstall && !isIos) {
      await promptInstall();
      return;
    }
    // If iOS or desktop without automatic trigger, show visual guide modal
    setShowInfoModal(true);
  };

  return (
    <>
      {variant === "header" && (
        <button
          type="button"
          onClick={handleClick}
          title={isBn ? "অ্যাডমিন পোর্টাল অ্যাপ হিসেবে ইনস্টল করুন" : "Install STL Admin Portal as App"}
          className={`rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-emerald-900 hover:from-emerald-100 hover:to-teal-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${className}`}
        >
          <span>📲</span>
          <span className="font-semibold">{isBn ? "অ্যাডমিন অ্যাপ" : "Install App"}</span>
        </button>
      )}

      {variant === "banner" && (
        <div
          className={`relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3.5 sm:p-4 shadow-xs ${className}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs text-xl">
                🛡️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                    {isBn ? "অ্যাডমিন পোর্টাল অ্যাপ ইনস্টল করুন" : "Install STL Admin App"}
                  </h4>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Staff PWA
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isBn
                    ? "মোবাইল বা পিসিতে ১-ক্লিকে সরাসরি বুকিং অনুমোদন, পেমেন্ট ও রিপোর্ট ম্যানেজ করার জন্য অ্যাপটি ইনস্টল করুন।"
                    : "1-tap instant access to bookings, payments, inquiries, and financials directly from your home screen or desktop."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleClick}
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>📲</span>
                <span>{isBn ? "ইনস্টল করুন" : "Install Now"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title={isBn ? "বন্ধ করুন" : "Dismiss"}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {variant === "login" && (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center justify-center gap-2 cursor-pointer ${className}`}
        >
          <span>📲</span>
          <span>{isBn ? "অ্যাডমিন অ্যাপ হিসেবে ইনস্টল করুন" : "Install STL Admin on Device"}</span>
        </button>
      )}

      {/* Instructional Guide Modal for iOS & Desktop Fallback */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 text-left"
            >
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 h-7 w-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs text-xl">
                  🛡️
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    {isBn ? "সাভার ট্যুর লাভার অ্যাডমিন অ্যাপ" : "Savar Tour Lover — Admin Portal"}
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    {isIos
                      ? (isBn ? "আইফোন / আইপ্যাডে ইনস্টল করার নিয়ম" : "Install on iPhone / iPad")
                      : (isBn ? "ব্রাউজার থেকে ইনস্টল করার নির্দেশিকা" : "Desktop & Mobile Install Guide")}
                  </p>
                </div>
              </div>

              {isIos ? (
                /* iOS Safari instructions */
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-[10px] font-bold">
                      1
                    </span>
                    <p className="leading-snug">
                      {isBn ? (
                        <>
                          সাফারি ব্রাউজারের নিচে থাকা <strong>Share (শেয়ার)</strong>{" "}
                          <span className="inline-block px-1 bg-slate-200 rounded text-slate-700 font-mono">⎋</span> আইকনে চাপ দিন।
                        </>
                      ) : (
                        <>
                          Tap the <strong>Share</strong> button{" "}
                          <span className="inline-block px-1 bg-slate-200 rounded text-slate-700 font-mono">⎋</span> at the bottom of Safari.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-[10px] font-bold">
                      2
                    </span>
                    <p className="leading-snug">
                      {isBn ? (
                        <>
                          নিচের মেনু স্ক্রোল করে <strong>&quot;Add to Home Screen&quot; (হোম স্ক্রিনে যোগ করুন)</strong> এ ক্লিক করুন।
                        </>
                      ) : (
                        <>
                          Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-[10px] font-bold">
                      3
                    </span>
                    <p className="leading-snug">
                      {isBn ? (
                        <>
                          উপরে ডানে <strong>Add</strong> বাটনে ক্লিক করলেই আপনার ফোনে আলাদা অ্যাডমিন অ্যাপ হিসেবে ইনস্টল হয়ে যাবে।
                        </>
                      ) : (
                        <>
                          Tap <strong>Add</strong> in the top right corner. The STL Admin app will appear on your home screen.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                /* Chrome / Edge / Desktop instructions */
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                      A
                    </span>
                    <div className="leading-snug">
                      <strong className="text-slate-800">
                        {isBn ? "পদ্ধতি ১ (অ্যাড্রেস বার):" : "Method 1 (Address Bar):"}
                      </strong>{" "}
                      {isBn
                        ? "ব্রাউজারের অ্যাড্রেস বারের ডানপাশে থাকা 🖥️/⬇️ 'Install' আইকনে ক্লিক করে 'Install' নির্বাচন করুন।"
                        : "Click the 🖥️/⬇️ 'Install' icon located at the right side of your browser address bar and click Install."}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                      B
                    </span>
                    <div className="leading-snug">
                      <strong className="text-slate-800">
                        {isBn ? "পদ্ধতি ২ (ব্রাউজার মেনু):" : "Method 2 (Browser Menu):"}
                      </strong>{" "}
                      {isBn
                        ? "ব্রাউজারের উপরের ডানদিকের থ্রি-ডট (⋮) মেনু ওপেন করুন → 'Save and Share' বা 'Apps' → 'Install Savar Tour Lover — Admin Portal' এ ক্লিক করুন।"
                        : "Open the 3-dots (⋮) menu in Chrome/Edge → select 'Save and Share' or 'Cast, Save, and Share' → click 'Install Savar Tour Lover — Admin Portal'."}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  {isBn ? "ঠিক আছে, বুঝেছি" : "Got it"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
