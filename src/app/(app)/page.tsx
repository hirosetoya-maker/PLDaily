"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { MonthlySummary } from "@/components/dashboard/monthly-summary"
import { DailyPaceCard } from "@/components/dashboard/daily-pace"
import { MonthSummaryDetail } from "@/components/dashboard/month-summary-detail"
import { EmptyState } from "@/components/ui/empty-state"
import { AddTransactionSheet } from "@/components/record/add-transaction-sheet"
import { toJSTDateString } from "@/lib/utils"
import type { DailyPace, Expense, MonthlyCashFlow, MonthSummary } from "@/types"
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
  const [pace, setPace] = useState<DailyPace | null>(null)
  const [currentSummary, setCurrentSummary] = useState<MonthSummary | null>(null)
  const [previousSummary, setPreviousSummary] = useState<MonthSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddSheet, setShowAddSheet] = useState(false)

  const fetchAll = useCallback(async () => {
    const { from, to } = getMonthRange()

    const [exp, inc, cf, paceData, summary] = await Promise.all([
      fetchJson(`/api/expenses?from=${from}&to=${to}`),
      fetchJson(`/api/income?from=${from}&to=${to}`),
      fetchJson("/api/cashflow"),
      fetchJson("/api/dashboard/pace"),
      fetchJson("/api/dashboard/summary"),
    ])

    setExpenses(Array.isArray(exp) ? exp : [])
    setMonthlyIncome(
      Array.isArray(inc) ? inc.reduce((s: number, i: { amount: number }) => s + i.amount, 0) : 0
    )
    setCashflow(Array.isArray(cf) ? cf : [])
    setPace((paceData as DailyPace) ?? null)
    const s = summary as { current: MonthSummary; previous: MonthSummary } | null
    setCurrentSummary(s?.current ?? null)
    setPreviousSummary(s?.previous ?? null)
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
          {pace && <DailyPaceCard pace={pace} />}
          <CashFlowChart data={cashflow} />

          {/* 先月・今月サマリー */}
          {currentSummary && <MonthSummaryDetail title="今月" summary={currentSummary} />}
          {previousSummary && <MonthSummaryDetail title="先月" summary={previousSummary} />}

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
                  <button
                    onClick={() => setShowAddSheet(true)}
                    className="text-sm text-[var(--primary)] font-medium"
                  >
                    ＋ 支出を記録する
                  </button>
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

      {/* FAB */}
      <button
        onClick={() => setShowAddSheet(true)}
        aria-label="支出を追加"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[var(--expense)] text-white text-2xl shadow-lg flex items-center justify-center transition-transform active:scale-95"
      >
        ＋
      </button>

      {showAddSheet && (
        <AddTransactionSheet
          mode="expense"
          onClose={() => setShowAddSheet(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  )
}
