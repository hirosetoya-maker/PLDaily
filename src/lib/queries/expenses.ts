import { sql } from "@/lib/db"
import type { Expense } from "@/types"

export async function getExpenses(
  userId: string,
  opts: { from?: string; to?: string } = {}
): Promise<Expense[]> {
  const rows = await sql`
    SELECT e.id, e.user_id, e.amount, e.category_id, e.date::text, e.memo, e.created_at::text,
           c.name as category_name, c.icon as category_icon
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = ${userId}
      ${opts.from ? sql`AND e.date >= ${opts.from}::date` : sql``}
      ${opts.to ? sql`AND e.date <= ${opts.to}::date` : sql``}
    ORDER BY e.date DESC, e.created_at DESC
  `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    amount: Number(r.amount),
    categoryId: r.category_id as string | null,
    date: r.date as string,
    memo: r.memo as string | null,
    categoryName: r.category_name as string | undefined,
    categoryIcon: r.category_icon as string | undefined,
    createdAt: r.created_at as string,
  }))
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const rows = await sql`
    SELECT e.id, e.user_id, e.amount, e.category_id, e.date::text, e.memo, e.created_at::text
    FROM expenses e WHERE e.id = ${id}
  `
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id as string,
    userId: r.user_id as string,
    amount: Number(r.amount),
    categoryId: r.category_id as string | null,
    date: r.date as string,
    memo: r.memo as string | null,
    createdAt: r.created_at as string,
  }
}

export async function sumExpenses(
  userId: string,
  opts: { after?: string; before?: string }
): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount), 0)::bigint as total
    FROM expenses
    WHERE user_id = ${userId}
      ${opts.after ? sql`AND created_at > ${opts.after}::timestamptz` : sql``}
      ${opts.before ? sql`AND date <= ${opts.before}::date` : sql``}
  `
  return Number(rows[0]?.total ?? 0)
}
