import type { MetadataRoute } from "next";
import { fetchDestinations, fetchJournalPosts, fetchTours } from "@/lib/api";

export const revalidate = 3600; // Cache dynamic sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://savartourlover.com";
  const now = new Date();

  // Core static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tours`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/destinations`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/journal`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Fetch dynamic content
  let tourEntries: MetadataRoute.Sitemap = [];
  let destinationEntries: MetadataRoute.Sitemap = [];
  let journalEntries: MetadataRoute.Sitemap = [];

  try {
    const [tours, destinations, posts] = await Promise.all([
      fetchTours().catch(() => []),
      fetchDestinations().catch(() => []),
      fetchJournalPosts().catch(() => []),
    ]);

    tourEntries = (tours || []).map((tour) => ({
      url: `${baseUrl}/tours/${tour.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));

    destinationEntries = (destinations || []).map((dest) => ({
      url: `${baseUrl}/destinations/${dest.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

    journalEntries = (posts || []).map((post) => ({
      url: `${baseUrl}/journal/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  } catch (err) {
    console.error("[Sitemap] Error generating dynamic routes:", err);
  }

  return [...staticRoutes, ...tourEntries, ...destinationEntries, ...journalEntries];
}
