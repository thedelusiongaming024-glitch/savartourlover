"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Icon } from "@/components/Icon";
import type { Destination } from "@/lib/types";
import { CURATED_DESTINATIONS } from "@/data/curatedDestinations";

type ViewportMode = "mobile" | "tablet" | "desktop";

function useViewport(): ViewportMode {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setViewport("mobile");
      } else if (width < 1024) {
        setViewport("tablet");
      } else {
        setViewport("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}

interface DestinationDisplayItem {
  id?: string;
  slug: string;
  name: string;
  bn?: string;
  tagline?: string;
  region?: string;
  division?: string;
  propertiesCount?: number;
  imageUrl?: string;
  tourCount?: number;
}

interface PopularDestinationsCoverflowProps {
  destinations?: Destination[];
  title?: string;
  titleBn?: string;
  subtitle?: string;
  subtitleBn?: string;
  showAllLink?: boolean;
  allLinkHref?: string;
  allLinkLabelEn?: string;
  allLinkLabelBn?: string;
  className?: string;
}

export function PopularDestinationsCoverflow({
  destinations,
  title,
  titleBn,
  subtitle,
  subtitleBn,
  showAllLink = false,
  allLinkHref = "/destinations",
  allLinkLabelEn = "All destinations",
  allLinkLabelBn = "সকল গন্তব্য",
  className = "",
}: PopularDestinationsCoverflowProps) {
  const { isBn, formatNumber } = useLanguage();
  const router = useRouter();
  const viewport = useViewport();

  // Only display real destinations from the database. Never show fake/mock destinations when the DB is empty.
  const items: DestinationDisplayItem[] = (() => {
    if (destinations && destinations.length > 0) {
      return destinations.map((d) => {
        const curatedMatch = CURATED_DESTINATIONS.find(
          (c) => c.slug === d.slug || c.name.toLowerCase() === d.name.toLowerCase()
        );
        const count = d.tourSlugs?.length || 0;
        return {
          id: d.slug,
          slug: d.slug,
          name: d.name,
          bn: d.bn,
          tagline: d.tagline,
          region: d.region,
          propertiesCount: count,
          tourCount: count,
          imageUrl: d.cover?.imageUrl || curatedMatch?.imageUrl || "/images/mountain-hero.jpg",
        };
      });
    }

    return [];
  })();

  const count = items.length;
  const defaultIndex = Math.floor(count / 2);
  const [activeIndex, setActiveIndex] = useState(defaultIndex >= 0 ? defaultIndex : 0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Gentle autoplay with pause on hover
  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, count, handleNext]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  // Touch gesture handling with vertical scroll disambiguation
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;
  };

  const handleTouchEnd = () => {
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;

    // Only trigger slide change if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 35) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  if (count === 0) return null;

  return (
    <section
      className={`relative overflow-hidden py-8 sm:py-14 lg:py-20 select-none bg-gradient-to-b from-[#eaf4fc]/70 via-[#f1f7fd]/40 to-transparent ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Popular Destinations"
    >
      {/* Ambient background glow matching the sample's airy, light blue aesthetic */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[240px] sm:h-[380px] w-[900px] max-w-full rounded-full bg-sky-200/35 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header matching the sample: "Popular" (dark serif) + "Destinations" (teal) */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-12">
          <div>
            <h2 className="font-serif text-2xl xs:text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-tight">
              {isBn ? (
                <>
                  <span className="text-slate-900">জনপ্রিয় </span>
                  <span className="text-teal-700">ভ্রমণ গন্তব্য</span>
                </>
              ) : (
                <>
                  <span className="text-slate-900">{title ? title.split(" ")[0] : "Popular"} </span>
                  <span className="text-teal-700">
                    {title ? title.split(" ").slice(1).join(" ") || "Destinations" : "Destinations"}
                  </span>
                </>
              )}
            </h2>
            <p className="mt-1 text-xs sm:text-base text-slate-500 font-medium">
              {isBn
                ? subtitleBn || "বাংলাদেশের সবচেয়ে আকর্ষণীয় ও জনপ্রিয় ভ্রমণ স্পটসমূহ"
                : subtitle || "Explore Bangladesh's most iconic travel spots"}
            </p>
          </div>

          {showAllLink && (
            <Link
              href={allLinkHref}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-teal-800 hover:text-teal-900 hover:underline transition self-start sm:self-end"
            >
              <span>{isBn ? allLinkLabelBn : allLinkLabelEn}</span>
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* 3D Coverflow Stage - Full Desktop Structure Zoomed Out on Mobile */}
        <div
          ref={containerRef}
          className="relative mx-auto flex h-[270px] xs:h-[300px] sm:h-[380px] md:h-[460px] lg:h-[530px] w-full items-center justify-center overflow-visible touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {items.map((item, index) => {
            // Calculate circular offset
            let offset = (index - activeIndex) % count;
            if (offset > count / 2) offset -= count;
            if (offset < -count / 2) offset += count;

            const absOffset = Math.abs(offset);
            const isCenter = offset === 0;

            // Render all 7 cascading cards (tier ±3, ±2, ±1, 0) plus tier 4 buffer for seamless animations
            if (absOffset > 4) return null;

            // Unified 7-tiered 3D coverflow cascade: exact desktop fan layout zoomed proportionally
            let xPercent = 0;
            let scale = 1.0;
            let opacity = 1.0;
            let rotateY = 0;
            let zIndex = 30;

            if (offset === 0) {
              // Center active card
              xPercent = 0;
              scale = 1.0;
              opacity = 1.0;
              rotateY = 0;
              zIndex = 30;
            } else if (absOffset === 1) {
              // Level 1 flanking cards
              xPercent = offset > 0 ? 52 : -52;
              scale = 0.88;
              opacity = 0.90;
              rotateY = offset > 0 ? -12 : 12;
              zIndex = 22;
            } else if (absOffset === 2) {
              // Level 2 secondary depth cards
              xPercent = offset > 0 ? 90 : -90;
              scale = 0.77;
              opacity = 0.70;
              rotateY = offset > 0 ? -18 : 18;
              zIndex = 14;
            } else if (absOffset === 3) {
              // Level 3 tertiary edge cards
              xPercent = offset > 0 ? 126 : -126;
              scale = 0.66;
              opacity = 0.48;
              rotateY = offset > 0 ? -22 : 22;
              zIndex = 6;
            } else {
              // Level 4 buffer for smooth enter/exit animations
              xPercent = offset > 0 ? 160 : -160;
              scale = 0.55;
              opacity = 0;
              rotateY = offset > 0 ? -25 : 25;
              zIndex = 1;
            }

            const primaryName = isBn && item.bn ? item.bn : item.name;
            const propertyBadgeText = isBn
              ? `${formatNumber(item.propertiesCount || 1)}টি ট্যুর`
              : `${item.propertiesCount || 1} ${item.propertiesCount === 1 ? "Property" : "Properties"}`;

            return (
              <motion.div
                key={item.slug || index}
                className="absolute top-1/2 -translate-y-1/2 cursor-pointer transition-shadow"
                style={{
                  zIndex,
                  perspective: 1000,
                }}
                initial={false}
                animate={{
                  x: `${xPercent}%`,
                  scale,
                  opacity,
                  rotateY,
                }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 28,
                  mass: 0.8,
                }}
                onClick={() => {
                  if (!isCenter) {
                    setActiveIndex(index);
                  } else {
                    router.push(`/destinations/${item.slug}`);
                  }
                }}
              >
                {/* Card Container - Proportional Zoomed Scaling Across All Viewports */}
                <div
                  className={`group relative h-[225px] xs:h-[255px] sm:h-[340px] md:h-[430px] lg:h-[500px] w-[140px] xs:w-[160px] sm:w-[220px] md:w-[280px] lg:w-[340px] overflow-hidden rounded-[18px] xs:rounded-[22px] sm:rounded-[28px] lg:rounded-[32px] bg-slate-900 transition-all duration-300 ${
                    isCenter
                      ? "ring-1 ring-white/40 shadow-2xl shadow-slate-900/35"
                      : "shadow-xl shadow-slate-900/20 hover:brightness-105"
                  }`}
                >
                  {/* Photo with subtle zoom on center card */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className={`h-full w-full object-cover transition-transform duration-700 ease-out ${
                      isCenter ? "group-hover:scale-105" : "scale-100"
                    }`}
                    loading="lazy"
                  />

                  {/* Glassmorphic Property Pill Badge in Top Right */}
                  <div className="absolute top-2 right-2 xs:top-2.5 xs:right-2.5 sm:top-4 sm:right-4 z-20">
                    <span className="inline-flex items-center rounded-full bg-white/25 px-2 py-0.5 sm:px-3 sm:py-1 text-[8px] xs:text-[9px] sm:text-[11px] font-semibold tracking-wide text-white backdrop-blur-md border border-white/35 shadow-xs">
                      {propertyBadgeText}
                    </span>
                  </div>

                  {/* Gradient Scrim for crisp text readability */}
                  <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent pt-14 xs:pt-16 sm:pt-28 md:pt-32 pb-2.5 xs:pb-3 sm:pb-5 md:pb-6 px-2.5 xs:px-3 sm:px-5 md:px-6">
                    {/* Ghost watermark text behind main destination title */}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 left-2 sm:bottom-2.5 sm:left-4 select-none pointer-events-none text-lg xs:text-xl sm:text-3xl md:text-5xl font-black uppercase tracking-wider text-white/15 line-clamp-1 truncate max-w-[88%]"
                    >
                      {item.name}
                    </span>

                    {/* Primary Destination Title in bold white uppercase */}
                    <h3 className="relative z-10 text-xs xs:text-sm sm:text-lg md:text-2xl font-black tracking-wide text-white uppercase drop-shadow-md truncate">
                      {primaryName}
                    </h3>

                    {/* Subtle region / division subtitle */}
                    <p className="relative z-10 mt-0.5 text-[9px] xs:text-[10px] sm:text-xs font-semibold text-white/75 line-clamp-1 drop-shadow-xs">
                      {item.region || item.division || item.tagline}
                    </p>

                    {/* If Center Card, provide direct click-through action */}
                    {isCenter && (
                      <Link
                        href={`/destinations/${item.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 xs:mt-2 sm:mt-3 inline-flex items-center gap-1 self-start rounded-full bg-white/20 hover:bg-white/30 px-2 xs:px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[8px] xs:text-[9px] sm:text-[11px] font-bold text-white backdrop-blur-md border border-white/30 transition-all duration-200"
                      >
                        <span>{isBn ? "ট্যুর দেখুন" : "View Tours"}</span>
                        <Icon name="arrowRight" className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Navigation Controls: Left Arrow, Pagination Dots Pill, Right Arrow */}
        <div className="mt-5 sm:mt-8 flex items-center justify-center gap-2 sm:gap-3 px-2">
          {/* Previous Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous destination"
            className="flex h-8 w-8 xs:h-9 xs:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200/90 text-slate-700 hover:text-teal-800 hover:border-teal-400 hover:shadow-lg transition-all active:scale-90 cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Pill & Dot Indicators */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-full bg-slate-100/90 backdrop-blur-xs border border-slate-200/60 shadow-inner max-w-full">
            {items.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.slug || idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Go to ${item.name}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer shrink-0 ${
                    isActive
                      ? "h-1.5 sm:h-2 w-4 xs:w-5 sm:w-7 bg-teal-700 shadow-xs"
                      : "h-1.5 w-1.5 sm:h-2 sm:w-2 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              );
            })}
          </div>

          {/* Next Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next destination"
            className="flex h-8 w-8 xs:h-9 xs:w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-slate-200/90 text-slate-700 hover:text-teal-800 hover:border-teal-400 hover:shadow-lg transition-all active:scale-90 cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5 sm:h-5 sm:w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
