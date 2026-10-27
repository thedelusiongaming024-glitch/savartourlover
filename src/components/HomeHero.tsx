"use client";

import Link from "next/link";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { HeroVideoBackdrop } from "@/components/HeroVideoBackdrop";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { heroStats } from "@/data/site";
import type { HeroSlideItem } from "@/server/types";

interface HomeHeroProps {
  eyebrow?: string | null;
  headline?: string | null;
  highlight?: string | null;
  subheadline?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaHref?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  statsOverride?: { value: string; label: string }[] | null;
  mediaType?: "slideshow" | "video" | null;
  videoUrl?: string | null;
  slides?: HeroSlideItem[] | null;
}

export function HomeHero({
  eyebrow,
  headline,
  highlight,
  subheadline,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  statsOverride,
  mediaType,
  videoUrl,
  slides,
}: HomeHeroProps) {
  const { t, isBn, formatNumber } = useLanguage();

  const stats = statsOverride ?? heroStats;

  const defaultEyebrow = isBn
    ? "সাভার ট্যুর লাভার — আপনার স্বপ্ন উড়তে দিন"
    : (eyebrow ?? "Savar Tour Lover — Let Your Dreams Fly");

  const defaultHeadline = isBn
    ? "আপনার স্বপ্ন"
    : (headline ?? "Let Your Dreams");

  const defaultHighlight = isBn
    ? "উড়তে দিন"
    : (highlight ?? "Fly With Us");

  const defaultSubheadline = isBn
    ? "সাভার ট্যুর লাভার-এর সাথে উপভোগ করুন বাংলাদেশের সেরা ভ্রমণ অভিজ্ঞতা। বিশ্বস্ত লোকাল হোস্ট, স্পষ্ট মূল্য ও শতভাগ স্বচ্ছতায় সহজ বুকিং সুবিধা।"
    : (subheadline ?? "Curated domestic tours with Savar Tour Lover. Trusted local hosts, transparent pricing, and seamless booking confirmation across Bangladesh.");

  const defaultPrimaryCta = isBn
    ? "ট্যুরগুলো দেখুন"
    : (primaryCtaLabel ?? "Explore Tours");

  const defaultSecondaryCta = isBn
    ? "ভ্রমণ পরিকল্পনা"
    : (secondaryCtaLabel ?? "Plan My Trip");

  const localizedStats = stats.map((stat) => {
    if (!isBn) return stat;
    let val = stat.value;
    val = val.replace(/\d+/g, (m) => formatNumber(Number(m)));
    let lbl = stat.label;
    if (lbl.toLowerCase().includes("region")) lbl = "আঞ্চলিক গন্তব্য";
    else if (lbl.toLowerCase().includes("host")) lbl = "ভেরিফায়েড হোস্ট";
    else if (lbl.toLowerCase().includes("departure")) lbl = "নিশ্চিত যাত্রা";
    else if (lbl.toLowerCase().includes("rating")) lbl = "ভ্রমণকারী রেটিং";
    return { value: val, label: lbl };
  });

  return (
    <section className="relative overflow-hidden min-h-[520px] xs:min-h-[560px] sm:min-h-[640px] flex flex-col justify-center px-3.5 pb-28 pt-24 sm:px-6 sm:pb-32 sm:pt-36">
      {mediaType === "video" && videoUrl ? (
        <HeroVideoBackdrop videoUrl={videoUrl} fallbackSlides={slides ?? undefined} />
      ) : (
        <HeroSlideshow slides={slides ?? undefined} />
      )}
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-emerald-deep">
              <Icon name="mapPin" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate max-w-[280px] sm:max-w-none">{defaultEyebrow}</span>
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 sm:mt-6 font-display text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.15] sm:leading-[1.05] tracking-tight text-ink">
              {defaultHeadline}
              <br />
              <span className="bg-gradient-to-r from-emerald via-emerald-deep to-gold bg-clip-text text-transparent">
                {defaultHighlight}
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-3 sm:mt-5 max-w-xl text-xs sm:text-base leading-relaxed text-ink-soft px-2 sm:px-0">
              {defaultSubheadline}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-4 sm:mt-8 flex flex-row items-center justify-center gap-2.5 sm:gap-4 w-auto px-2 sm:px-0">
              <Link href={primaryCtaHref ?? "/tours"} className="btn btn-emerald text-center !py-2.5 sm:!py-3.5 !px-4 sm:!px-7 text-xs sm:text-base shrink-0 shadow-md">
                {defaultPrimaryCta}
              </Link>
              <Link href={secondaryCtaHref ?? "/contact"} className="btn btn-glass text-center !py-2.5 sm:!py-3.5 !px-4 sm:!px-7 text-xs sm:text-base shrink-0 shadow-sm">
                {defaultSecondaryCta}
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Stat panel - 4-column horizontal desktop strip scaled for mobile */}
        {localizedStats.length > 0 && (
          <Reveal delay={0.32} className="mx-auto mt-8 sm:mt-14 max-w-4xl">
            <Stagger
              className="glass glass-sweep grid grid-cols-4 gap-1.5 xs:gap-2 sm:gap-y-8 rounded-2xl sm:rounded-[2rem] p-2.5 xs:p-3.5 sm:p-8"
              stagger={0.08}
            >
              {localizedStats.map((stat) => (
                <StaggerItem key={stat.label} className="text-center p-1.5 xs:p-2 rounded-xl bg-white/30 sm:bg-transparent">
                  <div className="font-display text-base xs:text-xl sm:text-3xl lg:text-4xl font-semibold text-emerald-deep">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 sm:mt-1 text-[8px] xs:text-[9px] sm:text-sm font-medium uppercase tracking-wider text-ink-faint truncate">
                    {stat.label}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        )}
      </div>
    </section>
  );
}
