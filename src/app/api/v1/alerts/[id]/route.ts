import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { acknowledgeAlert } from "@/server/db";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const authUser = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!authUser) {
    return NextResponse.json({ detail: "Authentication credentials were not provided." }, { status: 401 });
  }

  const { id } = await props.params;
  const ok = await acknowledgeAlert(id);
  if (!ok) {
    return NextResponse.json({ detail: "Alert not found." }, { status: 404 });
  }

  return NextResponse.json({ id, is_acknowledged: true });
}
