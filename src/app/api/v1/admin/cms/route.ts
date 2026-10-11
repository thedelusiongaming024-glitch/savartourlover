import { NextResponse } from "next/server";
import { revalidatePublicContent } from "@/server/revalidatePublicContent";
import { getAuthUserFromHeader } from "@/server/auth";
import { getHomepageBlocks, saveHomepageBlock, deleteHomepageBlock } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const blocks = getHomepageBlocks();
  return NextResponse.json({ results: blocks });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, block_type, content } = body;

    if (!id || !block_type) {
      return NextResponse.json({ detail: "id and block_type are required." }, { status: 400 });
    }

    const updated = await saveHomepageBlock(id, block_type, content || {});
    revalidatePublicContent();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save CMS block.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");
    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ detail: "id is required." }, { status: 400 });
    }

    const ok = await deleteHomepageBlock(id);
    if (!ok) {
      return NextResponse.json({ detail: "CMS block not found." }, { status: 404 });
    }

    revalidatePublicContent();
    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete CMS block.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
