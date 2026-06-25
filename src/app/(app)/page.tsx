"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { MonthlySummary } from "@/components/dashboard/monthly-summary"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDateShort, toJSTDateString } from "@/lib/utils"
import type { BalanceLog, Expense, CashFlowPoint } from "@/types"
import Link from "next/link"

const CashFlowChart = dynamic(
  () => import("@/components/dashboard/cashflow-chart").then((m) => m.CashFlowChart),
  { ssr: false, loading: () => <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] h-48 animate-pulse" /> }
)

function getMonthRange() {
  const now = new Date()
  return {
    from: toJSTDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toJSTDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

export default function DashboardPage() {
  const [balance, setBalance] = useState<BalanceLog | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [cashflow, setCashflow] = useState<CashFlowPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { from, to } = getMonthRange()

    const [balRes, expRes, incRes, cfRes] = await Promise.all([
      fetch("/api/balance"),
      fetch(`/api/expenses?from=${from}&to=${to}`),
      fetch(`/api/income?from=${from}&to=${to}`),
      fetch("/api/cashflow"),
    ])

    const [bal, exp, inc, cf] = await Promise.all([
      balRes.json(),
      expRes.json(),
      incRes.json(),
      cfRes.json(),
    ])

    setBalance(bal)
    setExpenses(exp)
    setMonthlyIncome(Array.isArray(inc) ? inc.reduce((s: number, i: { amount: number }) => s + i.amount, 0) : 0)
    setCashflow(Array.isArray(cf) ? cf : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const monthlyExpenseTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const today = toJSTDateString(new Date())
  const todayExpenses = expenses.filter((e) => e.date === today).slice(0, 5)

  return (
    <div className="px-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">PLDaily</h1>
        <Link href="/settings" className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm">
          👤
        </Link>
      </div>

      <BalanceCard balance={balance} onUpdated={fetchAll} />
      <MonthlySummary income={monthlyIncome} expenses={monthlyExpenseTotal} />
      <CashFlowChart data={cashflow} />

      {/* Today's expenses */}
      <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--muted-foreground)]">今日の支出</span>
          <Link href="/record" className="text-xs text-[var(--primary)]">すべて見る</Link>
        </div>
        {todayExpenses.length === 0 ? (
          <EmptyState
            title="今日の支出はありません"
            action={
              <Link
                href="/record"
                className="text-sm text-[var(--primary)] font-medium"
              >
                ＋ 支出を記録する
              </Link>
            }
            className="py-6"
          />
        ) : (
          <ul className="space-y-3">
            {todayExpenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{e.categoryIcon ?? "💳"}</span>
                  <div>
                    <p className="text-sm font-medium">{e.categoryName ?? "その他"}</p>
                    {e.memo && <p className="text-xs text-[var(--muted-foreground)]">{e.memo}</p>}
                  </div>
                </div>
                <span className="font-mono text-sm text-[var(--expense)]">
                  ▼¥{e.amount.toLocaleString("ja-JP")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
