import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllBlogPostsAdmin, saveBlogPost } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const posts = getAllBlogPostsAdmin();
  return NextResponse.json({ results: posts });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const post = await saveBlogPost(body);
    revalidatePublicContent(post.slug ? [`/journal/${post.slug}`] : []);
    return NextResponse.json(post, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save blog post.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
