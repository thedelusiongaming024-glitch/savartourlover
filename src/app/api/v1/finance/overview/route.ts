import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getFinanceOverview } from "@/server/db";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!authUser) {
    return NextResponse.json({ detail: "Authentication credentials were not provided." }, { status: 401 });
  }

  // Check role: only super_admin and finance_manager have finance access
  if (authUser.role !== "super_admin" && authUser.role !== "finance_manager") {
    return NextResponse.json(
      { detail: "You do not have permission to view financial overview." },
      { status: 403 }
    );
  }

  const overview = getFinanceOverview();
  return NextResponse.json(overview);
}
