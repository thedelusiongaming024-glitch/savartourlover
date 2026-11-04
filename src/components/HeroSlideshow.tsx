"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import { useEffect, useState } from "react";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { normalizeImageUrl } from "@/lib/media";
import type { HeroSlideItem } from "@/server/types";
import type { SceneKey } from "@/lib/types";

const FALLBACK_DEFAULT_SLIDES: HeroSlideItem[] = [
  {
    id: "slide-coxsbazar",
    title: "Savar Tour Lover",
    subtitle: "Explore Beautiful Bangladesh",
    image_url: "",
  },
  {
    id: "slide-sajek",
    title: "Savar Tour Lover",
    subtitle: "Let Your Dreams Fly With Us",
    image_url: "",
  },
];

interface HeroSlideshowProps {
  slides?: HeroSlideItem[];
  scenes?: SceneKey[];
  /** Milliseconds each slide is shown */
  interval?: number;
}

export function HeroSlideshow({ slides, scenes, interval = 6000 }: HeroSlideshowProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const reduce = useSafeReducedMotion();

  // Filter out any mock/unsplash/placeholder URLs and ensure all slides have valid id and title
  const cleanSlides = (slides || [])
    .filter(
      (s) =>
        s &&
        s.image_url &&
        !s.image_url.includes("unsplash.com") &&
        !s.image_url.includes("placehold.co")
    )
    .map((s, idx) => ({
      ...s,
      id: String(s.id || `slide-${idx}`),
      title: s.title || (s as any).alt_text || "Savar Tour Lover",
      subtitle: s.subtitle || "",
      image_url: s.image_url || "",
    }));

  const activeSlides = cleanSlides.length > 0 ? cleanSlides : FALLBACK_DEFAULT_SLIDES;

  useEffect(() => {
    if (paused || activeSlides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % activeSlides.length);
    }, interval);
    return () => clearInterval(id);
  }, [paused, activeSlides.length, interval]);

  const activeSlide = activeSlides[index % activeSlides.length] || activeSlides[0] || FALLBACK_DEFAULT_SLIDES[0];
  const slideId = String(activeSlide?.id || `slide-${index}`);
  const slideTitle = activeSlide?.title || (activeSlide as any)?.alt_text || "Savar Tour Lover";
  const slideSubtitle = activeSlide?.subtitle || "";
  const normalizedImg = activeSlide?.image_url ? normalizeImageUrl(activeSlide.image_url) : null;
  const isFailed = Boolean(failedImages[slideId]);

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Cross-fading scene / real photo layers with a slow Ken Burns drift */}
      <AnimatePresence initial={false}>
        <motion.div
          key={slideId || index}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="h-full w-full relative"
            initial={{ scale: reduce ? 1 : 1 }}
            animate={{ scale: reduce ? 1 : 1.07 }}
            transition={{ duration: (interval + 1400) / 1000, ease: "linear" }}
          >
            {/* Real photo with responsive cover */}
            {normalizedImg && !isFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizedImg}
                alt={slideTitle || "Hero slide"}
                className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
                onError={() => setFailedImages((prev) => ({ ...prev, [slideId]: true }))}
              />
            ) : (
              <SceneBackdrop
                scene={{
                  key: ((slideId ? slideId.replace("slide-", "") : "coxsbazar") as SceneKey) || "coxsbazar",
                  label: slideTitle,
                }}
                className="h-full w-full"
                showLabel={false}
              />
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Atmospheric scrim: soft pearl halo directly behind text for crisp legibility while letting images shine */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "radial-gradient(75% 65% at 50% 35%, rgba(247,250,249,0.72) 0%, rgba(247,250,249,0.38) 42%, rgba(247,250,249,0.08) 70%, rgba(247,250,249,0) 90%)",
        }}
      />

      {/* Fade to page background at the bottom edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-28 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to top, var(--color-pearl) 0%, rgba(247,250,249,0.6) 40%, transparent 100%)",
        }}
      />

      {/* Soft wash at the very top for navbar contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-20 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(247,250,249,0.5) 0%, transparent 100%)",
        }}
      />

      {/* Now-showing destination label */}
      <div className="absolute bottom-3 xs:bottom-4 sm:bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 sm:gap-2.5 px-3 max-w-full pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.span
            key={slideId || index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="glass inline-flex items-center gap-1.5 sm:gap-2 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] xs:text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-emerald-deep shadow-xs max-w-[85vw] truncate pointer-events-auto"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="truncate">{slideTitle}{slideSubtitle ? ` · ${slideSubtitle}` : ""}</span>
          </motion.span>
        </AnimatePresence>

        {/* Progress dots */}
        {activeSlides.length > 1 && (
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {activeSlides.map((slide, i) => {
              const sId = slide?.id || `dot-${i}`;
              return (
                <button
                  key={sId}
                  type="button"
                  aria-label={`Show ${slide?.title || (slide as any)?.alt_text || `Slide ${i + 1}`}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                    i === (index % activeSlides.length)
                      ? "w-5 sm:w-7 bg-emerald-deep shadow-xs"
                      : "w-1.5 bg-ink/30 hover:bg-ink/60"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
