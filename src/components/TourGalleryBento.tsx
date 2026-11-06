"use client";

import React, { useState } from "react";
import type { Tour, Destination, TourGalleryItem } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { normalizeImageUrl } from "@/lib/media";

interface TourGalleryBentoProps {
  tour: Tour;
  destination?: Destination | null;
  className?: string;
}

const SLOT_ORDER: Record<string, number> = {
  featured_main: 0,
  grid_1: 1,
  grid_2: 2,
  grid_3: 3,
  grid_4: 4,
  panorama: 5,
};

export function TourGalleryBento({ tour, className = "" }: TourGalleryBentoProps) {
  const { isBn } = useLanguage();
  const [activePhoto, setActivePhoto] = useState<{ url: string; alt: string } | null>(null);

  // Extract all valid images from galleryItems, gallery, or raw gallery property
  const sourceList: any[] =
    Array.isArray(tour.galleryItems) && tour.galleryItems.length > 0
      ? tour.galleryItems
      : Array.isArray(tour.gallery) && tour.gallery.length > 0
      ? tour.gallery
      : Array.isArray((tour as any).rawGallery) && (tour as any).rawGallery.length > 0
      ? (tour as any).rawGallery
      : [];

  const rawAdminItems = sourceList
    .map((g: any, idx: number) => {
      const rawUrl = g.imageUrl || g.image || g.url || (typeof g === "string" ? g : "");
      const url = normalizeImageUrl(rawUrl);
      const slot = g.slot || "";
      const title = g.title || g.caption || g.label || `${tour.title} View ${idx + 1}`;
      return {
        id: g.id || `bento-img-${idx}`,
        url,
        title,
        alt: title,
        slot,
        order: slot && SLOT_ORDER[slot] !== undefined ? SLOT_ORDER[slot] : idx,
      };
    })
    .filter((img) => Boolean(img.url) && !img.url.includes("mountain-hero.jpg"));

  // Sort by defined Bento slot order if slots are specified, otherwise preserve list sequence
  const images = [...rawAdminItems].sort((a, b) => a.order - b.order);

  // If no genuine photos exist for this tour, do NOT render mock or stock fallback data
  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Section Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-ink">
            {isBn ? "ট্যুরের ছবি ও দৃশ্যপট" : "Tour Photos & Scenery"}
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">
            {isBn
              ? "এই ভ্রমণের বাস্তব ও আকর্ষণীয় দৃশ্যপট"
              : "High-resolution scenery and moments from this journey"}
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
          📸 {images.length} {isBn ? "টি ছবি" : "Photos"}
        </span>
      </div>

      {images.length === 1 ? (
        <div
          onClick={() => setActivePhoto(images[0])}
          className="relative group overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs h-[280px] sm:h-[360px] md:h-[400px] cursor-pointer"
        >
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-white text-xs font-medium">🔍 {isBn ? "বড় করে দেখুন" : "Click to view full size"}</span>
          </div>
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
              onClick={() => setActivePhoto(img)}
              className="relative group overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs h-full cursor-pointer"
            >
              <img
                src={img.url}
                alt={img.alt}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-white text-[11px] font-medium truncate">{img.title}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Featured Left Card */}
            <div
              onClick={() => setActivePhoto(images[0])}
              className="sm:col-span-6 relative group overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs h-[280px] sm:h-[320px] md:h-[360px] cursor-pointer"
            >
              <img
                src={images[0].url}
                alt={images[0].alt}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white text-xs font-semibold">{images[0].title}</span>
              </div>
            </div>

            {/* Right Grid (Up to 4 images) */}
            <div className="sm:col-span-6 grid grid-cols-2 gap-2.5 sm:gap-3 h-[280px] sm:h-[320px] md:h-[360px]">
              {images.slice(1, 5).map((img) => (
                <div
                  key={img.id}
                  onClick={() => setActivePhoto(img)}
                  className="relative group overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-xs h-full cursor-pointer"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                    <span className="text-white text-[10px] font-medium truncate">{img.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional panoramic banner if 6th image exists */}
          {images[5] && (
            <div
              onClick={() => setActivePhoto(images[5])}
              className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200/80 shadow-xs w-full h-[100px] sm:h-[130px] md:h-[150px] cursor-pointer"
            >
              <img
                src={images[5].url}
                alt={images[5].alt}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-white text-xs font-semibold">{images[5].title}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Full-Size Image Preview */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg font-bold hover:bg-black/80 transition"
              aria-label="Close photo preview"
            >
              ✕
            </button>
            <img
              src={activePhoto.url}
              alt={activePhoto.alt}
              className="max-h-[85vh] w-auto max-w-full object-contain rounded-xl"
            />
            {activePhoto.alt && (
              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-3 text-center text-white text-xs font-medium backdrop-blur-xs">
                {activePhoto.alt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
