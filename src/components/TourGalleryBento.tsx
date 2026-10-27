"use client";

import React from "react";
import type { Tour, Destination, TourGalleryItem } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

interface TourGalleryBentoProps {
  tour: Tour;
  destination?: Destination | null;
  className?: string;
}

interface BentoItem {
  id: string;
  image: string;
  alt?: string;
  slot?: string;
}

// Curated high quality scenic photos fallback based on destination / region
const DESTINATION_SCENERY_DEFAULTS: Record<string, string[]> = {
  sundarban: [
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  ],
  bandarban: [
    "/images/mountain-hero.jpg",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  ],
  sajek: [
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  ],
  sreemangal: [
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  ],
  cox: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  ],
  kuakata: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  ],
  nepal: [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
  ],
};

export function TourGalleryBento({ tour, destination, className = "" }: TourGalleryBentoProps) {
  const { isBn } = useLanguage();
  const destSlug = (destination?.slug || tour.destinationSlug || "").toLowerCase();

  // Match default scenery by destination or tour keywords
  const tourTitleLower = (tour.title || "").toLowerCase();
  const tourSlugLower = (tour.slug || "").toLowerCase();
  const matchedKey = Object.keys(DESTINATION_SCENERY_DEFAULTS).find((k) =>
    tourTitleLower.includes(k) || tourSlugLower.includes(k) || destSlug.includes(k)
  );
  const defaultImages = matchedKey
    ? DESTINATION_SCENERY_DEFAULTS[matchedKey]
    : DESTINATION_SCENERY_DEFAULTS.bandarban;

  // Compile bento items: Admin configured gallery or fallback
  const rawAdminItems: TourGalleryItem[] = Array.isArray(tour.galleryItems) && tour.galleryItems.length > 0
    ? tour.galleryItems
    : Array.isArray(tour.gallery) && tour.gallery.length > 0
    ? tour.gallery.map((g, idx) => ({
        id: `g-${idx}`,
        imageUrl: g.imageUrl || (g as any).image,
        image: g.imageUrl || (g as any).image,
      }))
    : [];

  const finalItems: BentoItem[] = [];

  // Slot 0: Main Featured (Tall Left)
  const slot0Admin = rawAdminItems.find((i) => i.slot === "featured_main" || i.isFeatured) || rawAdminItems[0];
  const item0: BentoItem = {
    id: slot0Admin?.id || "slot-0",
    image: slot0Admin?.imageUrl || slot0Admin?.image || tour.cover?.imageUrl || defaultImages[0],
    alt: tour.title || "Tour Photo",
  };
  finalItems.push(item0);

  // Slots 1 to 4: Top-right 2x2 grid
  for (let s = 1; s <= 4; s++) {
    const slotKey = `grid_${s}`;
    const adminMatch = rawAdminItems.find((i) => i.slot === slotKey) || (rawAdminItems[s] ? rawAdminItems[s] : null);
    const fbImage = defaultImages[s] || defaultImages[s % defaultImages.length];

    const gridItem: BentoItem = {
      id: adminMatch?.id || `slot-${s}`,
      image: adminMatch?.imageUrl || adminMatch?.image || destination?.gallery?.[s - 1]?.imageUrl || fbImage,
      alt: tour.title || "Tour Photo",
    };
    finalItems.push(gridItem);
  }

  // Slot 5: Panoramic Banner (Bottom full width)
  const slot5Admin = rawAdminItems.find((i) => i.slot === "panorama") || (rawAdminItems[5] ? rawAdminItems[5] : null);
  const fb5Image = defaultImages[5] || defaultImages[defaultImages.length - 1];
  const item5: BentoItem = {
    id: slot5Admin?.id || "slot-5",
    image: slot5Admin?.imageUrl || slot5Admin?.image || destination?.cover?.imageUrl || fb5Image,
    alt: tour.title || "Tour Photo",
  };
  finalItems.push(item5);

  return (
    <div className={`w-full ${className}`}>
      {/* Section Header */}
      <div className="mb-3.5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">
          {isBn ? "ট্যুরের ছবি ও দৃশ্যপট" : "Tour Photos & Scenery"}
        </h2>
      </div>

      {/* Pure Bento Photography Structure (No writings, tags, watermarks, or buttons) */}
      <div className="space-y-3">
        {/* Top Half: Left Tall Featured Card + Right 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* ================= 1. LEFT FEATURED TALL CARD (Item 0) ================= */}
          <div className="sm:col-span-6 relative group overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/40 shadow-xs h-[280px] sm:h-[320px] md:h-[340px]">
            <img
              src={item0.image}
              alt={item0.alt || "Tour photo"}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="eager"
            />
          </div>

          {/* ================= 2. RIGHT 2x2 GRID (Items 1, 2, 3, 4) ================= */}
          <div className="sm:col-span-6 grid grid-cols-2 gap-2.5 sm:gap-3 h-[280px] sm:h-[320px] md:h-[340px]">
            {[finalItems[1], finalItems[2], finalItems[3], finalItems[4]].map((item, idx) => (
              <div
                key={item.id || idx + 1}
                className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/40 shadow-xs h-full"
              >
                <img
                  src={item.image}
                  alt={item.alt || "Tour photo"}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================= 3. BOTTOM PANORAMIC BANNER (Item 5) ================= */}
        <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/40 shadow-xs w-full h-[95px] sm:h-[110px] md:h-[120px]">
          <img
            src={item5.image}
            alt={item5.alt || "Tour photo"}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
