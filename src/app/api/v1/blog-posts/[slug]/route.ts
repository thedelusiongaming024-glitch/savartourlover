import { NextResponse } from "next/server";
import { getBlogPostBySlug } from "@/server/db";

export async function GET(
  _req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return NextResponse.json({ detail: "Blog post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}
