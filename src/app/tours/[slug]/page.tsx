import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TourDetailClient } from "@/components/TourDetailClient";
import type { TourHeroSlide } from "@/components/TourHeroBackgroundSlider";
import { fetchDestination, fetchTour } from "@/lib/api";
import { getBanglaWatermark } from "@/lib/banglaNames";

// ISR: cached for 120s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 30;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = await fetchTour(slug);
  if (!tour) return { title: "Tour not found" };

  const title = `${tour.title} Tour Package`;
  const description =
    tour.summary ||
    `Book ${tour.title} with Savar Tour Lover. Verified local hosts, transparent pricing, and unforgettable journeys in Bangladesh.`;
  const imageUrl = tour.cover?.imageUrl || "/images/logo-badge.png";

  return {
    title,
    description,
    alternates: {
      canonical: `/tours/${slug}`,
    },
    keywords: [
      tour.title,
      `${tour.title} tour package`,
      `${tour.title} ভ্রমণ প্যাকেজ`,
      `${tour.category} Bangladesh`,
      "Savar Tour Lover",
      "সাভার ট্যুর লাভার",
      "Bangladesh tour packages",
    ],
    openGraph: {
      title: `${title} | Savar Tour Lover`,
      description,
      url: `https://savartourlover.com/tours/${slug}`,
      siteName: "Savar Tour Lover",
      type: "website",
      images: [
        {
          url: imageUrl,
          alt: tour.title,
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

export default async function TourPage({ params }: PageProps) {
  const { slug } = await params;
  const tour = await fetchTour(slug);
  if (!tour) notFound();

  const destination = tour.destinationSlug ? await fetchDestination(tour.destinationSlug) : null;

  // Collect tour photos for the hero background auto-slide animation
  const heroBackgroundSlides: TourHeroSlide[] = [];
  const seenImageUrls = new Set<string>();

  const registerSlide = (slide: TourHeroSlide) => {
    const key = slide.image ? slide.image.trim() : `scene-${slide.sceneKey || slide.id}`;
    if (!seenImageUrls.has(key)) {
      seenImageUrls.add(key);
      heroBackgroundSlides.push(slide);
    }
  };

  // 1. Tour primary cover
  if (tour.cover?.imageUrl) {
    registerSlide({
      id: "tour-cover",
      image: tour.cover.imageUrl,
      title: tour.title,
      subtitle: destination?.name || tour.category,
      sceneKey: tour.cover.key,
    });
  }

  // 2. Tour gallery photos
  if (Array.isArray(tour.gallery)) {
    tour.gallery.forEach((g, idx) => {
      if (g.imageUrl) {
        registerSlide({
          id: `tour-gallery-${idx}`,
          image: g.imageUrl,
          title: g.label || tour.title,
          subtitle: destination?.name || tour.category,
          sceneKey: g.key,
        });
      }
    });
  }

  // 2b. Tour custom gallery items (admin uploaded)
  if (Array.isArray(tour.galleryItems)) {
    tour.galleryItems.forEach((gi, idx) => {
      if (gi.imageUrl) {
        registerSlide({
          id: `tour-gallery-item-${idx}`,
          image: gi.imageUrl,
          title: gi.title || gi.caption || tour.title,
          subtitle: destination?.name || tour.category,
        });
      }
    });
  }

  // 3. Destination cover and gallery
  if (destination) {
    if (destination.cover?.imageUrl) {
      registerSlide({
        id: "dest-cover",
        image: destination.cover.imageUrl,
        title: destination.name,
        subtitle: destination.region,
        sceneKey: destination.cover.key,
      });
    }

    if (Array.isArray(destination.gallery)) {
      destination.gallery.forEach((dg, idx) => {
        if (dg.imageUrl) {
          registerSlide({
            id: `dest-gallery-${idx}`,
            image: dg.imageUrl,
            title: dg.label || destination.name,
            subtitle: destination.region,
            sceneKey: dg.key,
          });
        }
      });
    }
  }

  // Fallback: If no photos were found, ensure cover or local scenery exists
  if (heroBackgroundSlides.length === 0) {
    heroBackgroundSlides.push({
      id: "slide-fallback-1",
      image: tour.cover?.imageUrl || "/images/mountain-hero.jpg",
      title: tour.title,
      subtitle: destination?.name || tour.category,
      sceneKey: tour.cover?.key || "bandarban",
    });
  }

  // Authentic Bengali Typography Watermark (Matches reference screenshot media_1789969477259.png)
  const watermarkText = getBanglaWatermark(
    tour.title,
    destination?.slug,
    destination?.name,
    destination?.bn
  );

  const tourJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TouristTrip",
        "@id": `https://savartourlover.com/tours/${tour.slug}#trip`,
        name: tour.title,
        description: tour.summary,
        touristType: tour.category,
        image: tour.cover?.imageUrl || undefined,
        provider: {
          "@type": "TravelAgency",
          name: "Savar Tour Lover",
          url: "https://savartourlover.com",
        },
        offers: {
          "@type": "Offer",
          price: tour.startingPrice - (tour.discount || 0),
          priceCurrency: "BDT",
          availability: "https://schema.org/InStock",
          url: `https://savartourlover.com/tours/${tour.slug}`,
          validFrom: new Date().toISOString().slice(0, 10),
        },
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
            name: "Tours",
            item: "https://savartourlover.com/tours",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tour.title,
            item: `https://savartourlover.com/tours/${tour.slug}`,
          },
        ],
      },
      ...(Array.isArray(tour.faqs) && tour.faqs.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: tour.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(tourJsonLd) }}
      />
      <TourDetailClient
        tour={tour}
        destination={destination}
        heroBackgroundSlides={heroBackgroundSlides}
        watermarkText={watermarkText}
      />
    </>
  );
}
