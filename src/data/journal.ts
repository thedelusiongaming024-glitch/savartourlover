import type { JournalPost } from "@/lib/types";

export const journalPosts: JournalPost[] = [];

export function getJournalPost(slug: string): JournalPost | undefined {
  return journalPosts.find((p) => p.slug === slug);
}
