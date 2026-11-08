import type { Metadata } from "next";
import { fetchJournalPageCms, fetchJournalPosts } from "@/lib/api";
import { JournalClient } from "@/components/JournalClient";

// Dynamic rendering: reads from in-memory RAM in sub-millisecond time.
// Ensures admin edits reflect instantly without stale cache mismatch.
export const dynamic = "force-dynamic";

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
