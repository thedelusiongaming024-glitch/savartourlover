import { NextResponse } from "next/server";
import { ensureDbHydrated, getRocketIncomingSmsList } from "@/server/db";

export async function GET() {
  try {
    await ensureDbHydrated();
    const list = getRocketIncomingSmsList();
    return NextResponse.json({
      success: true,
      count: list.length,
      sms_logs: list,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving SMS logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
