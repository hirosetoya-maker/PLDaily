import { sql } from "@/lib/db"
import type { FixedExpense, MonthlyFixed, VariableExpense } from "@/types"

export async function getFixedExpenses(userId: string): Promise<FixedExpense[]> {
  const rows = await sql`
    SELECT id, user_id, name, amount, is_active, created_at::text
    FROM fixed_expenses
    WHERE user_id = ${userId} AND is_active = true AND deleted_at IS NULL
    ORDER BY created_at ASC
  `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    amount: Number(r.amount),
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  }))
}

export async function getMonthlyFixed(
  userId: string,
  month: string
): Promise<MonthlyFixed[]> {
  const rows = await sql`
    SELECT mf.id, mf.fixed_expense_id, mf.month::text, mf.amount,
           mf.payment_date::text, mf.is_paid, fe.name
    FROM monthly_fixed mf
    JOIN fixed_expenses fe ON mf.fixed_expense_id = fe.id
    WHERE fe.user_id = ${userId}
      AND mf.month = ${month}::date
      AND fe.is_active = true
      AND fe.deleted_at IS NULL
    ORDER BY mf.payment_date ASC
  `
  return rows.map((r) => ({
    id: r.id as string,
    fixedExpenseId: r.fixed_expense_id as string,
    month: r.month as string,
    amount: Number(r.amount),
    paymentDate: r.payment_date as string,
    isPaid: r.is_paid as boolean,
    name: r.name as string,
  }))
}

export async function getVariableExpenses(
  userId: string,
  month: string
): Promise<VariableExpense[]> {
  const rows = await sql`
    SELECT id, user_id, name, amount, payment_date::text, month::text, created_at::text
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
    createdAt: r.created_at as string,
  }))
}
