"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Icon } from "@/components/Icon";
import { normalizeImageUrl } from "@/lib/media";
import { useLanguage } from "@/context/LanguageContext";
import type { Offer } from "@/lib/types";

interface OfferCardProps {
  offer: Offer;
}

export function OfferCard({ offer }: OfferCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const banner = normalizeImageUrl(offer.bannerUrl);
  const { isBn, formatNumber } = useLanguage();

  const formattedExpiry = isBn && offer.expiry
    ? offer.expiry
        .replace(/Expires\s*/gi, "মেয়াদ: ")
        .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi, (m) => {
          const map: Record<string, string> = {
            Jan: "জানু", Feb: "ফেব্রু", Mar: "মার্চ", Apr: "এপ্রিল",
            May: "মে", Jun: "জুন", Jul: "জুলাই", Aug: "আগস্ট",
            Sep: "সেপ্টে", Oct: "অক্টো", Nov: "নভে", Dec: "ডিসে",
          };
          return map[m] || m;
        })
        .replace(/\d+/g, (n) => formatNumber(n))
    : offer.expiry;

  return (
    <GlassCard
      lift={6}
      className="glass glass-sweep flex h-full flex-col overflow-hidden rounded-3xl shadow-glass transition-shadow duration-300 hover:shadow-glass-lg"
    >
      {banner && !imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner}
          alt={offer.title}
          className="h-36 w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3 py-1 text-xs font-semibold text-coral">
            <motion.span
              animate={{ rotate: [0, 14, -14, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon name="sparkle" className="h-3.5 w-3.5" />
            </motion.span>
            {offer.badge}
          </span>
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
          {offer.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
          {offer.description}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <div className="inline-flex items-center justify-between gap-2 rounded-xl border border-dashed border-gold/50 bg-gold/5 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {isBn ? "কোড" : "Code"}
              </span>
              <span className="font-mono text-sm font-bold tracking-wide text-gold">
                {offer.code}
              </span>
            </div>
            {offer.tour_title ? (
              <span
                className="rounded-md bg-emerald-100/90 px-2 py-0.5 text-[10px] font-medium text-emerald-900 border border-emerald-300/80 truncate max-w-[150px]"
                title={`Valid only for: ${offer.tour_title}`}
              >
                🎯 {offer.tour_title}
              </span>
            ) : (
              <span className="rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                🌐 {isBn ? "সকল ট্যুর" : "All Tours"}
              </span>
            )}
          </div>
          <span className="text-[11px] text-ink-faint">{formattedExpiry}</span>
        </div>
      </div>
    </GlassCard>
  );
}
