"use client";

import Link from "next/link";
import { Atmosphere } from "@/components/Atmosphere";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { SectionHeading } from "@/components/SectionHeading";
import { JournalCard } from "@/components/JournalCard";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { JournalPost } from "@/lib/types";
import type { JournalPageCmsContent } from "@/server/types";

interface JournalClientProps {
  journalPosts: JournalPost[];
  cms: JournalPageCmsContent;
}

function JournalFeatured({ post }: { post: JournalPost }) {
  return (
    <Link href={`/journal/${post.slug}`} className="group block h-full">
      <SceneBackdrop
        scene={post.cover}
        className="h-full min-h-[280px] w-full transition-transform duration-700 ease-out group-hover:scale-105"
        showLabel={false}
      />
      <span className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-emerald-deep backdrop-blur transition-transform duration-300 group-hover:translate-x-1">
        <Icon name="arrowRight" className="h-5 w-5" />
      </span>
    </Link>
  );
}

export function JournalClient({ journalPosts, cms }: JournalClientProps) {
  const { isBn, t, formatNumber } = useLanguage();

  const hasPosts = journalPosts.length > 0;
  const featuredIndex = journalPosts.findIndex((p) => p.isFeatured);
  const featured = featuredIndex !== -1 ? journalPosts[featuredIndex] : journalPosts[0];
  const rest =
    featuredIndex !== -1
      ? journalPosts.filter((_, i) => i !== featuredIndex)
      : journalPosts.slice(1);

  // Helper to check if string contains Bengali characters
  const hasBengali = (str?: string) => Boolean(str && /[\u0980-\u09FF]/.test(str));

  // Localized headers: prioritize admin CMS if it contains Bengali, otherwise use translation dictionary
  const eyebrow =
    (isBn
      ? (hasBengali(cms.header_eyebrow) ? cms.header_eyebrow : t("journalPage.eyebrow", "ভ্রমণ জার্নাল"))
      : cms.header_eyebrow) || "Travel Journal";
  const title =
    (isBn
      ? (hasBengali(cms.header_title) ? cms.header_title : t("journalPage.title", "পথের গল্প ও অভিজ্ঞতা"))
      : cms.header_title) || "Stories from the road";
  const description =
    (isBn
      ? (hasBengali(cms.header_description)
          ? cms.header_description
          : t("journalPage.description", "আমাদের স্থানীয় হোস্ট ও পর্যটকদের স্বচক্ষে দেখা অভিজ্ঞতা, রোমাঞ্চ, খাদ্য অন্বেষণ ও খাঁটি ফিল্ড নোটস।"))
      : cms.header_description) ||
    "Field guides, food trails, and honest travel writing from our hosts and guests across Bangladesh.";

  const featuredBadge = isBn
    ? (hasBengali(cms.featured_badge) ? cms.featured_badge : t("journalPage.featuredBadge", "বিশেষ গল্প"))
    : cms.featured_badge || "Latest story";
  const emptyTitle = isBn
    ? (hasBengali(cms.empty_title) ? cms.empty_title : t("journalPage.emptyTitle", "এখনও কোনো গল্প প্রকাশিত হয়নি"))
    : cms.empty_title || "No articles published yet";
  const emptyDescription = isBn
    ? (hasBengali(cms.empty_description)
        ? cms.empty_description
        : t("journalPage.emptyDescription", "সুপার অ্যাডমিন প্যানেল থেকে লেখা ও প্রকাশিত হলে এখানে সব গল্প ও ভ্রমণ নির্দেশিকা দেখা যাবে।"))
    : cms.empty_description ||
      "Stories, packing guides, and field notes will appear here once written and published from the Super Admin Panel.";

  const readMoreLabel = isBn ? t("journalPage.readMore", "পড়ুন") : "Read story";

  // Helper to format read time
  const formatReadTime = (readTimeStr?: string) => {
    if (!readTimeStr) return isBn ? "৫ মিনিট পাঠ" : "5 min read";
    if (!isBn) return readTimeStr;
    const digitsMatch = readTimeStr.match(/\d+/);
    if (digitsMatch) {
      return `${formatNumber(digitsMatch[0])} মিনিট পাঠ`;
    }
    return readTimeStr;
  };

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-12 pt-32 sm:px-6 sm:pt-40">
        <Atmosphere intensity={0.25} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {!hasPosts ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <h3 className="font-display text-lg font-semibold text-ink">
                {emptyTitle}
              </h3>
              <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
                {emptyDescription}
              </p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featured && (
                <Stagger className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
                  <StaggerItem>
                    <div className="relative h-full min-h-[280px] overflow-hidden rounded-3xl">
                      <JournalFeatured post={featured} />
                    </div>
                  </StaggerItem>
                  <StaggerItem className="flex flex-col justify-center gap-4 lg:p-6">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                      {featuredBadge}
                    </span>
                    <h1 className="font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                      {featured.title}
                    </h1>
                    <p className="text-base leading-relaxed text-ink-soft">
                      {featured.excerpt}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-ink-faint">
                      <span>{featured.author}</span>
                      <span>·</span>
                      <span>{featured.date}</span>
                      <span>·</span>
                      <span>{formatReadTime(featured.readTime)}</span>
                    </div>
                    <div>
                      <Link
                        href={`/journal/${featured.slug}`}
                        className="btn btn-emerald inline-flex items-center gap-2"
                      >
                        <span>{readMoreLabel}</span>
                        <Icon name="arrowRight" className="h-4 w-4" />
                      </Link>
                    </div>
                  </StaggerItem>
                </Stagger>
              )}

              {/* Grid of other articles */}
              {rest.length > 0 && (
                <div className="mt-16">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                      {isBn ? "অন্যান্য গল্প ও নির্দেশিকা" : "More stories & guides"}
                    </h2>
                    <span className="text-xs font-medium text-ink-faint">
                      {isBn
                        ? `${formatNumber(rest.length)}টি গল্প`
                        : `${rest.length} stories`}
                    </span>
                  </div>
                  <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
                    {rest.map((post) => (
                      <StaggerItem key={post.slug} className="h-full">
                        <JournalCard post={post} />
                      </StaggerItem>
                    ))}
                  </Stagger>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
