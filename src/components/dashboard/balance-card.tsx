"use client"

import { useState } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { BalanceLog } from "@/types"

interface BalanceCardProps {
  balance: BalanceLog | null
  onUpdated: () => void
}

export function BalanceCard({ balance, onUpdated }: BalanceCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    const num = parseInt(amount.replace(/,/g, ""), 10)
    if (isNaN(num) || num < 0) return
    setLoading(true)
    await fetch("/api/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: num }),
    })
    setLoading(false)
    setShowModal(false)
    setAmount("")
    onUpdated()
  }

  function handleAmountInput(val: string) {
    const digits = val.replace(/[^0-9]/g, "")
    if (digits.length > 9) return
    setAmount(digits ? parseInt(digits, 10).toLocaleString("ja-JP") : "")
  }

  return (
    <>
      <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
        <div className="flex items-start justify-between mb-1">
          <span className="text-xs text-[var(--muted-foreground)]">手持ち残高</span>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-[var(--primary)] font-medium px-2 py-1 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            更新
          </button>
        </div>
        <div className="font-mono text-3xl font-bold tracking-tight">
          {balance ? formatCurrency(balance.amount) : "¥ ---"}
        </div>
        {balance && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {formatDate(balance.recordedAt)} 時点・収支記録から推定
          </p>
        )}
        {!balance && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            残高を設定してください
          </p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0">
          <div className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl p-6 space-y-4">
            <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
            <h2 className="text-base font-semibold text-center">手持ち残高を更新</h2>
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
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={!amount || loading}
                className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
              >
                {loading ? "更新中..." : "更新する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
