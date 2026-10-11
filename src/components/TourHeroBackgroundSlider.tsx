"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { normalizeImageUrl } from "@/lib/media";
import { Icon } from "@/components/Icon";
import type { SceneKey } from "@/lib/types";

export interface TourHeroSlide {
  id: string;
  image?: string | null;
  title: string;
  subtitle?: string;
  sceneKey?: SceneKey;
}

export interface TourHeroBadge {
  icon: string;
  label: string;
  color?: string;
}

interface TourHeroBackgroundSliderProps {
  slides: TourHeroSlide[];
  interval?: number; // ms, default 5500
  watermarkText?: string;
  breadcrumbs?: ReactNode;
  title?: string;
  badges?: TourHeroBadge[];
  children?: ReactNode;
}

export function TourHeroBackgroundSlider({
  slides,
  interval = 5500,
  watermarkText,
  breadcrumbs,
  title,
  badges,
  children,
}: TourHeroBackgroundSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const reduceMotion = useSafeReducedMotion();

  const total = slides.length;

  // Preload all slide images in browser cache so transitions are instantaneous with 0 lag
  useEffect(() => {
    if (typeof window === "undefined" || slides.length === 0) return;
    slides.forEach((slide) => {
      if (slide.image) {
        const url = normalizeImageUrl(slide.image);
        if (url) {
          const img = new window.Image();
          img.src = url;
        }
      }
    });
  }, [slides]);


  // Auto-slide timer: Does NOT freeze on general mouse movements or scrolling.
  // Temporarily pauses only when user interacts with navigation controls or browser tab is hidden.
  useEffect(() => {
    if (isPaused || total <= 1) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const timer = setInterval(() => {
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % total);
      }
    }, interval);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isPaused, total, interval]);

  if (total === 0) return <>{children}</>;

  return (
    <div className="relative w-full min-h-[540px] sm:min-h-[600px] lg:min-h-[640px] flex flex-col justify-end overflow-hidden select-none">
      {/* Background Slideshow Layer: Multi-layer stacked DOM with pure hardware-accelerated CSS transitions */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
      >
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex % total;
          const activeImage = slide.image ? normalizeImageUrl(slide.image) : null;
          const isImageFailed = Boolean(failedImages[slide.id]);

          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
              style={{
                willChange: "opacity",
              }}
            >
              <div
                className={`relative h-full w-full transition-transform duration-[7000ms] ease-out ${
                  isActive && !reduceMotion ? "scale-105" : "scale-100"
                }`}
                style={{
                  willChange: "transform",
                  transform: "translate3d(0, 0, 0)", // Elevates to dedicated GPU compositor layer
                }}
              >
                {activeImage && !isImageFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={slide.title || "Tour background"}
                    fetchPriority={idx === 0 ? "high" : "low"}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [slide.id]: true }))
                    }
                  />
                ) : (
                  <SceneBackdrop
                    scene={{
                      key: slide.sceneKey || "bandarban",
                      label: slide.title,
                    }}
                    className="h-full w-full"
                    showLabel={false}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Atmospheric dark gradient overlay ensuring crystal-clear text readability over any light photo */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/45 to-black/35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-x-0 bottom-0 h-36 z-[2] bg-gradient-to-t from-black/90 to-transparent"
      />

      {/* Giant Bengali Typography Watermark (Matches reference screenshot media_1789969477259.png) */}
      {watermarkText && (
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-x-0 top-[38%] sm:top-[36%] -translate-y-1/2 z-[3] flex items-center justify-center overflow-hidden px-4"
        >
          <span
            className="font-bengali font-bold tracking-wider text-white/30 select-none block text-center uppercase"
            style={{
              fontFamily: "'Tiro Bangla', 'Hind Siliguri', 'Noto Serif Bengali', serif",
              fontSize: "clamp(5rem, 16vw, 13rem)",
              lineHeight: 0.9,
              letterSpacing: "0.04em",
              textShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Foreground Content Container (Aligned Lower-Left) */}
      <div className="relative z-10 w-full pt-36 sm:pt-44 pb-8 sm:pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Breadcrumbs */}
          {breadcrumbs && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {breadcrumbs}
            </div>
          )}

          {/* Large Bold White Heading */}
          {title && (
            <h1 className="max-w-4xl font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] leading-[1.12]">
              {title}
            </h1>
          )}

          {/* Meta Pill Badges Row */}
          {badges && badges.length > 0 && (
            <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
              {badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2 rounded-full bg-black/65 border border-white/30 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white backdrop-blur-md shadow-md transition-colors hover:bg-black/75"
                >
                  <Icon
                    name={badge.icon}
                    className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                      badge.color || "text-emerald-400"
                    }`}
                  />
                  <span>{badge.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Custom / Additional Hero Children */}
          {children}

        </div>
      </div>
    </div>
  );
}
