"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface ToursCategoryBarProps {
  categories: string[];
  activeCategory: string;
}

const BENGALI_CATEGORIES: Record<string, string> = {
  All: "সব",
  "Group Tour": "গ্রুপ ট্যুর",
  Weekend: "উইকেন্ড",
  Adventure: "অ্যাডভেঞ্চার",
  Honeymoon: "হানিমুন",
  Heritage: "ঐতিহ্যবাহী",
  "Combo Tour": "কম্বো ট্যুর",
  "Day Trip": "ডে ট্রিপ",
};

export function ToursCategoryBar({ categories, activeCategory }: ToursCategoryBarProps) {
  const { isBn } = useLanguage();

  return (
    <div className="glass mb-10 flex flex-wrap items-center gap-2 rounded-full p-2">
      {categories.map((cat) => {
        const label = isBn && BENGALI_CATEGORIES[cat] ? BENGALI_CATEGORIES[cat] : cat;
        const isActive = cat === activeCategory;
        return (
          <Link
            key={cat}
            href={cat === "All" ? "/tours" : `/tours?category=${encodeURIComponent(cat)}`}
            className={
              isActive
                ? "rounded-full bg-emerald px-4 py-2 text-sm font-semibold text-white shadow-xs"
                : "rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-white/70 hover:text-ink"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
