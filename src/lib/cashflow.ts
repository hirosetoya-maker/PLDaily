import { sql } from "@/lib/db"
import { getLatestBalance } from "@/lib/queries/balance"
import { sumIncome } from "@/lib/queries/income"
import { sumExpenses } from "@/lib/queries/expenses"
import { addDays, toJSTDateString } from "@/lib/utils"
import type { CashFlowPoint } from "@/types"

export async function calculateCashFlow(
  userId: string,
  daysAhead = 90
): Promise<CashFlowPoint[]> {
  const latestBalance = await getLatestBalance(userId)
  if (!latestBalance) return []

  const baseDate = latestBalance.recordedAt
  const baseAmount = latestBalance.amount
  const today = new Date()
  const todayStr = toJSTDateString(today)

  // Confirmed income and expenses since last balance update
  const confirmedIncome = await sumIncome(userId, { after: baseDate, before: todayStr })
  const confirmedExpenses = await sumExpenses(userId, { after: baseDate, before: todayStr })
  const currentEstimate = baseAmount + confirmedIncome - confirmedExpenses

  // Future scheduled items (income + fixed + variable)
  const endDate = addDays(today, daysAhead)
  const endDateStr = toJSTDateString(endDate)

  const futureIncome = await sql`
    SELECT date::text, SUM(amount)::bigint as total
    FROM income
    WHERE user_id = ${userId} AND date > ${todayStr}::date AND date <= ${endDateStr}::date
    GROUP BY date ORDER BY date
  `

  const futureExpenses = await sql`
    SELECT date::text, SUM(amount)::bigint as total
    FROM expenses
    WHERE user_id = ${userId} AND date > ${todayStr}::date AND date <= ${endDateStr}::date
    GROUP BY date ORDER BY date
  `

  const futureFixed = await sql`
    SELECT mf.payment_date::text as date, SUM(mf.amount)::bigint as total
    FROM monthly_fixed mf
    JOIN fixed_expenses fe ON mf.fixed_expense_id = fe.id
    WHERE fe.user_id = ${userId}
      AND mf.is_paid = false
      AND mf.payment_date > ${todayStr}::date
      AND mf.payment_date <= ${endDateStr}::date
      AND fe.is_active = true AND fe.deleted_at IS NULL
    GROUP BY mf.payment_date ORDER BY mf.payment_date
  `

  const futureVariable = await sql`
    SELECT payment_date::text as date, SUM(amount)::bigint as total
    FROM variable_expenses
    WHERE user_id = ${userId}
      AND payment_date > ${todayStr}::date
      AND payment_date <= ${endDateStr}::date
    GROUP BY payment_date ORDER BY payment_date
  `

  // Build daily delta map
  const deltaMap = new Map<string, number>()

  for (const row of futureIncome) {
    const key = row.date as string
    deltaMap.set(key, (deltaMap.get(key) ?? 0) + Number(row.total))
  }
  for (const row of futureExpenses) {
    const key = row.date as string
    deltaMap.set(key, (deltaMap.get(key) ?? 0) - Number(row.total))
  }
  for (const row of futureFixed) {
    const key = row.date as string
    deltaMap.set(key, (deltaMap.get(key) ?? 0) - Number(row.total))
  }
  for (const row of futureVariable) {
    const key = row.date as string
    deltaMap.set(key, (deltaMap.get(key) ?? 0) - Number(row.total))
  }

  // Generate daily series
  const points: CashFlowPoint[] = []
  let runningBalance = currentEstimate

  points.push({ date: todayStr, balance: runningBalance, isProjected: false })

  for (let i = 1; i <= daysAhead; i++) {
    const d = addDays(today, i)
    const dateStr = d.toISOString().split("T")[0]
    const delta = deltaMap.get(dateStr) ?? 0
    runningBalance += delta
    points.push({ date: dateStr, balance: runningBalance, isProjected: true })
  }

  return points
}
