import type { Metadata } from "next";
import { fetchJournalPageCms, fetchJournalPosts } from "@/lib/api";
import { JournalClient } from "@/components/JournalClient";

// Incremental Static Regeneration (ISR): serves instantly from Vercel Edge CDN cache (<50ms TTFB).
// On-demand revalidation is triggered whenever an admin publishes edits via revalidatePublicContent().
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Travel Journal & Guides",
  description:
    "Field guides, food trails, travel itineraries, and honest stories from local tour hosts across Bangladesh.",
  alternates: {
    canonical: "/journal",
  },
  openGraph: {
    title: "Travel Journal & Guides | Savar Tour Lover",
    description:
      "Field guides, food trails, travel itineraries, and honest stories from local tour hosts across Bangladesh.",
    url: "https://savartourlover.com/journal",
    siteName: "Savar Tour Lover",
    type: "website",
    images: [{ url: "/images/logo-badge.png" }],
  },
};

export default async function JournalPage() {
  const [live, cms] = await Promise.all([
    fetchJournalPosts(),
    fetchJournalPageCms(),
  ]);

  const journalPosts = live ?? [];

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
        name: "Travel Journal",
        item: "https://savartourlover.com/journal",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <JournalClient journalPosts={journalPosts} cms={cms} />
    </>
  );
}
