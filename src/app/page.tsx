import Link from "next/link";

// ISR: cached for 120s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 30;
import { Atmosphere } from "@/components/Atmosphere";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { SectionHeading } from "@/components/SectionHeading";
import { DestinationCard } from "@/components/DestinationCard";
import { PopularDestinationsCoverflow } from "@/components/PopularDestinationsCoverflow";
import { PopularToursExplorer } from "@/components/PopularToursExplorer";
import { ServiceCard } from "@/components/ServiceCard";
import { OfferCard } from "@/components/OfferCard";
import { ReviewCard } from "@/components/ReviewCard";
import { JournalCard } from "@/components/JournalCard";
import { CtaBanner } from "@/components/CtaBanner";
import { HomeHero } from "@/components/HomeHero";
import { WhyUsItem } from "@/components/WhyUsItem";
import { LocalizedButtonLink } from "@/components/LocalizedButtonLink";
import { Icon } from "@/components/Icon";
import { normalizeImageUrl } from "@/lib/media";
import { getTourCategories } from "@/server/db";
import {
  heroStats,
  whyUs,
  services,
  destinationsForHome,
  siteName,
  siteNameBn,
} from "@/data/site";
import { fetchDestinations, fetchHomePageCms, fetchHomepageBlocks, fetchJournalPosts, fetchOffers, fetchTestimonials, fetchTours } from "@/lib/api";

/** Reads a string field out of a block's loosely-typed JSON content, or null. */
function str(content: Record<string, unknown>, key: string): string | null {
  const v = content[key];
  return typeof v === "string" && v.trim() ? v : null;
}

export default async function Home() {
  const [destinations, tours, journalPosts, specialOffers, reviews, blocks, homeCms] = await Promise.all([
    fetchDestinations(),
    fetchTours(),
    fetchJournalPosts(),
    fetchOffers(),
    fetchTestimonials(),
    fetchHomepageBlocks(),
    fetchHomePageCms(),
  ]);

  // Admin-editable homepage blocks (Django admin -> Homepage Blocks). See
  // cms/models.py's HomepageBlock.content help_text for the exact schema
  // per block_type. Every value here is optional — anything an admin
  // hasn't filled in falls back to the site's built-in default copy, so a
  // half-filled-in block never breaks the page.
  const heroBlock = blocks.find((b) => b.blockType === "hero");
  const heroContent = heroBlock?.content ?? {};
  const heroStatsOverride = Array.isArray(heroContent.stats)
    ? (heroContent.stats as unknown[])
        .filter((s): s is { value?: unknown; label?: unknown } => typeof s === "object" && s !== null)
        .map((s) => ({ value: typeof s.value === "string" ? s.value : "", label: typeof s.label === "string" ? s.label : "" }))
        .filter((s) => s.value && s.label)
    : null;

  // Freeform blocks (rich_text / image / cta / gallery) render as extra
  // sections, in the order an admin arranges them, right after the hero —
  // this is the one place in the page an admin can add net-new content
  // rather than just override existing sections' copy.
  const freeformBlocks = blocks.filter((b) =>
    ["rich_text", "image", "cta", "gallery"].includes(b.blockType)
  );

  // Featured destinations for homepage from database
  const featuredDestinations = destinations.slice(0, 12);

  const popularTours = [...tours].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
  );
  const tourCategories = getTourCategories().filter((c) => c.is_active !== false);
  const journalPreview = journalPosts.slice(0, 3);

  const destinationGridBlock = blocks.find((b) => b.blockType === "destination_grid");
  const featuredToursBlock = blocks.find((b) => b.blockType === "featured_tours");
  const testimonialsBlock = blocks.find((b) => b.blockType === "testimonials");
  const showDestinationsSection =
    homeCms.destinations_hidden !== true &&
    destinationGridBlock?.content.hidden !== true &&
    featuredDestinations.length > 0;
  const showFeaturedToursSection =
    homeCms.tours_hidden !== true &&
    featuredToursBlock?.content.hidden !== true &&
    popularTours.length > 0;
  const showTestimonialsSection =
    homeCms.reviews_hidden !== true &&
    testimonialsBlock?.content.hidden !== true &&
    reviews.length > 0;

  const whyUsList = homeCms.why_us_items && homeCms.why_us_items.length > 0 ? homeCms.why_us_items : whyUs;
  const servicesList = homeCms.services_items && homeCms.services_items.length > 0 ? homeCms.services_items : services;

  return (
    <>
      {/* ============ HERO ============ */}
      <HomeHero
        mediaType={homeCms.hero_media_type ?? (heroContent.hero_media_type as "slideshow" | "video") ?? (heroContent.media_type as "slideshow" | "video") ?? "slideshow"}
        videoUrl={homeCms.hero_video_url || str(heroContent, "hero_video_url") || str(heroContent, "video_url")}
        slides={
          homeCms.hero_slides && homeCms.hero_slides.length > 0
            ? homeCms.hero_slides
            : (Array.isArray(heroContent.slides) && heroContent.slides.length > 0
                ? (heroContent.slides as any)
                : (destinations.length > 0
                    ? destinations.map((d) => ({
                        id: `slide-${d.slug}`,
                        title: d.name,
                        subtitle: d.tagline || d.region,
                        image_url: d.cover?.imageUrl || "/images/mountain-hero.jpg",
                      }))
                    : undefined
                  )
              )
        }
        eyebrow={homeCms.hero_eyebrow || str(heroContent, "eyebrow")}
        headline={homeCms.hero_headline || str(heroContent, "headline")}
        highlight={homeCms.hero_highlight || str(heroContent, "highlight")}
        subheadline={homeCms.hero_subheadline || str(heroContent, "subheadline")}
        primaryCtaLabel={homeCms.hero_primary_cta_label || str(heroContent, "primary_cta_label")}
        primaryCtaHref={homeCms.hero_primary_cta_href || str(heroContent, "primary_cta_href")}
        secondaryCtaLabel={homeCms.hero_secondary_cta_label || str(heroContent, "secondary_cta_label")}
        secondaryCtaHref={homeCms.hero_secondary_cta_href || str(heroContent, "secondary_cta_href")}
        statsOverride={heroStatsOverride}
      />

      {/* ============ ADMIN-EDITABLE FREEFORM BLOCKS ============ */}
      {/* rich_text / image / cta / gallery HomepageBlocks, in the order an
          admin arranges them in Django Admin. This is the one spot in the
          page an admin can add genuinely new sections, not just override
          existing ones' copy — see cms/models.py's HomepageBlock.content
          help_text for the schema each block_type reads. */}
      {freeformBlocks.map((block) => {
        const c = block.content;
        if (block.blockType === "rich_text") {
          const heading = str(c, "heading");
          const body = str(c, "body");
          if (!heading && !body) return null;
          return (
            <section key={block.id} className="px-4 py-16 sm:px-6 sm:py-20">
              <div className="mx-auto max-w-3xl text-center">
                <SectionHeading eyebrow={str(c, "eyebrow") ?? undefined} title={heading ?? ""} />
                {body && (
                  <div className="mt-6 space-y-4 text-left text-[15px] leading-relaxed text-ink-soft">
                    {body.split("\n\n").filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        }
        if (block.blockType === "image") {
          const imageUrl = normalizeImageUrl(str(c, "image_url"));
          if (!imageUrl) return null;
          const img = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={str(c, "caption") ?? ""}
              className="mx-auto max-h-[32rem] w-full max-w-5xl rounded-[2rem] object-cover shadow-glass-lg"
            />
          );
          return (
            <section key={block.id} className="px-4 py-12 sm:px-6">
              {str(c, "href") ? <Link href={str(c, "href")!}>{img}</Link> : img}
              {str(c, "caption") && (
                <p className="mx-auto mt-3 max-w-5xl text-center text-sm text-ink-faint">{str(c, "caption")}</p>
              )}
            </section>
          );
        }
        if (block.blockType === "cta") {
          const heading = str(c, "heading");
          if (!heading) return null;
          // CtaBanner renders its own <section> with its own padding —
          // wrapping it in another <section> here would double the
          // vertical padding and nest <section> tags.
          return (
            <CtaBanner
              key={block.id}
              eyebrow={str(c, "eyebrow") ?? undefined}
              title={heading}
              description={str(c, "body") ?? undefined}
              ctaLabel={str(c, "cta_label") ?? undefined}
              ctaHref={str(c, "cta_href") ?? undefined}
            />
          );
        }
        if (block.blockType === "gallery") {
          const images = Array.isArray(c.images) ? (c.images as unknown[]) : [];
          const heading = str(c, "heading");
          if (images.length === 0) return null;
          return (
            <section key={block.id} className="px-4 py-16 sm:px-6 sm:py-20">
              <div className="mx-auto max-w-6xl">
                {heading && <SectionHeading title={heading} />}
                <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {images
                    .filter((img): img is { url?: unknown; caption?: unknown } => typeof img === "object" && img !== null)
                    .map((img, i) =>
                      typeof img.url === "string" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={normalizeImageUrl(img.url)}
                          alt={typeof img.caption === "string" ? img.caption : ""}
                          className="aspect-square w-full rounded-2xl object-cover"
                        />
                      ) : null
                    )}
                </div>
              </div>
            </section>
          );
        }
        return null;
      })}

      {showDestinationsSection && (
        <PopularDestinationsCoverflow
          destinations={featuredDestinations}
          title={homeCms.destinations_title || str(destinationGridBlock?.content ?? {}, "heading") || "Popular Destinations"}
          titleBn="জনপ্রিয় ভ্রমণ গন্তব্য"
          subtitle={
            homeCms.destinations_description ||
            str(destinationGridBlock?.content ?? {}, "description") ||
            "Explore Bangladesh's most iconic travel spots"
          }
          subtitleBn="বাংলাদেশের সবচেয়ে আকর্ষণীয় ও জনপ্রিয় ভ্রমণ স্পটসমূহ"
          showAllLink={true}
          allLinkHref={homeCms.destinations_cta_href || "/destinations"}
          allLinkLabelEn={homeCms.destinations_cta_label || "All destinations"}
          allLinkLabelBn="সকল গন্তব্য"
        />
      )}

      {showFeaturedToursSection && (
      /* ============ POPULAR TOURS ============ */
      <section className="relative bg-pearl-deep/60 px-4 py-16 sm:px-6 sm:py-24">
        <Atmosphere intensity={0.18} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={homeCms.tours_eyebrow || str(featuredToursBlock?.content ?? {}, "eyebrow") || "Tour Packages"}
            eyebrowBn="ট্যুর প্যাকেজ"
            title={homeCms.tours_title || str(featuredToursBlock?.content ?? {}, "heading") || "Popular tour packages"}
            titleBn="জনপ্রিয় ট্যুর প্যাকেজসমূহ"
            description={
              homeCms.tours_description ||
              str(featuredToursBlock?.content ?? {}, "description") ||
              "Small groups, local hosts, and everything included. Browse packages by tour category to find your trip in seconds."
            }
            descriptionBn="ছোট গ্রুপ, অভিজ্ঞ লোকাল হোস্ট এবং সকল সুবিধা সহ। ক্যাটাগরি অনুযায়ী সহজে আপনার পছন্দমতো ট্যুর খুঁজুন।"
          />
          <Reveal delay={0.1} className="mt-12">
            <PopularToursExplorer
              tours={popularTours}
              destinations={destinations}
              categories={tourCategories.map((c) => ({
                name: c.name,
                slug: c.slug,
                icon: c.icon,
              }))}
            />
          </Reveal>
          <Reveal className="mt-10 text-center">
            <LocalizedButtonLink
              href={homeCms.tours_cta_href || "/tours"}
              labelEn={homeCms.tours_cta_label || "Browse all tours"}
              labelBn="সকল ট্যুর প্যাকেজ দেখুন"
              className="btn btn-emerald"
            />
          </Reveal>
        </div>
      </section>
      )}

      {/* ============ WHY US ============ */}
      {homeCms.why_us_hidden !== true && (
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
            <SectionHeading
              align="left"
              eyebrow={homeCms.why_us_eyebrow || `Why ${siteName}`}
              eyebrowBn={`কেন ${siteName}`}
              title={homeCms.why_us_title || "Travel with people who call Bangladesh home"}
              titleBn="ভ্রমণ করুন যাদের ঘর এই বাংলাদেশ"
              description={
                homeCms.why_us_description ||
                "We're not a booking platform that outsources your trip to strangers. We're local hosts who plan, accompany, and settle every detail — including your final payment, confirmed on both sides."
              }
              descriptionBn="আমরা কোনো থার্ড-পার্টি বুকিং সাইট নই যারা অপরিচিতদের হাতে আপনার ভ্রমণ ছেড়ে দেয়। আমরা লোকাল হোস্ট যারা সবকিছু পরিকল্পনা করে, সাথে থাকে এবং শতভাগ স্বচ্ছতা নিশ্চিত করে।"
            />
            <Stagger className="grid grid-cols-2 gap-2.5 sm:gap-4" stagger={0.08}>
              {whyUsList.map((item) => (
                <StaggerItem key={item.title}>
                  <WhyUsItem title={item.title} description={item.description} icon={item.icon} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>
      )}

      {/* ============ SERVICES ============ */}
      {homeCms.services_hidden !== true && (
      <section className="relative bg-pearl-deep/60 px-4 py-16 sm:px-6 sm:py-24">
        <Atmosphere intensity={0.15} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={homeCms.services_eyebrow || "Services"}
            eyebrowBn="আমাদের সেবাসমূহ"
            title={homeCms.services_title || "Every kind of trip, handled"}
            titleBn="সব ধরণের ভ্রমণের পরিপূর্ণ সমাধান"
            description={
              homeCms.services_description ||
              "Group or private, family or honeymoon, weekend or expedition — if it's in Bangladesh, we'll host it."
            }
            descriptionBn="গ্রুপ বা ব্যক্তিগত, পরিবার কিংবা হানিমুন, উইকেন্ড ট্রিপ বা অ্যাডভেঞ্চার — বাংলাদেশে যে কোনো ভ্রমণ আয়োজনে আমরা আছি।"
          />
          <Stagger className="mt-8 sm:mt-12 grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5" stagger={0.08}>
            {servicesList.map((service) => (
              <StaggerItem key={service.title} className="h-full">
                <ServiceCard service={service} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
      )}

      {/* ============ SPECIAL OFFERS ============ */}
      {homeCms.offers_hidden !== true && specialOffers.length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              eyebrow={homeCms.offers_eyebrow || "Special Offers"}
              eyebrowBn="বিশেষ অফার"
              title={homeCms.offers_title || "A little reason to book today"}
              titleBn="আজই বুক করার বিশেষ সুযোগ"
              description={
                homeCms.offers_description ||
                "Seasonal savings and group perks — applied automatically at checkout with the right code."
              }
              descriptionBn="মৌসুমি ছাড় এবং গ্রুপ ডিসকাউন্ট — সঠিক কোড ব্যবহারে বুকিংয়ে পান বিশেষ সুবিধা।"
            />
            <Stagger className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-5" stagger={0.1}>
              {specialOffers.map((offer) => (
                <StaggerItem key={offer.code} className="h-full">
                  <OfferCard offer={offer} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {showTestimonialsSection && (
      /* ============ REVIEWS ============ */
      <section className="relative bg-pearl-deep/60 px-4 py-16 sm:px-6 sm:py-24">
        <Atmosphere intensity={0.15} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={homeCms.reviews_eyebrow || str(testimonialsBlock?.content ?? {}, "eyebrow") || "Customer Reviews"}
            eyebrowBn="ভ্রমণকারীদের মন্তব্য"
            title={homeCms.reviews_title || str(testimonialsBlock?.content ?? {}, "heading") || "Loved by travelers across Bangladesh"}
            titleBn="ভ্রমণকারীদের বিশ্বাস ও ভালোবাসা"
            description={
              homeCms.reviews_description ||
              str(testimonialsBlock?.content ?? {}, "description") ||
              "Real words from guests who booked, travelled, and settled their balances — all in one seamless flow."
            }
            descriptionBn="আমাদের সাথে যারা পাহাড়, নদী এবং সমুদ্র চষে বেড়িয়েছেন তাদের বাস্তব অভিজ্ঞতা।"
          />
          <Stagger className="mt-8 sm:mt-12 grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5" stagger={0.08}>
            {reviews.slice(0, 6).map((review) => (
              <StaggerItem key={review.name} className="h-full">
                <ReviewCard review={review} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
      )}

      {/* ============ JOURNAL ============ */}
      {homeCms.journal_hidden !== true && journalPreview.length > 0 && (
        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading
                align="left"
                eyebrow={homeCms.journal_eyebrow || "Travel Journal"}
                eyebrowBn="ভ্রমণ কথা"
                title={homeCms.journal_title || "Stories from the road"}
                titleBn="পথের গল্প ও দিকনির্দেশনা"
                description={
                  homeCms.journal_description ||
                  "Field guides, food trails, and honest travel writing from our hosts and guests."
                }
                descriptionBn="আমাদের হোস্ট এবং ভ্রমণকারীদের চোখ দিয়ে দেখা বাংলাদেশ, লোকাল গাইড ও বাস্তব অভিজ্ঞতা।"
              />
              <LocalizedButtonLink
                href={homeCms.journal_cta_href || "/journal"}
                labelEn={homeCms.journal_cta_label || "All stories"}
                labelBn="সকল ভ্রমণ গল্প"
              />
            </div>
            <Stagger className="mt-6 sm:mt-10 grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-5" stagger={0.1}>
              {journalPreview.map((post) => (
                <StaggerItem key={post.slug} className="h-full">
                  <JournalCard post={post} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {/* ============ CTA ============ */}
      {homeCms.cta_hidden !== true && (
        <CtaBanner
          eyebrow={homeCms.cta_eyebrow}
          title={homeCms.cta_title}
          description={homeCms.cta_description}
          ctaLabel={homeCms.cta_primary_label}
          ctaHref={homeCms.cta_primary_href}
          secondaryCtaLabel={homeCms.cta_secondary_label}
          secondaryCtaHref={homeCms.cta_secondary_href}
        />
      )}

      {/* Hidden bilingual touch */}
      <div className="sr-only">
        {siteName} {siteNameBn}
      </div>
    </>
  );
}
