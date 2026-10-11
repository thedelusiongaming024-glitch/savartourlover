import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getAllExpensesAdmin, saveExpense } from "@/server/db";

export async function GET(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Finance management privileges required." }, { status: 403 });
  }

  const expenses = getAllExpensesAdmin();
  return NextResponse.json({ results: expenses });
}

export async function POST(request: Request) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Finance management privileges required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { category, amount, description, date } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ detail: "A valid positive amount is required." }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ detail: "Description is required." }, { status: 400 });
    }

    const saved = await saveExpense({
      category: category || "other",
      amount: String(Number(amount).toFixed(2)),
      description: description.trim(),
      date: date || new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record expense.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}
