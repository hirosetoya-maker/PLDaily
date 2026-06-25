"use client"

import { useState, useEffect } from "react"
import type { Expense, Income, Category } from "@/types"
import { INCOME_TYPE_LABELS } from "@/types"

type Mode = "expense" | "income"

interface AddTransactionSheetProps {
  mode: Mode
  onClose: () => void
  onSaved: () => void
  editExpense?: Expense | null
  editIncome?: Income | null
}

const INCOME_TYPES: { value: Income["type"]; label: string }[] = [
  { value: "salary", label: "給与" },
  { value: "bonus", label: "ボーナス" },
  { value: "side", label: "副収入" },
  { value: "other", label: "その他" },
]

export function AddTransactionSheet({
  mode,
  onClose,
  onSaved,
  editExpense,
  editIncome,
}: AddTransactionSheetProps) {
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [incomeType, setIncomeType] = useState<Income["type"]>("salary")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [memo, setMemo] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const isEditing = editExpense ?? editIncome

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories)
  }, [])

  useEffect(() => {
    if (editExpense) {
      setAmount(editExpense.amount.toLocaleString("ja-JP"))
      setCategoryId(editExpense.categoryId)
      setDate(editExpense.date)
      setMemo(editExpense.memo ?? "")
    } else if (editIncome) {
      setAmount(editIncome.amount.toLocaleString("ja-JP"))
      setIncomeType(editIncome.type)
      setDate(editIncome.date)
      setMemo(editIncome.memo ?? "")
    }
  }, [editExpense, editIncome])

  function handleAmountInput(val: string) {
    const digits = val.replace(/[^0-9]/g, "")
    if (digits.length > 8) return
    setAmount(digits ? parseInt(digits, 10).toLocaleString("ja-JP") : "")
  }

  async function handleSave() {
    const num = parseInt(amount.replace(/,/g, ""), 10)
    if (!num || num <= 0) return
    setLoading(true)

    if (mode === "expense") {
      const body = { amount: num, categoryId: categoryId ?? null, date, memo: memo || null }
      if (editExpense) {
        await fetch(`/api/expenses/${editExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
    } else {
      const body = { amount: num, type: incomeType, date, memo: memo || null }
      if (editIncome) {
        await fetch(`/api/income/${editIncome.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        await fetch("/api/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!confirm("削除しますか？")) return
    setLoading(true)
    if (editExpense) {
      await fetch(`/api/expenses/${editExpense.id}`, { method: "DELETE" })
    } else if (editIncome) {
      await fetch(`/api/income/${editIncome.id}`, { method: "DELETE" })
    }
    setLoading(false)
    onSaved()
    onClose()
  }

  const dateLabel = (() => {
    const [y, m, d] = date.split("-")
    return `${y}年${parseInt(m)}月${parseInt(d)}日`
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--surface)] pt-4 pb-2 px-6">
          <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mb-4" />
          <h2 className="text-base font-semibold text-center">
            {isEditing
              ? mode === "expense" ? "支出を編集" : "収入を編集"
              : mode === "expense" ? "支出を追加" : "収入を追加"}
          </h2>
        </div>

        <div className="px-6 pb-8 space-y-5">
          {/* Amount */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">金額</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] font-mono text-lg">¥</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => handleAmountInput(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 text-xl font-mono bg-[var(--muted)] rounded-xl border-none outline-none focus:ring-2 focus:ring-[var(--primary)] text-right"
                autoFocus
              />
            </div>
          </div>

          {/* Category / Income type */}
          {mode === "expense" ? (
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">カテゴリ</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-colors ${
                      categoryId === cat.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--muted)]"
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[10px]">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-[var(--muted-foreground)] mb-2 block">種別</label>
              <div className="grid grid-cols-2 gap-2">
                {INCOME_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setIncomeType(t.value)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      incomeType === t.value
                        ? "border-[var(--income)] bg-[var(--income)]/10 text-[var(--income)]"
                        : "border-[var(--border)] bg-[var(--muted)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Memo */}
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">メモ（任意）</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="例: ランチ、通勤定期など"
              maxLength={200}
              className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-medium">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={!amount || loading}
              className={`flex-1 py-3 rounded-xl text-white text-sm font-medium disabled:opacity-50 ${
                mode === "expense" ? "bg-[var(--expense)]" : "bg-[var(--income)]"
              }`}
            >
              {loading ? "保存中..." : isEditing ? "更新する" : "記録する"}
            </button>
          </div>

          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3 rounded-xl text-[var(--expense)] border border-[var(--expense)]/30 text-sm font-medium"
            >
              削除する
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
