import { sql } from "@/lib/db"
import type { MonthlyCashFlow } from "@/types"

// 月次収支サマリー: 過去2ヶ月〜3ヶ月先の6ヶ月分。
// 支出 = 記録した支出 + 毎月の固定費（月に依らない定額の合計）
// ※「口座引き落とし」はカード請求など、固定費に含まれる項目の集計結果を含むため
//   ここで足すと二重計上になる。よって固定費側のみを予測に使う。
export async function calculateMonthlyCashFlow(userId: string): Promise<MonthlyCashFlow[]> {
  const now = new Date()
  const months: string[] = []
  for (let offset = -2; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  const from = `${months[0]}-01`
  const last = new Date(now.getFullYear(), now.getMonth() + 4, 0)
  const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`

  const [incomeRows, expenseRows, fixedTotalRows] = await Promise.all([
    sql`
      SELECT to_char(date_trunc('month', date), 'YYYY-MM') as month, SUM(amount)::bigint as total
      FROM income
      WHERE user_id = ${userId} AND date >= ${from}::date AND date <= ${to}::date
      GROUP BY 1
    `,
    sql`
      SELECT to_char(date_trunc('month', date), 'YYYY-MM') as month, SUM(amount)::bigint as total
      FROM expenses
      WHERE user_id = ${userId} AND date >= ${from}::date AND date <= ${to}::date
      GROUP BY 1
    `,
    sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as total
      FROM fixed_expenses
      WHERE user_id = ${userId} AND is_active = true AND deleted_at IS NULL
    `,
  ])

  const sumByMonth = (rows: Record<string, unknown>[]) => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.month as string, Number(r.total))
    return map
  }
  const incomeMap = sumByMonth(incomeRows)
  const expenseMap = sumByMonth(expenseRows)
  const fixedTotal = Number(fixedTotalRows[0]?.total ?? 0)

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  return months.map((month) => {
    const income = incomeMap.get(month) ?? 0
    const expense = (expenseMap.get(month) ?? 0) + fixedTotal
    return {
      month,
      income,
      expense,
      net: income - expense,
      isCurrent: month === currentMonth,
    }
  })
}
