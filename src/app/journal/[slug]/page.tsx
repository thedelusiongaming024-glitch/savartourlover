import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchJournalPost, fetchJournalPosts } from "@/lib/api";
import { JournalPostClient } from "@/components/JournalPostClient";

// ISR: cached for 300s instead of force-dynamic. Content here comes from
// Supabase-backed catalog/CMS tables that change rarely (admin edits), so
// re-rendering (and re-querying the DB) on every single visitor request
// wastes Vercel function invocations and Supabase egress under real
// traffic — both capped on the free tier. Admin writes call
// revalidatePublicContent() (src/server/revalidatePublicContent.ts) to
// invalidate this immediately instead of waiting out the TTL.
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchJournalPost(slug);
  if (!post) return { title: "Story not found" };

  const title = post.title;
  const description = post.excerpt || "Read this travel guide from Savar Tour Lover.";
  const imageUrl = post.cover?.imageUrl || "/images/logo-badge.png";

  return {
    title,
    description,
    alternates: {
      canonical: `/journal/${slug}`,
    },
    openGraph: {
      title: `${title} | Savar Tour Lover Journal`,
      description,
      url: `https://savartourlover.com/journal/${slug}`,
      siteName: "Savar Tour Lover",
      type: "article",
      images: [
        {
          url: imageUrl,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Savar Tour Lover Journal`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function JournalPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await fetchJournalPost(slug);
  if (!post) notFound();

  const allPosts = (await fetchJournalPosts()) || [];
  const related = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `https://savartourlover.com/journal/${post.slug}#article`,
        headline: post.title,
        description: post.excerpt,
        image: post.cover?.imageUrl || undefined,
        author: {
          "@type": "Person",
          name: post.author || "Savar Tour Lover Editorial",
        },
        publisher: {
          "@type": "TravelAgency",
          name: "Savar Tour Lover",
          url: "https://savartourlover.com",
          logo: {
            "@type": "ImageObject",
            url: "https://savartourlover.com/images/logo-badge.png",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://savartourlover.com/journal/${post.slug}`,
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
            name: "Travel Journal",
            item: "https://savartourlover.com/journal",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: post.title,
            item: `https://savartourlover.com/journal/${post.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <JournalPostClient post={post} related={related} />
    </>
  );
}
