import { NextResponse } from "next/server";
import { getAuthUserFromHeader } from "@/server/auth";
import { getExpenseById, saveExpense, deleteExpense } from "@/server/db";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Finance management privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  const expense = getExpenseById(id);
  if (!expense) {
    return NextResponse.json({ detail: "Expense not found." }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Finance management privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  try {
    const body = await request.json();
    const updated = await saveExpense({ ...body, id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update expense.";
    return NextResponse.json({ detail: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const user = getAuthUserFromHeader(request.headers.get("Authorization"));
  if (!user || (user.role !== "super_admin" && user.role !== "finance_manager")) {
    return NextResponse.json({ detail: "Finance management privileges required." }, { status: 403 });
  }

  const { id } = await props.params;
  const ok = await deleteExpense(id);
  if (!ok) {
    return NextResponse.json({ detail: "Expense not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
