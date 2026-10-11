import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Atmosphere } from "@/components/Atmosphere";
import { Reveal } from "@/components/Reveal";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { TourCard } from "@/components/TourCard";
import { SceneBackdrop } from "@/components/SceneBackdrop";
import { Icon } from "@/components/Icon";
import { fetchDestination, fetchTour } from "@/lib/api";

// ISR: cached for 180s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 180;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = await fetchDestination(slug);
  if (!destination) return { title: "Destination not found" };

  const title = `${destination.name} Travel Guide`;
  const description = `${destination.tagline || destination.name}. ${destination.description.slice(0, 150)}`;
  const imageUrl = destination.cover?.imageUrl || "/images/logo-badge.png";

  return {
    title,
    description,
    alternates: {
      canonical: `/destinations/${slug}`,
    },
    openGraph: {
      title: `${title} | Savar Tour Lover`,
      description,
      url: `https://savartourlover.com/destinations/${slug}`,
      siteName: "Savar Tour Lover",
      type: "website",
      images: [
        {
          url: imageUrl,
          alt: destination.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Savar Tour Lover`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DestinationPage({ params }: PageProps) {
  const { slug } = await params;
  const destination = await fetchDestination(slug);
  if (!destination) notFound();

  const destinationTours = (
    await Promise.all(destination.tourSlugs.map((s) => fetchTour(s)))
  ).filter((t): t is NonNullable<typeof t> => Boolean(t));

  const destinationJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristDestination",
        "@id": `https://savartourlover.com/destinations/${destination.slug}#destination`,
        name: destination.name,
        description: destination.description,
        image: destination.cover?.imageUrl || undefined,
        containedInPlace: {
          "@type": "Country",
          name: "Bangladesh",
        },
        touristType: destination.region,
      },
      {
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
          {
            "@type": "ListItem",
            position: 3,
            name: destination.name,
            item: `https://savartourlover.com/destinations/${destination.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(destinationJsonLd) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-14 pt-32 sm:px-6 sm:pt-40">
        <Atmosphere intensity={0.28} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <Reveal>
            <Link
              href="/destinations"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint transition-colors hover:text-emerald"
            >
              <Icon name="arrow" className="h-4 w-4 -scale-x-100" />
              All destinations
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl md:text-6xl">
                    {destination.name}
                  </h1>
                  <span className="mt-2 font-display text-xl font-medium text-ink-faint sm:text-2xl">
                    {destination.bn}
                  </span>
                </div>
                <p className="mt-3 font-display text-lg text-emerald-deep sm:text-xl">
                  {destination.tagline}
                </p>
                <p className="mt-1 text-sm font-medium text-ink-faint">
                  {destination.region}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Overview + gallery */}
      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <p className="text-lg leading-relaxed text-ink-soft">
              {destination.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm">
                <Icon name="calendar" className="h-4 w-4 text-emerald" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    Best time
                  </div>
                  <div className="font-medium text-ink">{destination.bestTime}</div>
                </div>
              </div>
              <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm">
                <Icon name="sun" className="h-4 w-4 text-gold" />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    Weather
                  </div>
                  <div className="font-medium text-ink">{destination.weather}</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <SceneBackdrop
              scene={destination.cover}
              className="aspect-[16/10] w-full rounded-3xl"
            />
          </Reveal>
        </div>
      </section>

      {/* Details */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          {/* Attractions */}
          <Reveal>
            <div className="glass glass-sweep h-full rounded-3xl p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Icon name="mapPin" className="h-5 w-5 text-emerald" />
                Attractions & activities
              </h2>
              <ul className="mt-4 space-y-3">
                {destination.attractions.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Accommodation */}
          <Reveal delay={0.06}>
            <div className="glass glass-sweep h-full rounded-3xl p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Icon name="home" className="h-5 w-5 text-gold" />
                Where you&apos;ll stay
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {destination.accommodation}
              </p>
            </div>
          </Reveal>

          {/* Travel tips */}
          <Reveal delay={0.12}>
            <div className="glass glass-sweep h-full rounded-3xl p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Icon name="sparkle" className="h-5 w-5 text-coral" />
                Local travel tips
              </h2>
              <ul className="mt-4 space-y-3">
                {destination.travelTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral">
                      <Icon name="star" className="h-3 w-3" />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tours in this destination */}
      <section className="relative bg-pearl-deep/60 px-4 py-14 sm:px-6">
        <Atmosphere intensity={0.15} />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                Tours in {destination.name}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Curated packages hosted by our local team.
              </p>
            </div>
            <Link href="/tours" className="btn btn-glass shrink-0">
              All tours
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          {destinationTours.length > 0 ? (
            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
              {destinationTours.map((tour) => (
                <StaggerItem key={tour.slug} className="h-full">
                  <TourCard tour={tour} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <Reveal className="mt-10">
              <div className="glass rounded-3xl p-8 text-center text-ink-soft">
                Tours for this destination are being finalized.{" "}
                <Link href="/contact" className="font-semibold text-emerald underline-offset-2 hover:underline">
                  Ask us to plan one
                </Link>
                .
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
