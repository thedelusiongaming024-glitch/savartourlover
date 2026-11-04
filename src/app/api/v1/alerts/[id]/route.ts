import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { acknowledgeAlert, ensureDbHydrated } from "@/server/db";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!authUser) {
    return NextResponse.json({ detail: "Authentication credentials were not provided." }, { status: 401 });
  }

  await ensureDbHydrated();
  const { id } = await props.params;
  const ok = await acknowledgeAlert(id);
  if (!ok) {
    return NextResponse.json({ detail: "Alert not found or already deleted.", id, acknowledged: true, deleted: true }, { status: 200 });
  }

  return NextResponse.json({ id, acknowledged: true, deleted: true });
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!authUser) {
    return NextResponse.json({ detail: "Authentication credentials were not provided." }, { status: 401 });
  }

  await ensureDbHydrated();
  const { id } = await props.params;
  const ok = await acknowledgeAlert(id);
  return NextResponse.json({ id, deleted: true, success: ok });
}
