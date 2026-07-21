export type Category = {
  id: string
  userId: string | null
  name: string
  icon: string
  isDefault: boolean
  sortOrder: number
}

export type Expense = {
  id: string
  userId: string
  amount: number
  categoryId: string | null
  date: string
  memo: string | null
  categoryName?: string
  categoryIcon?: string
  createdAt: string
}

export type Income = {
  id: string
  userId: string
  amount: number
  type: "salary" | "bonus" | "side" | "other"
  date: string
  memo: string | null
  createdAt: string
}

export type FixedExpense = {
  id: string
  userId: string
  name: string
  amount: number
  note: string | null
  isActive: boolean
  createdAt: string
}

export type VariableExpense = {
  id: string
  userId: string
  name: string
  amount: number
  paymentDate: string
  month: string
  isPaid: boolean
  createdAt: string
}

export type MonthlyCashFlow = {
  month: string // "2026-07"
  income: number
  expense: number
  net: number
  isCurrent: boolean
}

export type DailyPace = {
  month: string
  daysElapsed: number
  daysInMonth: number
  daysRemaining: number
  variableSpentSoFar: number
  dailyAverageSoFar: number
  monthlyIncome: number
  fixedTotal: number
  remainingBudget: number
  dailyAllowanceRemaining: number
}

export type CategoryBreakdown = {
  categoryId: string | null
  categoryName: string
  categoryIcon: string
  amount: number
}

export type MonthSummary = {
  month: string
  income: number
  fixedTotal: number
  variableTotal: number
  expenseTotal: number
  net: number
  categories: CategoryBreakdown[]
}

export const INCOME_TYPE_LABELS: Record<Income["type"], string> = {
  salary: "給与",
  bonus: "ボーナス",
  side: "副収入",
  other: "その他",
}
