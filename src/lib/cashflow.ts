import { sql } from "@/lib/db"
import type { MonthlyCashFlow } from "@/types"

// 月次収支サマリー: 過去2ヶ月〜3ヶ月先の6ヶ月分。
// 支出 = 記録した支出 + 固定費 + 変動費（その月分として入力されたもの）
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

  const [incomeRows, expenseRows, fixedRows, variableRows] = await Promise.all([
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
      SELECT to_char(mf.month, 'YYYY-MM') as month, SUM(mf.amount)::bigint as total
      FROM monthly_fixed mf
      JOIN fixed_expenses fe ON mf.fixed_expense_id = fe.id
      WHERE fe.user_id = ${userId}
        AND mf.month >= ${from}::date AND mf.month <= ${to}::date
        AND fe.is_active = true AND fe.deleted_at IS NULL
      GROUP BY 1
    `,
    sql`
      SELECT to_char(month, 'YYYY-MM') as month, SUM(amount)::bigint as total
      FROM variable_expenses
      WHERE user_id = ${userId} AND month >= ${from}::date AND month <= ${to}::date
      GROUP BY 1
    `,
  ])

  const sumByMonth = (rows: Record<string, unknown>[]) => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.month as string, Number(r.total))
    return map
  }
  const incomeMap = sumByMonth(incomeRows)
  const expenseMap = sumByMonth(expenseRows)
  const fixedMap = sumByMonth(fixedRows)
  const variableMap = sumByMonth(variableRows)

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  return months.map((month) => {
    const income = incomeMap.get(month) ?? 0
    const expense =
      (expenseMap.get(month) ?? 0) + (fixedMap.get(month) ?? 0) + (variableMap.get(month) ?? 0)
    return {
      month,
      income,
      expense,
      net: income - expense,
      isCurrent: month === currentMonth,
    }
  })
}
