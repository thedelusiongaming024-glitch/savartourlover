"use client";

import React from "react";
import type { Tour, Destination, TourGalleryItem } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

interface TourGalleryBentoProps {
  tour: Tour;
  destination?: Destination | null;
  className?: string;
}

export function TourGalleryBento({ tour, className = "" }: TourGalleryBentoProps) {
  const { isBn } = useLanguage();

  // Extract only genuine, admin-uploaded gallery images (never mock or stock fallback data)
  const rawAdminItems: TourGalleryItem[] = Array.isArray(tour.galleryItems) && tour.galleryItems.length > 0
    ? tour.galleryItems.filter((i) => Boolean(i?.imageUrl || i?.image))
    : Array.isArray(tour.gallery) && tour.gallery.length > 0
    ? tour.gallery
        .filter((g) => Boolean(g?.imageUrl) && !g.imageUrl?.includes("mountain-hero"))
        .map((g, idx) => ({
          id: `g-${idx}`,
          imageUrl: g.imageUrl || (g as any).image,
          image: g.imageUrl || (g as any).image,
          title: g.label,
        }))
    : [];

  const images = rawAdminItems
    .map((item, idx) => ({
      id: item.id || `photo-${idx}`,
      url: item.imageUrl || item.image || "",
      alt: item.title || item.caption || tour.title || "Tour photo",
    }))
    .filter((item) => Boolean(item.url));

  // If no genuine photos exist for this tour, do NOT render mock or stock fallback data
  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Section Header */}
      <div className="mb-3.5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">
          {isBn ? "ট্যুরের ছবি ও দৃশ্যপট" : "Tour Photos & Scenery"}
        </h2>
      </div>

      {images.length === 1 ? (
        <div className="relative group overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs h-[280px] sm:h-[360px] md:h-[400px]">
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="eager"
          />
        </div>
      ) : images.length <= 4 ? (
        <div
          className={`grid gap-3 ${
            images.length === 2
              ? "grid-cols-2 h-[220px] sm:h-[280px]"
              : "grid-cols-2 sm:grid-cols-3 h-[240px] sm:h-[320px]"
          }`}
        >
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs h-full"
            >
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Featured Left Card */}
            <div className="sm:col-span-6 relative group overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs h-[280px] sm:h-[320px] md:h-[340px]">
              <img
                src={images[0].url}
                alt={images[0].alt}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="eager"
              />
            </div>

            {/* Right Grid (Up to 4 images) */}
            <div className="sm:col-span-6 grid grid-cols-2 gap-2.5 sm:gap-3 h-[280px] sm:h-[320px] md:h-[340px]">
              {images.slice(1, 5).map((img) => (
                <div
                  key={img.id}
                  className="relative group overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs h-full"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Optional panoramic banner if 6th image exists */}
          {images[5] && (
            <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs w-full h-[95px] sm:h-[110px] md:h-[120px]">
              <img
                src={images[5].url}
                alt={images[5].alt}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
