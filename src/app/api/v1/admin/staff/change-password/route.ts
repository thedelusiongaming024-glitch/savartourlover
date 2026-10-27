import { NextResponse } from "next/server";
import { getAuthUserFromHeader, verifyPassword } from "@/server/auth";
import { getStaffById, saveStaffUser, loadDb } from "@/server/db";

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!authUser) {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { current_password, new_password } = body;

    if (!new_password || typeof new_password !== "string" || new_password.trim().length < 8) {
      return NextResponse.json(
        { detail: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Verify current user exists in database
    const db = loadDb();
    const staff = db.staffUsers.find((u) => u.id === authUser.user_id || u.username.toLowerCase() === authUser.username.toLowerCase());
    if (!staff) {
      return NextResponse.json({ detail: "Staff user not found." }, { status: 404 });
    }

    // Verify current password if provided
    if (current_password) {
      const isCorrect = verifyPassword(current_password.trim(), staff.password_hash, staff.salt);
      if (!isCorrect) {
        return NextResponse.json({ detail: "Current password is incorrect." }, { status: 400 });
      }
    }

    // Save and sync updated password
    await saveStaffUser({
      id: staff.id,
      username: staff.username,
      password: new_password.trim(),
      role: staff.role,
      first_name: staff.first_name,
      last_name: staff.last_name,
      phone_number: staff.phone_number,
      email: staff.email,
    });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to change password.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
