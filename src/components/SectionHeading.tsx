"use client";

import { Reveal } from "@/components/Reveal";
import { useLanguage } from "@/context/LanguageContext";

interface SectionHeadingProps {
  eyebrow?: string;
  eyebrowBn?: string;
  title: string;
  titleBn?: string;
  description?: string;
  descriptionBn?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  eyebrowBn,
  title,
  titleBn,
  description,
  descriptionBn,
  align = "center",
}: SectionHeadingProps) {
  const { isBn } = useLanguage();
  const alignment =
    align === "center" ? "items-center text-center" : "items-start text-left";

  const displayEyebrow = isBn && eyebrowBn ? eyebrowBn : eyebrow;
  const displayTitle = isBn && titleBn ? titleBn : title;
  const displayDesc = isBn && descriptionBn ? descriptionBn : description;

  return (
    <Reveal className={`flex flex-col ${alignment}`}>
      {displayEyebrow && (
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          <span className="h-1.5 w-1.5 rounded-full bg-gold pulse-dot" />
          {displayEyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl md:text-5xl">
        {displayTitle}
      </h2>
      {displayDesc && (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          {displayDesc}
        </p>
      )}
    </Reveal>
  );
}
