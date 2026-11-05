"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { Destination } from "@/lib/types";

interface DestinationCardProps {
  destination: Destination;
}

export function DestinationCard({ destination }: DestinationCardProps) {
  const { isBn } = useLanguage();
  const primaryName = isBn && destination.bn ? destination.bn : destination.name;
  const secondaryName = isBn && destination.bn ? destination.name : destination.bn;

  return (
    <GlassCard className="group relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-glass transition-shadow duration-300 hover:shadow-glass-lg">
      <Link href={`/destinations/${destination.slug}`} className="block">
        <SceneBackdrop
          scene={destination.cover}
          className="aspect-[4/5] transition-transform duration-700 ease-out group-hover:scale-105"
          showLabel={false}
        />

        {/* Glass info bar */}
        <div className="glass glass-sweep absolute inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3 flex items-end justify-between rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
          <div className="min-w-0 pr-1">
            <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint truncate block">
              {destination.region}
            </span>
            <h3 className="font-display text-xs sm:text-lg font-semibold leading-tight text-ink truncate">
              {primaryName}
            </h3>
            {secondaryName && (
              <span className="text-[10px] sm:text-xs text-ink-faint truncate block">{secondaryName}</span>
            )}
          </div>
          <motion.span
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-emerald/90 text-white"
          >
            <Icon name="arrowRight" className="h-3 w-3 sm:h-4 sm:w-4" />
          </motion.span>
        </div>
      </Link>
    </GlassCard>
  );
}
