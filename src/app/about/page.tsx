import type { Metadata } from "next";
import { fetchAboutPageCms } from "@/lib/api";
import { DEFAULT_ABOUT_CMS } from "@/server/db";
import { AboutClient } from "@/components/AboutClient";

// ISR: cached for 300s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "About Us & Our Story",
  description:
    "The story, values, and local hosts behind Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন। Curated domestic tours across Bangladesh with radical transparency.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Us & Our Story | Savar Tour Lover",
    description:
      "The story, values, and local hosts behind Savar Tour Lover — আপনার স্বপ্ন উড়তে দিন। Curated domestic tours across Bangladesh.",
    url: "https://savartourlover.com/about",
    siteName: "Savar Tour Lover",
    type: "website",
    images: [{ url: "/images/logo-badge.png" }],
  },
};

export default async function AboutPage() {
  const cms = await fetchAboutPageCms();
  const defaultValues = DEFAULT_ABOUT_CMS.values || [];
  const defaultTeam = DEFAULT_ABOUT_CMS.team || [];
  const defaultParagraphs = DEFAULT_ABOUT_CMS.story_paragraphs || [];

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
        name: "About Us",
        item: "https://savartourlover.com/about",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <AboutClient
        cms={cms}
        defaultValues={defaultValues}
        defaultTeam={defaultTeam}
        defaultParagraphs={defaultParagraphs}
      />
    </>
  );
}
