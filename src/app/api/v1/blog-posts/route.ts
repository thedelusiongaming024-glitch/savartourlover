import { NextResponse } from "next/server";
import { getBlogPosts, ensureDbHydrated } from "@/server/db";

export async function GET() {
  await ensureDbHydrated();
  const posts = getBlogPosts();
  const results = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    author_name: p.author_name,
    cover_image: p.cover_image,
    excerpt: p.excerpt,
    published_at: p.published_at,
  }));

  return NextResponse.json({ results });
}
