import { sql } from "@/lib/db"
import type { BalanceLog } from "@/types"

export async function getLatestBalance(userId: string): Promise<BalanceLog | null> {
  const rows = await sql`
    SELECT id, user_id, amount, note, recorded_at::text
    FROM balance_logs
    WHERE user_id = ${userId}
    ORDER BY recorded_at DESC
    LIMIT 1
  `
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id as string,
    userId: r.user_id as string,
    amount: Number(r.amount),
    note: r.note as string | null,
    recordedAt: r.recorded_at as string,
  }
}
