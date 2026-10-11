import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { revokeStaffRefreshTokens } from "@/server/db";

// Refresh tokens are stateless JWTs, so "logging out" can't delete a session
// record — instead this marks every refresh token issued before now as dead
// for this user (see tokens_valid_from on DbStaffUser / server/auth.ts).
// The short-lived access token the caller is already holding stays valid
// until it naturally expires, but it can no longer be renewed.
export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  await revokeStaffRefreshTokens(user.user_id);
  return NextResponse.json({ detail: "Logged out." });
}
