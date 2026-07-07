"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { AddTransactionSheet } from "@/components/record/add-transaction-sheet"
import { EmptyState } from "@/components/ui/empty-state"
import { toJSTDateString } from "@/lib/utils"
import { INCOME_TYPE_LABELS } from "@/types"
import type { Expense, Income } from "@/types"

type Mode = "expense" | "income"
type Period = "current" | "prev"

function getRange(period: Period) {
  const now = new Date()
  const year = period === "current" ? now.getFullYear() : now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const month = period === "current" ? now.getMonth() : (now.getMonth() + 11) % 12
  const from = toJSTDateString(new Date(year, month, 1))
  const to = toJSTDateString(new Date(year, month + 1, 0))
  return { from, to }
}

function groupByDate<T extends { date: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = item.date
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export default function RecordPage() {
  const [mode, setMode] = useState<Mode>("expense")
  const [period, setPeriod] = useState<Period>("current")
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [income, setIncome] = useState<Income[]>([])
  const [showSheet, setShowSheet] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editIncome, setEditIncome] = useState<Income | null>(null)
  const requestId = useRef(0)

  const fetchData = useCallback(async () => {
    const id = ++requestId.current
    const { from, to } = getRange(period)
    const [expRes, incRes] = await Promise.all([
      fetch(`/api/expenses?from=${from}&to=${to}`),
      fetch(`/api/income?from=${from}&to=${to}`),
    ])
    const exp = expRes.ok ? await expRes.json().catch(() => []) : []
    const inc = incRes.ok ? await incRes.json().catch(() => []) : []
    if (id !== requestId.current) return // stale response, a newer request has since started
    setExpenses(Array.isArray(exp) ? exp : [])
    setIncome(Array.isArray(inc) ? inc : [])
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const items: (Expense | Income)[] = mode === "expense" ? expenses : income
  const total = items.reduce((s, i) => s + i.amount, 0)

  const grouped = groupByDate(items)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function openAdd() {
    setEditExpense(null)
    setEditIncome(null)
    setShowSheet(true)
  }

  function openEdit(item: Expense | Income) {
    if (mode === "expense") {
      setEditExpense(item as Expense)
      setEditIncome(null)
    } else {
      setEditIncome(item as Income)
      setEditExpense(null)
    }
    setShowSheet(true)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--background)] px-4 pt-6 pb-3">
        {/* Mode toggle */}
        <div className="flex bg-[var(--muted)] rounded-xl p-1 mb-3">
          <button
            onClick={() => setMode("expense")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "expense"
                ? "bg-[var(--surface)] text-[var(--expense)] shadow-sm"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            ▼ 支出
          </button>
          <button
            onClick={() => setMode("income")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "income"
                ? "bg-[var(--surface)] text-[var(--income)] shadow-sm"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            ▲ 収入
          </button>
        </div>

        {/* Period filter */}
        <div className="flex gap-2">
          {(["current", "prev"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                period === p
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}
            >
              {p === "current" ? "今月" : "先月"}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="mt-3">
          <span
            className={`font-mono text-2xl font-bold ${
              mode === "expense" ? "text-[var(--expense)]" : "text-[var(--income)]"
            }`}
          >
            {mode === "expense" ? "▼" : "▲"}¥{total.toLocaleString("ja-JP")}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-4">
        {sortedDates.length === 0 ? (
          <EmptyState
            title={`${mode === "expense" ? "支出" : "収入"}がありません`}
            description="＋ボタンから追加できます"
            className="mt-8"
          />
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const dayItems = grouped[date]
              const [y, m, d] = date.split("-")
              const dayTotal = dayItems.reduce((s, i) => s + i.amount, 0)
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {y}年{parseInt(m)}月{parseInt(d)}日
                    </p>
                    <p
                      className={`font-mono text-xs font-medium ${
                        mode === "expense" ? "text-[var(--expense)]" : "text-[var(--income)]"
                      }`}
                    >
                      計 ¥{dayTotal.toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {dayItems.map((item) => {
                      const isExpense = "categoryId" in item
                      const exp = isExpense ? (item as Expense) : null
                      const inc = !isExpense ? (item as Income) : null
                      return (
                        <button
                          key={item.id}
                          onClick={() => openEdit(item)}
                          className="w-full flex items-center justify-between p-3 bg-[var(--surface)] rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {exp?.categoryIcon ?? (inc ? "💰" : "💳")}
                            </span>
                            <div className="text-left">
                              <p className="text-sm font-medium">
                                {exp?.categoryName ?? (inc ? INCOME_TYPE_LABELS[inc.type] : "その他")}
                              </p>
                              {item.memo && (
                                <p className="text-xs text-[var(--muted-foreground)]">{item.memo}</p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`font-mono text-sm font-medium ${
                              mode === "expense" ? "text-[var(--expense)]" : "text-[var(--income)]"
                            }`}
                          >
                            {mode === "expense" ? "▼" : "▲"}¥{item.amount.toLocaleString("ja-JP")}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className={`fixed bottom-20 right-4 w-14 h-14 rounded-full text-white text-2xl shadow-lg flex items-center justify-center transition-transform active:scale-95 ${
          mode === "expense" ? "bg-[var(--expense)]" : "bg-[var(--income)]"
        }`}
      >
        ＋
      </button>

      {showSheet && (
        <AddTransactionSheet
          mode={mode}
          onClose={() => setShowSheet(false)}
          onSaved={fetchData}
          editExpense={editExpense}
          editIncome={editIncome}
        />
      )}
    </div>
  )
}
