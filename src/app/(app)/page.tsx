"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { MonthlySummary } from "@/components/dashboard/monthly-summary"
import { EmptyState } from "@/components/ui/empty-state"
import { toJSTDateString } from "@/lib/utils"
import type { Expense, MonthlyCashFlow } from "@/types"
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

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [cashflow, setCashflow] = useState<MonthlyCashFlow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const { from, to } = getMonthRange()

    const [exp, inc, cf] = await Promise.all([
      fetchJson(`/api/expenses?from=${from}&to=${to}`),
      fetchJson(`/api/income?from=${from}&to=${to}`),
      fetchJson("/api/cashflow"),
    ])

    setExpenses(Array.isArray(exp) ? exp : [])
    setMonthlyIncome(
      Array.isArray(inc) ? inc.reduce((s: number, i: { amount: number }) => s + i.amount, 0) : 0
    )
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

      {loading ? (
        <>
          <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] h-24 animate-pulse" />
          <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] h-48 animate-pulse" />
          <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] h-32 animate-pulse" />
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
