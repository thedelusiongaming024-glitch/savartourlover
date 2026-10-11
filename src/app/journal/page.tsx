import type { Metadata } from "next";
import { fetchJournalPageCms, fetchJournalPosts } from "@/lib/api";
import { JournalClient } from "@/components/JournalClient";

// ISR: cached for 180s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 180;

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
