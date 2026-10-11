"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { Tour } from "@/lib/types";

interface TourCardProps {
  tour: Tour;
  /** Show the discounted price; otherwise the starting price */
  showDiscount?: boolean;
}

export function TourCard({ tour, showDiscount = true }: TourCardProps) {
  const { t, formatPrice, formatNumber, isBn } = useLanguage();
  const original = tour.startingPrice;
  const final = Math.max(0, original - tour.discount);

  const displayDuration = isBn
    ? tour.duration
        .replace(/Days?/gi, "দিন")
        .replace(/Nights?/gi, "রাত")
        .replace(/\d+/g, (m) => formatNumber(Number(m)))
    : tour.duration;

  const displayCategory = isBn
    ? (() => {
        const cat = (tour.category || "").toLowerCase();
        if (cat.includes("package")) return "প্যাকেজ ট্যুর";
        if (cat.includes("group")) return "গ্রুপ ট্যুর";
        if (cat.includes("day")) return "ডে ট্যুর";
        if (cat.includes("weekend")) return "উইকেন্ড";
        if (cat.includes("adventure")) return "অ্যাডভেঞ্চার";
        if (cat.includes("honeymoon")) return "হানিমুন";
        if (cat.includes("heritage")) return "ঐতিহ্যবাহী";
        if (cat.includes("combo")) return "কম্বো";
        return tour.category;
      })()
    : tour.category;

  const displayDeparture = isBn
    ? (() => {
        const dep = (tour.departure || "").toLowerCase();
        if (dep.includes("dhaka")) return "ঢাকা থেকে যাত্রা";
        if (dep.includes("chattogram") || dep.includes("chittagong")) return "চট্টগ্রাম থেকে যাত্রা";
        if (dep.includes("savar")) return "সাভার থেকে যাত্রা";
        return `${tour.departure} থেকে`;
      })()
    : tour.departure;

  return (
    <GlassCard className="group flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl shadow-glass transition-shadow duration-300 hover:shadow-glass-lg">
      <Link href={`/tours/${tour.slug}`} className="flex flex-1 flex-col">
        <div className="relative">
          <SceneBackdrop
            scene={tour.cover}
            className="aspect-[16/10] transition-transform duration-700 ease-out group-hover:scale-105"
            showLabel={false}
          />
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 flex flex-col gap-1 sm:gap-2">
            <span className="rounded-full bg-ink/75 px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              {displayCategory}
            </span>
            {showDiscount && tour.discount > 0 && (
              <span className="rounded-full bg-coral/90 px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[11px] font-semibold text-white backdrop-blur">
                {t("card.save")} {formatPrice(tour.discount)}
              </span>
            )}
          </div>
        </div>

        <div className="glass glass-sweep flex flex-1 flex-col gap-1.5 sm:gap-3 rounded-b-2xl sm:rounded-b-3xl p-3 sm:p-5">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-medium text-ink-faint truncate">
            <span className="inline-flex items-center gap-1 shrink-0">
              <Icon name="clock" className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {displayDuration}
            </span>
            <span className="h-1 w-1 rounded-full bg-ink-faint/50 shrink-0" />
            <span className="inline-flex items-center gap-1 truncate">
              <Icon name="mapPin" className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">{displayDeparture}</span>
            </span>
            <span className="h-1 w-1 rounded-full bg-ink-faint/50 shrink-0" />
            <span className="inline-flex items-center gap-1 shrink-0 font-medium text-emerald-800">
              <Icon name="usersGroup" className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald" />
              <span>{isBn ? `${formatNumber(tour.total_seats || tour.capacity || 40)} আসন` : `${tour.total_seats || tour.capacity || 40} Seats`}</span>
            </span>
          </div>

          <h3 className="font-display text-xs sm:text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-emerald-deep line-clamp-2">
            {tour.title}
          </h3>
          <p className="hidden xs:line-clamp-1 sm:line-clamp-2 text-xs sm:text-sm leading-relaxed text-ink-soft">{tour.summary}</p>

          <div className="mt-auto flex items-end justify-between border-t border-white/60 pt-2 sm:pt-3">
            <div className="min-w-0 pr-1">
              {showDiscount && tour.discount > 0 ? (
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-[10px] sm:text-sm text-ink-faint line-through truncate">
                    {formatPrice(original)}
                  </span>
                  <span className="font-display text-sm sm:text-xl font-semibold text-emerald-deep">
                    {formatPrice(final)}
                  </span>
                </div>
              ) : (
                <span className="font-display text-sm sm:text-xl font-semibold text-emerald-deep">
                  {formatPrice(original)}
                </span>
              )}
              <span className="block text-[8px] sm:text-[11px] text-ink-faint truncate">
                {t("card.perPerson")} · {formatNumber(tour.advancePercent)}% {t("card.advanceBadge")}
              </span>
            </div>
            <motion.span
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-emerald/90 text-white"
            >
              <Icon name="arrowRight" className="h-3 w-3 sm:h-4 sm:w-4" />
            </motion.span>
          </div>
        </div>
      </Link>
    </GlassCard>
  );
}
