import { NextResponse } from "next/server";
import { getDestinationBySlug, ensureDbHydrated } from "@/server/db";

export async function GET(
  _req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  await ensureDbHydrated();
  const destination = getDestinationBySlug(slug);

  if (!destination) {
    return NextResponse.json({ detail: "Destination not found" }, { status: 404 });
  }

  return NextResponse.json(destination);
}
