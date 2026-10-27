import type { Metadata } from "next";
import Link from "next/link";
import { Atmosphere } from "@/components/Atmosphere";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { SectionHeading } from "@/components/SectionHeading";
import { DestinationCard } from "@/components/DestinationCard";
import { DestinationPromptBox } from "@/components/DestinationPromptBox";
import { PopularDestinationsCoverflow } from "@/components/PopularDestinationsCoverflow";
import { fetchDestinations } from "@/lib/api";

// ISR: cached for 180s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 180;

export const metadata: Metadata = {
  title: "Explore Destinations Across Bangladesh",
  description:
    "Explore the top travel destinations of Bangladesh — Cox's Bazar, Sajek Valley, Sundarbans, Sylhet tea country, Saint Martin, and Bandarban. Handcrafted routes hosted by verified locals.",
  alternates: {
    canonical: "/destinations",
  },
  openGraph: {
    title: "Explore Destinations Across Bangladesh | Savar Tour Lover",
    description:
      "Explore the top travel destinations of Bangladesh — Cox's Bazar, Sajek Valley, Sundarbans, Sylhet tea country, Saint Martin, and Bandarban.",
    url: "https://savartourlover.com/destinations",
    siteName: "Savar Tour Lover",
    type: "website",
    images: [{ url: "/images/logo-badge.png" }],
  },
};

export default async function DestinationsPage() {
  const destinations = await fetchDestinations();

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://savartourlover.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Destinations",
        item: "https://savartourlover.com/destinations",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      {/* ============ HERO HEADER ============ */}
      <section className="relative overflow-hidden px-4 pb-4 pt-24 sm:px-6 sm:pb-8 sm:pt-36">
        <Atmosphere intensity={0.25} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Destinations"
            eyebrowBn="ভ্রমণ গন্তব্য"
            title="Twelve regions. One extraordinary country."
            titleBn="বারোটি অঞ্চল। একটি অপরূপ বাংলাদেশ।"
            description="Beaches, hill tracts, mangrove forests, tea gardens, and two millennia of history — every corner of Bangladesh, hosted by people who call it home."
            descriptionBn="সৈকত, পাহাড়, ম্যানগ্রোভ বন, চায়ের বাগান আর প্রাচীন ইতিহাস — বাংলাদেশের প্রতিটি কোণে নির্ভরযোগ্য স্থানীয় আতিথেয়তা।"
          />
        </div>
      </section>

      {/* ============ NEW PREMIUM 3D COVERFLOW SHOWCASE ============ */}
      {destinations.length > 0 && (
        <PopularDestinationsCoverflow
          destinations={destinations}
          title="Popular Destinations"
          titleBn="জনপ্রিয় ভ্রমণ গন্তব্য"
          subtitle="Explore Bangladesh's most iconic travel spots with live tour packages"
          subtitleBn="লাইভ ট্যুর প্যাকেজ সহ বাংলাদেশের সবচেয়ে আকর্ষণীয় ও জনপ্রিয় ভ্রমণ স্পটসমূহ"
        />
      )}

      {/* ============ PREVIOUS COMPLETE GRID STRUCTURE ============ */}
      <section className="px-4 pb-24 pt-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <SectionHeading
              align="left"
              eyebrow="All Regions"
              eyebrowBn="সকল অঞ্চল"
              title="All Travel Destinations & Regions"
              titleBn="সকল ভ্রমণ গন্তব্য ও অঞ্চল"
              description="Browse every destination across Bangladesh. Filter by region, discover local attractions, and book guided tour packages."
              descriptionBn="বাংলাদেশের প্রতিটি গন্তব্য ঘুরে দেখুন। অঞ্চল নির্বাচন করুন এবং আপনার পছন্দের প্যাকেজ বেছে নিন।"
            />
          </div>

          {destinations.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <h3 className="font-display text-lg font-semibold text-ink">No destinations listed yet</h3>
              <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
                Explore packages and destinations once added and published from the Super Admin Panel.
              </p>
            </div>
          ) : (
            <Stagger className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:grid-cols-3" stagger={0.08}>
              {destinations.map((d) => (
                <StaggerItem key={d.slug}>
                  <DestinationCard destination={d} />
                </StaggerItem>
              ))}
            </Stagger>
          )}

          <DestinationPromptBox />
        </div>
      </section>
    </>
  );
}
