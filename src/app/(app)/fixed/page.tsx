"use client"

import { useEffect, useState, useCallback } from "react"
import type { MonthlyFixed, VariableExpense, FixedExpense } from "@/types"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDateShort } from "@/lib/utils"

function getMonthDate(offset = 0): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return d.toISOString().split("T")[0]
}

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-")
  return `${y}年${parseInt(m)}月`
}

export default function FixedPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [fixedMasters, setFixedMasters] = useState<FixedExpense[]>([])
  const [monthlyFixed, setMonthlyFixed] = useState<MonthlyFixed[]>([])
  const [variables, setVariables] = useState<VariableExpense[]>([])
  const [showAddFixed, setShowAddFixed] = useState(false)
  const [showAddVariable, setShowAddVariable] = useState(false)
  const [editFixedMaster, setEditFixedMaster] = useState<FixedExpense | null>(null)

  const month = getMonthDate(monthOffset)

  const fetchData = useCallback(async () => {
    const [masterRes, mfRes, varRes] = await Promise.all([
      fetch("/api/fixed-expenses"),
      fetch(`/api/fixed-expenses?month=${month}`),
      fetch(`/api/variable-expenses?month=${month}`),
    ])
    setFixedMasters(await masterRes.json())
    setMonthlyFixed(await mfRes.json())
    setVariables(await varRes.json())
  }, [month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function togglePaid(mf: MonthlyFixed) {
    await fetch(`/api/fixed-expenses/${mf.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !mf.isPaid }),
    })
    fetchData()
  }

  async function deleteVariable(id: string) {
    if (!confirm("削除しますか？")) return
    await fetch(`/api/variable-expenses/${id}`, { method: "DELETE" })
    fetchData()
  }

  const fixedTotal = monthlyFixed.reduce((s, mf) => s + mf.amount, 0)
  const varTotal = variables.reduce((s, v) => s + v.amount, 0)

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Month picker */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-[var(--muted)] text-lg"
        >
          ◀
        </button>
        <span className="font-medium text-base">{monthLabel(month)}</span>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-[var(--muted)] text-lg"
        >
          ▶
        </button>
      </div>

      {/* Fixed expenses */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">固定費</p>
            <p className="font-mono text-lg font-bold">¥{fixedTotal.toLocaleString("ja-JP")}</p>
          </div>
          <button
            onClick={() => { setEditFixedMaster(null); setShowAddFixed(true) }}
            className="text-xs text-[var(--primary)] font-medium px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
          >
            ＋ 追加
          </button>
        </div>

        {monthlyFixed.length === 0 ? (
          <EmptyState title="固定費が登録されていません" className="py-8" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {monthlyFixed.map((mf) => (
              <li key={mf.id} className={`flex items-center justify-between px-5 py-3.5 ${mf.isPaid ? "opacity-50" : ""}`}>
                <div>
                  <p className="text-sm font-medium">{mf.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {mf.paymentDate.split("-").slice(1).join("/").replace(/^0/, "")} 引き落とし
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-[var(--expense)]">
                    ¥{mf.amount.toLocaleString("ja-JP")}
                  </span>
                  <button
                    onClick={() => togglePaid(mf)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${
                      mf.isPaid
                        ? "bg-[var(--income)] border-[var(--income)] text-white"
                        : "border-[var(--border)]"
                    }`}
                  >
                    {mf.isPaid ? "✓" : ""}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Variable expenses */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">変動費</p>
            <p className="font-mono text-lg font-bold">¥{varTotal.toLocaleString("ja-JP")}</p>
          </div>
          <button
            onClick={() => setShowAddVariable(true)}
            className="text-xs text-[var(--primary)] font-medium px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
          >
            ＋ 追加
          </button>
        </div>

        {variables.length === 0 ? (
          <EmptyState title="変動費が登録されていません" className="py-8" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {variables.map((v) => (
              <li key={v.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {v.paymentDate.split("-").slice(1).join("/").replace(/^0/, "")} 引き落とし
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-[var(--expense)]">
                    ¥{v.amount.toLocaleString("ja-JP")}
                  </span>
                  <button
                    onClick={() => deleteVariable(v.id)}
                    className="w-7 h-7 rounded-full border border-[var(--border)] flex items-center justify-center text-xs text-[var(--muted-foreground)] hover:border-[var(--expense)] hover:text-[var(--expense)]"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAddFixed && (
        <AddFixedSheet
          month={month}
          onClose={() => setShowAddFixed(false)}
          onSaved={fetchData}
        />
      )}
      {showAddVariable && (
        <AddVariableSheet
          month={month}
          onClose={() => setShowAddVariable(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}

function AddFixedSheet({ month, onClose, onSaved }: { month: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const num = parseInt(amount.replace(/,/g, ""), 10)
    if (!name || !num || !paymentDate) return
    setLoading(true)

    // 1. Create master
    const masterRes = await fetch("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_master", name, amount: num }),
    })
    const { id: fixedExpenseId } = await masterRes.json()

    // 2. Create monthly entry
    await fetch("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixedExpenseId, month, amount: num, paymentDate }),
    })

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
        <h2 className="text-base font-semibold text-center">固定費を追加</h2>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 家賃、Netflix"
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">金額</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] font-mono">¥</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const d = e.target.value.replace(/[^0-9]/g, "")
                setAmount(d ? parseInt(d, 10).toLocaleString("ja-JP") : "")
              }}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 font-mono bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] text-right"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">引き落とし日</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">キャンセル</button>
          <button
            onClick={handleSave}
            disabled={!name || !amount || !paymentDate || loading}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "保存中..." : "追加する"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddVariableSheet({ month, onClose, onSaved }: { month: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const num = parseInt(amount.replace(/,/g, ""), 10)
    if (!name || !num || !paymentDate) return
    setLoading(true)
    await fetch("/api/variable-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount: num, paymentDate, month }),
    })
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
        <h2 className="text-base font-semibold text-center">変動費を追加</h2>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: クレジットカード請求"
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">金額</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] font-mono">¥</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const d = e.target.value.replace(/[^0-9]/g, "")
                setAmount(d ? parseInt(d, 10).toLocaleString("ja-JP") : "")
              }}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 font-mono bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)] text-right"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">引き落とし日</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">キャンセル</button>
          <button
            onClick={handleSave}
            disabled={!name || !amount || !paymentDate || loading}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "保存中..." : "追加する"}
          </button>
        </div>
      </div>
    </div>
  )
}
