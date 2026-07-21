import { sql } from "@/lib/db"
import { toJSTDateString } from "@/lib/utils"

export type DailyPace = {
  month: string // "2026-07"
  daysElapsed: number
  daysInMonth: number
  daysRemaining: number
  variableSpentSoFar: number
  dailyAverageSoFar: number
  incomeSoFar: number
  fixedTotal: number
  remainingBudget: number
  dailyAllowanceRemaining: number
}

function jstNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
}

// 当月の「ここまでの1日平均支出」と「赤字にせず使い切るための残り1日あたりの上限」を計算する。
// 対象は expenses（日々記録する変動費）のみ。固定費（fixed_expenses）は収入から先に差し引く。
// 口座引き落とし（variable_expenses）は固定費と二重計上になりうるため cashflow.ts の方針に合わせて含めない。
export async function getDailyPace(userId: string): Promise<DailyPace> {
  const now = jstNow()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysElapsed = now.getDate()
  const daysRemaining = daysInMonth - daysElapsed + 1

  const monthStart = toJSTDateString(new Date(year, month, 1))
  const today = toJSTDateString(now)

  const [expenseRows, incomeRows, fixedRows] = await Promise.all([
    sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as total
      FROM expenses
      WHERE user_id = ${userId} AND date >= ${monthStart}::date AND date <= ${today}::date
    `,
    sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as total
      FROM income
      WHERE user_id = ${userId} AND date >= ${monthStart}::date AND date <= ${today}::date
    `,
    sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as total
      FROM fixed_expenses
      WHERE user_id = ${userId} AND is_active = true AND deleted_at IS NULL
    `,
  ])

  const variableSpentSoFar = Number(expenseRows[0]?.total ?? 0)
  const incomeSoFar = Number(incomeRows[0]?.total ?? 0)
  const fixedTotal = Number(fixedRows[0]?.total ?? 0)

  const remainingBudget = incomeSoFar - fixedTotal - variableSpentSoFar

  return {
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    variableSpentSoFar,
    dailyAverageSoFar: variableSpentSoFar / daysElapsed,
    incomeSoFar,
    fixedTotal,
    remainingBudget,
    dailyAllowanceRemaining: remainingBudget / daysRemaining,
  }
}
