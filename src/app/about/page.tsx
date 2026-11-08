import type { Metadata } from "next";
import { fetchAboutPageCms } from "@/lib/api";
import { DEFAULT_ABOUT_CMS } from "@/server/db";
import { AboutClient } from "@/components/AboutClient";

// Dynamic rendering: reads from in-memory RAM in sub-millisecond time.
// Ensures admin edits reflect instantly without stale cache mismatch.
export const dynamic = "force-dynamic";

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
