import { sql } from "@/lib/db"
import type { Income } from "@/types"

export async function getIncome(
  userId: string,
  opts: { from?: string; to?: string } = {}
): Promise<Income[]> {
  const rows = await sql`
    SELECT id, user_id, amount, type, date::text, memo, created_at::text
    FROM income
    WHERE user_id = ${userId}
      ${opts.from ? sql`AND date >= ${opts.from}::date` : sql``}
      ${opts.to ? sql`AND date <= ${opts.to}::date` : sql``}
    ORDER BY date DESC, created_at DESC
  `
  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    amount: Number(r.amount),
    type: r.type as Income["type"],
    date: r.date as string,
    memo: r.memo as string | null,
    createdAt: r.created_at as string,
  }))
}

export async function getIncomeById(id: string): Promise<Income | null> {
  const rows = await sql`
    SELECT id, user_id, amount, type, date::text, memo, created_at::text
    FROM income WHERE id = ${id}
  `
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id as string,
    userId: r.user_id as string,
    amount: Number(r.amount),
    type: r.type as Income["type"],
    date: r.date as string,
    memo: r.memo as string | null,
    createdAt: r.created_at as string,
  }
}

export async function sumIncome(
  userId: string,
  opts: { after?: string; before?: string }
): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount), 0)::bigint as total
    FROM income
    WHERE user_id = ${userId}
      ${opts.after ? sql`AND created_at > ${opts.after}::timestamptz` : sql``}
      ${opts.before ? sql`AND date <= ${opts.before}::date` : sql``}
  `
  return Number(rows[0]?.total ?? 0)
}
