import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllStaffAdmin, saveStaffUser } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  const staff = getAllStaffAdmin();
  return NextResponse.json({ results: staff });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ detail: "Super Admin privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, password, role, first_name, last_name, phone_number, email } = body;

    if (!username || !username.trim()) {
      return NextResponse.json({ detail: "Username is required." }, { status: 400 });
    }
    if (!password || !password.trim()) {
      return NextResponse.json({ detail: "Password is required." }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ detail: "Role is required." }, { status: 400 });
    }
    if (!first_name || !first_name.trim()) {
      return NextResponse.json({ detail: "First name is required." }, { status: 400 });
    }

    const saved = await saveStaffUser({
      username: username.trim(),
      password: password.trim(),
      role,
      first_name: first_name.trim(),
      last_name: (last_name || "").trim(),
      phone_number: phone_number?.trim() || null,
      email: email?.trim() || null,
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create staff user.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
