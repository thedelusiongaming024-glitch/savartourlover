"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Icon } from "@/components/Icon";
import { TourGalleryBento } from "@/components/TourGalleryBento";
import { TourHeroBackgroundSlider, type TourHeroSlide } from "@/components/TourHeroBackgroundSlider";
import { BookingForm } from "@/components/BookingForm";
import { useLanguage } from "@/context/LanguageContext";
import type { Tour, Destination } from "@/lib/types";

interface TourDetailClientProps {
  tour: Tour;
  destination?: Destination | null;
  heroBackgroundSlides: TourHeroSlide[];
  watermarkText?: string;
}

function FormattedDescription({ text }: { text: string }) {
  if (!text) return null;

  // Split into paragraphs by double newlines or consecutive newlines
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className="space-y-4 text-base sm:text-lg leading-relaxed text-ink-soft">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);

        // Check if paragraph is a list of bullet points
        const isList = lines.length > 0 && lines.every((l) => /^[-*•·]/.test(l));
        if (isList) {
          return (
            <ul key={pIdx} className="space-y-2.5 my-3 pl-1">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="flex items-start gap-2.5">
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-emerald" />
                  <span className="leading-relaxed">{l.replace(/^[-*•·]\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        // Check if paragraph starts with a day/schedule header (e.g. "প্রথম দিন:", "Day 1:", "১ম দিন:")
        const dayMatch = para.match(
          /^((?:প্রথম|দ্বিতীয়|তৃতীয়|চতুর্থ|পঞ্চম|১ম|২য়|৩য়|৪র্থ|৫ম|Day\s*\d+|সকালে|সন্ধ্যায়|রাতে|দুপুরে)[^:–—\n]+[:–—])\s*([\s\S]*)$/i
        );
        if (dayMatch) {
          const header = dayMatch[1].trim();
          const body = dayMatch[2].trim();
          return (
            <div
              key={pIdx}
              className="rounded-2xl border border-emerald-100/80 bg-emerald-50/40 p-4 sm:p-5 backdrop-blur-xs shadow-2xs"
            >
              <span className="inline-block rounded-lg bg-emerald/15 px-3 py-1 font-display text-sm font-bold text-emerald-deep mb-2">
                {header}
              </span>
              <p className="whitespace-pre-line leading-relaxed text-ink-soft">
                {body}
              </p>
            </div>
          );
        }

        return (
          <p key={pIdx} className="whitespace-pre-line leading-relaxed">
            {para}
          </p>
        );
      })}
    </div>
  );
}

export function TourDetailClient({
  tour,
  destination,
  heroBackgroundSlides,
  watermarkText,
}: TourDetailClientProps) {
  const { isBn, formatPrice, formatNumber } = useLanguage();

  const original = tour.startingPrice;
  const final = Math.max(0, original - tour.discount);
  const advance = Math.round(final * (tour.advancePercent / 100));
  const remaining = Math.max(0, final - advance);

  const displayCategory = isBn
    ? (() => {
        const cat = (tour.category || "").toLowerCase();
        if (cat.includes("package")) return "প্যাকেজ ট্যুর";
        if (cat.includes("group")) return "গ্রুপ ট্যুর";
        if (cat.includes("day")) return "ডে ট্যুর";
        if (cat.includes("weekend")) return "উইকেন্ড";
        if (cat.includes("adventure")) return "অ্যাডভেঞ্চার";
        if (cat.includes("honeymoon")) return "হানিমুন";
        if (cat.includes("heritage")) return "ঐতিহ্যবাহী";
        if (cat.includes("combo")) return "কম্বো";
        return tour.category;
      })()
    : tour.category;

  const displayDeparture = isBn
    ? (() => {
        const dep = (tour.departure || "").toLowerCase();
        if (dep.includes("dhaka")) return "ঢাকা থেকে যাত্রা";
        if (dep.includes("chattogram") || dep.includes("chittagong")) return "চট্টগ্রাম থেকে যাত্রা";
        if (dep.includes("savar")) return "সাভার থেকে যাত্রা";
        return `${tour.departure} থেকে`;
      })()
    : tour.departure;

  const displayDuration = isBn
    ? tour.duration
        .replace(/Days?/gi, "দিন")
        .replace(/Nights?/gi, "রাত")
        .replace(/\d+/g, (m) => formatNumber(Number(m)))
    : tour.duration;

  // Extract places to visit from tour.placesToVisit, destination.attractions, or itinerary day titles
  const placesToVisit: string[] = (() => {
    if (Array.isArray(tour.placesToVisit) && tour.placesToVisit.length > 0) {
      return tour.placesToVisit;
    }
    if (Array.isArray(destination?.attractions) && destination.attractions.length > 0) {
      const raw = destination.attractions.join("\n");
      const emojiRegex = /(?=[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/u;
      const parts = raw
        .split(/[\n,;•·*|]+|(?<=[^\s])\s*[-–—]\s*(?=[^\s])/)
        .flatMap((s) => s.split(emojiRegex));
      const cleaned = parts
        .map((s) => s.replace(/^[-*•·\s]+|[-*•·\s]+$/g, "").trim())
        .filter((s) => s.length > 1);
      if (cleaned.length > 0) return cleaned;
    }
    if (Array.isArray(tour.itinerary) && tour.itinerary.length > 0) {
      const fromItinerary = tour.itinerary
        .map((d) => d.title.replace(/^Day\s*\d+[:\s-]*/i, "").replace(/^দিন\s*\d+[:\s-]*/i, "").trim())
        .filter((s) => s.length > 1);
      if (fromItinerary.length > 0) return fromItinerary;
    }
    return [];
  })();

  // Breadcrumbs
  const breadcrumbs = (
    <>
      <Link href="/" className="text-white/75 hover:text-white transition-colors">
        {isBn ? "মূলপাতা" : "Home"}
      </Link>
      <span className="text-white/50 text-xs font-bold">&gt;</span>
      <Link href="/tours" className="text-white/75 hover:text-white transition-colors">
        {isBn ? "প্যাকেজ" : "Packages"}
      </Link>
      <span className="text-white/50 text-xs font-bold">&gt;</span>
      <span className="text-white font-medium truncate max-w-xs sm:max-w-md">
        {tour.title}
      </span>
    </>
  );

  // Meta Badges
  const heroBadges = [
    {
      icon: "mapPin",
      label: (isBn && destination?.bn) ? destination.bn : (destination?.name || "বাংলাদেশ"),
      color: "text-rose-400",
    },
    {
      icon: "tag",
      label: displayCategory || "ট্যুর",
      color: "text-emerald-400",
    },
  ];

  return (
    <>
      {/* Hero Banner with Auto-Slide Background, Giant Bengali Watermark, Breadcrumbs & Pills */}
      <section className="relative overflow-hidden">
        <TourHeroBackgroundSlider
          slides={heroBackgroundSlides}
          interval={5500}
          watermarkText={watermarkText}
          breadcrumbs={breadcrumbs}
          title={tour.title}
          badges={heroBadges}
        />
      </section>

      {/* Main Content & Sticky Booking Section */}
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column (Main Tour Information) */}
            <div className="lg:col-span-8 space-y-10">
              {/* Quick Specs Bar */}
              <Reveal>
                <div className="glass glass-sweep rounded-3xl p-6 sm:p-7">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      {
                        icon: "clock",
                        label: isBn ? "সময়কাল" : "Duration",
                        value: displayDuration,
                      },
                      {
                        icon: "usersGroup",
                        label: isBn ? "আসন সংখ্যা" : "Total Seats",
                        value: isBn
                          ? `${formatNumber(tour.total_seats || tour.totalSeats || tour.capacity || 40)} আসন`
                          : `${tour.total_seats || tour.totalSeats || tour.capacity || 40} seats`,
                      },
                      {
                        icon: "calendar",
                        label: isBn ? "যাত্রা" : "Departs",
                        value: displayDeparture,
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                          <Icon name={item.icon} className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                            {item.label}
                          </div>
                          <div className="text-sm font-medium text-ink">{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Tour Photos & Scenery (Compact Bento Grid in Left Column) */}
              <Reveal>
                <TourGalleryBento tour={tour} destination={destination} />
              </Reveal>

              {/* Tour Overview / Description */}
              <Reveal>
                <div className="glass glass-sweep rounded-3xl p-7 sm:p-8">
                  <h2 className="mb-4 font-display text-xl font-semibold text-ink sm:text-2xl">
                    {isBn ? "ট্যুরের বিবরণ" : "Overview"}
                  </h2>
                  <FormattedDescription text={tour.description} />
                </div>
              </Reveal>

              {/* Places You'll Visit / Key Sightseeing Spots (Placed directly after Overview card) */}
              {placesToVisit.length > 0 && (
                <Reveal delay={0.06}>
                  <div className="glass glass-sweep rounded-3xl p-7 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-ink/5">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald/10 text-emerald text-base">
                            📍
                          </span>
                          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                            {isBn ? "যে স্থানগুলো ঘুরে দেখবেন" : "Places You'll Visit"}
                          </h2>
                        </div>
                        <p className="mt-1.5 text-xs sm:text-sm text-ink-soft">
                          {isBn
                            ? "এই ট্যুরে যে আকর্ষণীয় ও দর্শনীয় স্থানগুলো ভ্রমণের সুযোগ পাবেন"
                            : "Explore the iconic destinations, viewpoints, and landmarks included in this tour"}
                        </p>
                      </div>
                      <span className="inline-flex items-center self-start sm:self-auto rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                        {isBn ? `${formatNumber(placesToVisit.length)}টি স্থান` : `${placesToVisit.length} Places`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {placesToVisit.map((place, idx) => (
                        <div
                          key={`${place}-${idx}`}
                          className="group flex items-center gap-3 rounded-2xl border border-ink/5 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs transition duration-200 hover:border-emerald/30 hover:bg-white hover:shadow-xs"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald/15 to-emerald-deep/15 text-emerald font-semibold text-xs transition group-hover:scale-105 group-hover:bg-emerald group-hover:text-white">
                            {formatNumber(idx + 1)}
                          </span>
                          <span className="text-sm font-semibold text-ink group-hover:text-emerald transition line-clamp-2">
                            {place}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}

              {/* Itinerary */}
              <div>
                <Reveal>
                  <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                    {isBn ? "ভ্রমণসূচি" : "Itinerary"}
                  </h2>
                </Reveal>
                <div className="mt-6 space-y-4">
                  {tour.itinerary.map((day, i) => (
                    <Reveal key={day.day} delay={i * 0.05}>
                      <div className="glass glass-sweep flex gap-4 rounded-3xl p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald to-emerald-deep font-display text-xs sm:text-sm font-semibold text-white">
                          {isBn ? `দিন ${formatNumber(day.day)}` : `Day ${day.day}`}
                        </span>
                        <div>
                          <h3 className="font-display text-base font-semibold text-ink">
                            {day.title}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                            {day.description}
                          </p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Reveal>
                  <div className="glass glass-sweep h-full rounded-3xl p-6">
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      <Icon name="check" className="h-5 w-5 text-emerald" />
                      {isBn ? "যা যা অন্তর্ভুক্ত" : "Inclusions"}
                    </h2>
                    <ul className="mt-4 space-y-2.5">
                      {tour.inclusions.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                            <Icon name="check" className="h-3 w-3" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
                <Reveal delay={0.06}>
                  <div className="glass glass-sweep h-full rounded-3xl p-6">
                    <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                      <Icon name="receipt" className="h-5 w-5 text-coral" />
                      {isBn ? "যা যা অন্তর্ভুক্ত নয়" : "Exclusions"}
                    </h2>
                    <ul className="mt-4 space-y-2.5">
                      {tour.exclusions.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral">
                            <Icon name="receipt" className="h-3 w-3" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>

              {/* Tour Logistics & Boarding Points Side-by-Side */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Tour Logistics (Meals, Stay, Transport) */}
                <Reveal delay={0.08}>
                  <div className="glass glass-sweep h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                        <Icon name="sparkle" className="h-5 w-5 text-gold" />
                        {isBn ? "লজিস্টিক ও সুযোগ-সুবিধা" : "Tour Logistics & Amenities"}
                      </h2>
                      <div className="mt-4 space-y-4">
                        {/* Meals */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                            <span>🍽️</span>
                            <span>{isBn ? "খাবার ব্যবস্থা" : "Meals"}</span>
                          </div>
                          <p className="mt-1.5 text-sm font-medium text-ink whitespace-pre-line leading-relaxed">
                            {tour.meals}
                          </p>
                        </div>

                        {/* Stay / Accommodation */}
                        {tour.accommodation && (
                          <div className="pt-3.5 border-t border-ink/5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                              <Icon name="home" className="h-3.5 w-3.5 text-emerald" />
                              <span>{isBn ? "থাকার ব্যবস্থা" : "Stay / Accommodation"}</span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-ink whitespace-pre-line leading-relaxed">
                              {tour.accommodation}
                            </p>
                          </div>
                        )}

                        {/* Transportation */}
                        {tour.transportation && (
                          <div className="pt-3.5 border-t border-ink/5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                              <Icon name="route" className="h-3.5 w-3.5 text-emerald" />
                              <span>{isBn ? "যাতায়াত ব্যবস্থা" : "Transportation"}</span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-ink whitespace-pre-line leading-relaxed">
                              {tour.transportation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Reveal>

                {/* Meeting & Boarding Points */}
                <Reveal delay={0.12}>
                  <div className="glass glass-sweep h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                        <Icon name="mapPin" className="h-5 w-5 text-gold" />
                        {isBn ? "মিটিং ও বোর্ডিং পয়েন্ট" : "Meeting & Boarding Points"}
                      </h2>
                      <div className="mt-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                          {isBn ? "প্রধান মিটিং পয়েন্ট" : "Primary Meeting Point"}
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-ink">{tour.meetingPoint}</p>
                      </div>

                      {tour.pickupPoints && tour.pickupPoints.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-ink/5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint block mb-2">
                            {isBn ? "উপলব্ধ পিক-আপ পয়েন্ট:" : "Available Pick-up Spots:"}
                          </span>
                          <ul className="space-y-1.5 text-xs text-ink-soft">
                            {tour.pickupPoints.map((pt) => (
                              <li key={pt} className="flex items-center gap-2">
                                <span className="text-emerald-700">📍</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Payment Explainer Card */}
              <Reveal>
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald to-emerald-deep p-6 sm:p-7 text-white shadow-md">
                  <div className="relative z-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                        <Icon name="ticket" className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="font-display text-lg font-semibold">
                          {isBn ? "পেমেন্ট যেভাবে কাজ করে" : "How payment works"}
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-emerald-50/90">
                          {isBn ? (
                            <>
                              বুকিংয়ের সময় মাত্র {formatNumber(tour.advancePercent)}% অগ্রিম ({formatPrice(advance)}) বিকাশ পেমেন্ট অথবা সরাসরি হাতে নগদে পরিশোধ করুন। আপনার অফিসিয়াল ডিজিটাল টিকেট সাথে সাথে হোয়াটসঅ্যাপ ও ইমেইলে পৌঁছে যাবে। ভ্রমণের দিন বাকি টাকা বিকাশ পেমেন্টে বা সরাসরি ট্যুর ডিরেক্টরের কাছে নগদ পরিশোধ করুন।
                            </>
                          ) : (
                            <>
                              Book with a {tour.advancePercent}% advance ({formatPrice(advance)}) via bKash payment or pay cash by hand. Your official e-ticket arrives instantly on WhatsApp and email. On tour day, clear the remaining balance via bKash payment or in cash with your tour director.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Booking form */}
              <div id="book" className="scroll-mt-24 pt-4">
                <Reveal>
                  <div className="mb-4 text-center">
                    <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                      {isBn ? "আপনার আসন নিশ্চিত করুন" : "Reserve your seat"}
                    </h2>
                    <p className="text-sm text-ink-soft mt-1">
                      {isBn
                        ? "বুকিং নিশ্চিত করতে এবং বোর্ডিং পাস পেতে নিচের তথ্যগুলো পূরণ করুন।"
                        : "Fill out your details to lock in your booking and receive your boarding pass."}
                    </p>
                  </div>
                  <BookingForm tour={tour} finalPrice={final} advanceAmount={advance} />
                </Reveal>
              </div>

              {/* FAQs */}
              {tour.faqs.length > 0 && (
                <div className="pt-4">
                  <Reveal>
                    <h2 className="text-center font-display text-2xl font-semibold text-ink sm:text-3xl">
                      {isBn ? "সাধারণ জিজ্ঞাসাসমূহ" : "Common questions"}
                    </h2>
                  </Reveal>
                  <div className="mt-6 space-y-3">
                    {tour.faqs.map((faq, i) => (
                      <Reveal key={faq.question} delay={i * 0.05}>
                        <details className="glass group rounded-2xl p-5">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-ink">
                            {faq.question}
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald transition-transform duration-300 group-open:rotate-45">
                              <Icon name="support" className="h-4 w-4" />
                            </span>
                          </summary>
                          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                            {faq.answer}
                          </p>
                        </details>
                      </Reveal>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Sticky Pricing Sidebar) */}
            <div className="lg:col-span-4">
              <div className="sticky top-28 space-y-5">
                {/* Price card */}
                <div className="glass glass-sweep rounded-3xl p-6 sm:p-7 shadow-glass-lg border border-white/60">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-semibold">
                      <span>✓</span>
                      <span>{isBn ? "তাৎক্ষণিক নিশ্চিতকরণ" : "Instant Confirmation"}</span>
                    </span>
                    {tour.discount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-coral/10 text-coral border border-coral/20 px-2.5 py-0.5 text-xs font-bold">
                        {isBn ? `সাশ্রয় ${formatPrice(tour.discount)}` : `Save ${formatPrice(tour.discount)}`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    {tour.discount > 0 ? (
                      <>
                        <span className="text-base text-ink-faint line-through">
                          {formatPrice(original)}
                        </span>
                        <span className="font-display text-3xl sm:text-4xl font-bold text-emerald-deep">
                          {formatPrice(final)}
                        </span>
                      </>
                    ) : (
                      <span className="font-display text-3xl sm:text-4xl font-bold text-emerald-deep">
                        {formatPrice(final)}
                      </span>
                    )}
                    <span className="text-sm font-medium text-ink-faint">
                      {isBn ? "/ জনপ্রতি" : "/ person"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 rounded-2xl bg-pearl/60 border border-ink/5 p-4 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-faint">
                        {isBn ? "বুকিং অগ্রিম" : "Advance to book"}
                      </span>
                      <span className="font-bold text-emerald-800">
                        {formatPrice(advance)} ({formatNumber(tour.advancePercent)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-ink/5 pt-2">
                      <span className="text-ink-faint">
                        {isBn ? "বাকি অর্থ" : "Remaining balance"}
                      </span>
                      <span className="font-semibold text-ink">
                        {isBn ? `ট্যুরের দিন প্রদেয়: ${formatPrice(remaining)}` : `Due on tour day: ${formatPrice(remaining)}`}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="#book"
                    className="btn btn-emerald mt-5 w-full flex items-center justify-center gap-2 text-base font-semibold shadow-md"
                  >
                    <span>{isBn ? "আপনার আসন বুক করুন" : "Reserve Your Seat"}</span>
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Link>

                  <p className="mt-3 text-center text-xs text-ink-faint">
                    {isBn
                      ? "ট্যুর পুনঃনির্ধারিত হলে শতভাগ মূল্য ফেরত নিশ্চয়তা"
                      : "100% money-back guarantee if tour is rescheduled"}
                  </p>

                  <div className="mt-6 border-t border-ink/5 pt-5 space-y-2 text-xs text-ink-soft">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald font-bold">✓</span>
                      <span>
                        {isBn ? "অফিশিয়াল সাভার ট্যুর লাভার ই-টিকেট" : "Official Savar Tour Lover E-Ticket"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald font-bold">✓</span>
                      <span>
                        {isBn ? "যাচাইকৃত কোচ ও হোটেল বুকিং" : "Verified Coach & Hotel Reservation"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald font-bold">✓</span>
                      <span>
                        {isBn ? "বিকাশ পেমেন্ট গেটওয়ে ও সরাসরি ক্যাশ পরিশোধ" : "bKash Payment Gateway & Direct Cash Checkout"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Helpline / Direct Support Card */}
                <div className="glass rounded-3xl p-5 text-ink-soft border border-white/60 text-xs">
                  <div className="flex items-center gap-2.5 mb-2.5 text-sm font-bold text-ink">
                    <Icon name="support" className="h-5 w-5 text-emerald" />
                    <span>{isBn ? "বুকিং সংক্রান্ত সহায়তা দরকার?" : "Need Help Booking?"}</span>
                  </div>
                  <p className="mb-3 leading-relaxed">
                    {isBn
                      ? "আসন বা পছন্দের তারিখ সম্পর্কে জানতে চান? আমাদের টিম ২৪/৭ প্রস্তুত রয়েছে।"
                      : "Have questions about seats or custom dates? Our team is available 24/7."}
                  </p>
                  <div className="space-y-1.5 font-medium">
                    <a
                      href="tel:+8801620592884"
                      className="flex items-center gap-2 text-emerald-800 hover:text-emerald font-semibold"
                    >
                      <Icon name="phone" className="h-3.5 w-3.5" />
                      <span>+880 1620-592884</span>
                    </a>
                    <a
                      href="https://wa.me/8801646325350"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-teal-800 hover:text-teal font-semibold"
                    >
                      <Icon name="whatsapp" className="h-3.5 w-3.5" />
                      <span>WhatsApp: +880 1646-325350</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
