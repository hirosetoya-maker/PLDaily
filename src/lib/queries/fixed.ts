import { sql } from "@/lib/db"
import type { FixedExpense, VariableExpense } from "@/types"

export async function getFixedExpenses(userId: string): Promise<FixedExpense[]> {
  const rows = await sql`
    SELECT id, user_id, name, amount, note, is_active, created_at::text
    FROM fixed_expenses
    WHERE user_id = ${userId} AND is_active = true AND deleted_at IS NULL
    ORDER BY created_at ASC
  `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    amount: Number(r.amount),
    note: r.note as string | null,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  }))
}

export async function getVariableExpenses(
  userId: string,
  month: string
): Promise<VariableExpense[]> {
  const rows = await sql`
    SELECT id, user_id, name, amount, payment_date::text, month::text, is_paid, created_at::text
    FROM variable_expenses
    WHERE user_id = ${userId} AND month = ${month}::date
    ORDER BY payment_date ASC
  `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    amount: Number(r.amount),
    paymentDate: r.payment_date as string,
    month: r.month as string,
    isPaid: Boolean(r.is_paid),
    createdAt: r.created_at as string,
  }))
}
