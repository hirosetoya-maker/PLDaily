import { sql } from "@/lib/db"

export type CategoryBreakdown = {
  categoryId: string | null
  categoryName: string
  categoryIcon: string
  amount: number
}

export type MonthSummary = {
  month: string // "2026-07"
  income: number
  fixedTotal: number
  variableTotal: number
  expenseTotal: number
  net: number
  categories: CategoryBreakdown[]
}

// month は "YYYY-MM-01" 形式の月初日
export async function getMonthSummary(userId: string, monthStart: string): Promise<MonthSummary> {
  const [year, mo] = monthStart.split("-").map((v) => parseInt(v, 10))
  const monthEnd = new Date(year, mo, 0)
  const to = `${year}-${String(mo).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`

  const [incomeRows, categoryRows, fixedRows] = await Promise.all([
    sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as total
      FROM income
      WHERE user_id = ${userId} AND date >= ${monthStart}::date AND date <= ${to}::date
    `,
    sql`
      SELECT c.id as category_id, COALESCE(c.name, 'その他') as category_name,
             COALESCE(c.icon, '💳') as category_icon, SUM(e.amount)::bigint as total
      FROM expenses e
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ${userId} AND e.date >= ${monthStart}::date AND e.date <= ${to}::date
      GROUP BY c.id, c.name, c.icon
      ORDER BY total DESC
    `,
    sql`
      SELECT COALESCE(SUM(amount), 0)::bigint as total
      FROM fixed_expenses
      WHERE user_id = ${userId} AND is_active = true AND deleted_at IS NULL
    `,
  ])

  const income = Number(incomeRows[0]?.total ?? 0)
  const fixedTotal = Number(fixedRows[0]?.total ?? 0)
  const categories: CategoryBreakdown[] = categoryRows.map((r) => ({
    categoryId: r.category_id as string | null,
    categoryName: r.category_name as string,
    categoryIcon: r.category_icon as string,
    amount: Number(r.total),
  }))
  const variableTotal = categories.reduce((s, c) => s + c.amount, 0)
  const expenseTotal = variableTotal + fixedTotal

  return {
    month: `${year}-${String(mo).padStart(2, "0")}`,
    income,
    fixedTotal,
    variableTotal,
    expenseTotal,
    net: income - expenseTotal,
    categories,
  }
}
