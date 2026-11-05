"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TourCard } from "@/components/TourCard";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { Destination, Tour } from "@/lib/types";

export interface PopularToursCategoryItem {
  name: string;
  slug: string;
  icon?: string;
}

interface PopularToursExplorerProps {
  tours: Tour[];
  destinations?: Destination[];
  categories?: PopularToursCategoryItem[];
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
        active ? "text-white" : "text-ink-soft hover:text-ink hover:bg-white/50"
      }`}
    >
      {active && (
        <motion.span
          layoutId="tour-category-active-pill"
          className="absolute inset-0 rounded-full bg-emerald-deep shadow-md"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative flex items-center gap-1.5">{label}</span>
    </button>
  );
}

export function PopularToursExplorer({
  tours,
  destinations,
  categories: categoriesProp,
}: PopularToursExplorerProps) {
  const { t, isBn, formatNumber } = useLanguage();

  const categories = useMemo(() => {
    if (categoriesProp && categoriesProp.length > 0) {
      return ["All", ...categoriesProp.map((c) => c.name)];
    }
    return ["All", ...Array.from(new Set(tours.map((t) => t.category)))];
  }, [categoriesProp, tours]);

  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    if (category === "All") return tours;
    const catLower = category.toLowerCase().trim();
    const matchedCategoryObj = categoriesProp?.find(
      (c) => c.name.toLowerCase() === catLower || c.slug.toLowerCase() === catLower
    );
    const targetSlug = matchedCategoryObj?.slug.toLowerCase();
    const targetName = matchedCategoryObj?.name.toLowerCase();

    return tours.filter((t) => {
      const tourCat = (t.category || "").toLowerCase().trim();
      if (tourCat === catLower) return true;
      if (targetSlug && tourCat === targetSlug) return true;
      if (targetName && tourCat === targetName) return true;
      return tourCat.includes(catLower) || catLower.includes(tourCat);
    });
  }, [tours, category, categoriesProp]);

  function clearAll() {
    setCategory("All");
  }

  const getCategoryLabel = (cat: string) => {
    if (!isBn) return cat;
    if (cat === "All") return "সকল প্যাকেজ";
    const cl = cat.toLowerCase();
    if (cl.includes("group")) return "গ্রুপ ট্যুর";
    if (cl.includes("package")) return "প্যাকেজ ট্যুর";
    if (cl.includes("day")) return "ডে ট্যুর";
    if (cl.includes("weekend")) return "উইকেন্ড গেটওয়ে";
    if (cl.includes("adventure")) return "অ্যাডভেঞ্চার ট্যুর";
    if (cl.includes("honeymoon")) return "হানিমুন প্যাকেজ";
    if (cl.includes("family")) return "ফ্যামিলি ট্যুর";
    if (cl.includes("private")) return "প্রাইভেট ট্যুর";
    if (cl.includes("heritage")) return "ঐতিহ্যবাহী ট্যুর";
    if (cl.includes("combo")) return "কম্বো ট্যুর";
    return cat;
  };

  return (
    <div>
      {/* Category Filter bar */}
      <div className="glass glass-sweep rounded-3xl p-3 sm:p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <CategoryPill
              key={c}
              label={getCategoryLabel(c)}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      </div>

      {/* Result count */}
      <div className="mt-4 sm:mt-5 h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={filtered.length}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="text-xs sm:text-sm font-medium text-ink-soft"
          >
            {isBn ? (
              <>
                মোট{" "}
                <span className="font-semibold text-emerald-deep">
                  {formatNumber(filtered.length)}টি
                </span>{" "}
                ট্যুর দেখানো হচ্ছে
              </>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-emerald-deep">
                  {filtered.length}
                </span>{" "}
                {filtered.length === 1 ? "tour" : "tours"}
                {category !== "All" && (
                  <span className="text-ink-faint ml-1">in &ldquo;{category}&rdquo;</span>
                )}
              </>
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Results grid - 2 columns on mobile, 3 on desktop */}
      <motion.div layout className="mt-3 sm:mt-4 grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((tour) => (
            <motion.div
              key={tour.slug}
              layout
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -18 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
            >
              <TourCard tour={tour} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      <AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass mt-4 flex flex-col items-center gap-3 rounded-3xl p-12 text-center"
          >
            <motion.span
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-coral/10 text-coral"
            >
              <Icon name="mapPin" className="h-6 w-6" />
            </motion.span>
            <h3 className="font-display text-lg font-semibold text-ink">
              {isBn ? "এই ক্যাটাগরিতে কোনো ট্যুর পাওয়া যায়নি" : "No tours match this category"}
            </h3>
            <p className="max-w-sm text-sm text-ink-soft">
              {isBn
                ? "অন্য ক্যাটাগরি বেছে নিন অথবা সকল ট্যুর প্যাকেজ দেখুন।"
                : "Try choosing another category, or view all packages."}
            </p>
            <button type="button" onClick={clearAll} className="btn btn-emerald mt-2">
              {isBn ? "সকল ট্যুর দেখুন" : "View all tours"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
