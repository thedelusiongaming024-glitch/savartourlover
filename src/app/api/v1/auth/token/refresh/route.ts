import { NextResponse } from "next/server";
import { generateTokens, verifyJwt } from "@/server/auth";
import { getStaffById } from "@/server/db";
import type { JwtPayload } from "@/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refresh } = body;

    if (!refresh) {
      return NextResponse.json({ detail: "Refresh token is required." }, { status: 400 });
    }

    const payload = verifyJwt<JwtPayload>(refresh);
    if (!payload || payload.token_type !== "refresh") {
      return NextResponse.json({ detail: "Invalid or expired refresh token." }, { status: 401 });
    }

    const user = getStaffById(payload.user_id);
    if (!user) {
      return NextResponse.json({ detail: "User not found." }, { status: 401 });
    }

    // Refresh tokens have no server-side session record, so revocation works
    // by comparing against the last time this user's tokens were revoked
    // (set by /auth/staff/logout). A token issued before that point is dead
    // even though its signature and expiry are still otherwise valid.
    if (typeof user.tokens_valid_from === "number" && payload.iat < user.tokens_valid_from) {
      return NextResponse.json({ detail: "Session has been revoked. Please log in again." }, { status: 401 });
    }

    const tokens = generateTokens(user);
    return NextResponse.json(tokens);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token refresh error.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
