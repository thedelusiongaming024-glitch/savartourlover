import { NextResponse } from "next/server";
import { ensureDbHydrated, getBlogPostBySlug } from "@/server/db";

export async function GET(
  _req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  await ensureDbHydrated();
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return NextResponse.json({ detail: "Blog post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}
