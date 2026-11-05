"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePwa } from "@/context/PwaContext";
import { useLanguage } from "@/context/LanguageContext";

export function IosInstallModal() {
  const { showIosModal, setShowIosModal } = usePwa();
  const { isBn } = useLanguage();

  if (!showIosModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-ink/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-emerald-100"
        >
          <button
            onClick={() => setShowIosModal(false)}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-lg font-bold"
            aria-label="Close"
          >
            ×
          </button>

          <div className="flex items-center gap-3 mb-4">
            <img
              src="/android-chrome-192x192.png"
              alt="Savar Tour Lover"
              className="h-12 w-12 rounded-2xl shadow-md border border-slate-100"
            />
            <div>
              <h3 className="font-display font-semibold text-ink text-base">
                {isBn ? "সাভার ট্যুর লাভার অ্যাপ" : "Savar Tour Lover App"}
              </h3>
              <p className="text-xs text-emerald font-medium">
                {isBn ? "আইফোনে ইনস্টল করার নিয়ম" : "Install on your iPhone / iPad"}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-ink-soft">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald text-white text-[10px] font-bold">
                1
              </span>
              <p className="leading-snug">
                {isBn ? (
                  <>
                    সাফারি ব্রাউজারের নিচে থাকা <strong>Share (শেয়ার)</strong>{" "}
                    <span className="inline-block px-1 bg-slate-200 rounded text-slate-700">⎋</span> আইকনে চাপ দিন।
                  </>
                ) : (
                  <>
                    Tap the <strong>Share</strong> button{" "}
                    <span className="inline-block px-1 bg-slate-200 rounded text-slate-700">⎋</span> at the bottom of Safari.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald text-white text-[10px] font-bold">
                2
              </span>
              <p className="leading-snug">
                {isBn ? (
                  <>
                    একটু নিচে স্ক্রল করে <strong>&quot;Add to Home Screen&quot; (হোম স্ক্রিনে যোগ করুন)</strong> ➕ অপশনে চাপ দিন।
                  </>
                ) : (
                  <>
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong> ➕.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald text-white text-[10px] font-bold">
                3
              </span>
              <p className="leading-snug">
                {isBn ? (
                  <>
                    উপরে ডান কোনায় <strong>&quot;Add&quot;</strong> এ চাপ দিন। অ্যাপটি আপনার ফোনে ইনস্টল হয়ে যাবে!
                  </>
                ) : (
                  <>
                    Tap <strong>&quot;Add&quot;</strong> in the top right corner. The app will be installed on your Home screen!
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowIosModal(false)}
            className="mt-5 w-full py-2.5 rounded-xl bg-emerald hover:bg-emerald-deep text-white font-semibold text-xs tracking-wide transition shadow-md"
          >
            {isBn ? "বুঝেছি" : "Got It"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
