"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { VariableExpense, FixedExpense } from "@/types"
import { EmptyState } from "@/components/ui/empty-state"
import { toJSTDateString } from "@/lib/utils"
import { apiRequest } from "@/lib/api"

function getMonthDate(offset = 0): string {
  const now = new Date()
  return toJSTDateString(new Date(now.getFullYear(), now.getMonth() + offset, 1))
}

function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-")
  return `${y}年${parseInt(m)}月`
}

async function fetchArray<T>(url: string): Promise<T[]> {
  const result = await fetchArrayResult<T>(url)
  return result.data
}

async function fetchArrayResult<T>(url: string): Promise<{ ok: boolean; data: T[] }> {
  try {
    const res = await fetch(url)
    if (!res.ok) return { ok: false, data: [] }
    const json = await res.json()
    return { ok: true, data: Array.isArray(json) ? json : [] }
  } catch {
    return { ok: false, data: [] }
  }
}

// 毎月かかる固定費のプリセット（支払い方法問わず）
const FIXED_PRESETS = [
  { name: "家賃", amount: 30000 },
  { name: "借金返済", amount: 20000 },
  { name: "食費", amount: 30000 },
  { name: "自己理解プログラム", amount: 36025 },
  { name: "ユースキャリア教育機構 会費", amount: 11000 },
  { name: "SMP", amount: 14361 },
  { name: "CapCut", amount: 2180 },
  { name: "iCloud", amount: 1500 },
  { name: "Google One", amount: 290 },
  { name: "宮城島", amount: 9800 },
  { name: "FIT PLACE", amount: 4378 },
  { name: "iPhone17", amount: 22697 },
  { name: "脱毛", amount: 9000 },
  { name: "Claude", amount: 3400 },
  { name: "奨学金", amount: 15157 },
  { name: "Revive", amount: 52137 },
  { name: "Amazon Prime", amount: 600 },
]

// 口座引き落としのテンプレート（day = 引き落とし日、31 = 末日）
const DEBIT_PRESETS: { name: string; day: number; amount?: number }[] = [
  { name: "家賃", day: 31, amount: 30000 },
  { name: "借金返済", day: 31, amount: 20000 },
  { name: "奨学金", day: 27, amount: 15157 },
  { name: "JCBW", day: 10 },
  { name: "リクルート", day: 10 },
  { name: "PayPay", day: 27 },
  { name: "Olive", day: 27 },
  { name: "三井住友NL", day: 27 },
  { name: "楽天カード", day: 27 },
]

function presetDateFor(month: string, day: number): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10))
  const daysInMonth = new Date(y, m, 0).getDate()
  const d = Math.min(day, daysInMonth)
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export default function FixedPage() {
  const [monthOffset, setMonthOffset] = useState(0)
  const [fixedMasters, setFixedMasters] = useState<FixedExpense[]>([])
  const [fixedLoading, setFixedLoading] = useState(true)
  const [fixedError, setFixedError] = useState(false)
  const [variables, setVariables] = useState<VariableExpense[]>([])
  const [showAddFixed, setShowAddFixed] = useState(false)
  const [showAddVariable, setShowAddVariable] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [editFixedMaster, setEditFixedMaster] = useState<FixedExpense | null>(null)
  const [editVariable, setEditVariable] = useState<VariableExpense | null>(null)
  const requestId = useRef(0)

  const month = getMonthDate(monthOffset)

  const fetchData = useCallback(async () => {
    const id = ++requestId.current
    setFixedLoading(true)
    const [mastersResult, vars] = await Promise.all([
      fetchArrayResult<FixedExpense>("/api/fixed-expenses"),
      fetchArray<VariableExpense>(`/api/variable-expenses?month=${month}`),
    ])
    if (id !== requestId.current) return // stale response, a newer request has since started
    setFixedMasters(mastersResult.data)
    setFixedError(!mastersResult.ok)
    setFixedLoading(false)
    setVariables(vars)
  }, [month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function deleteFixedMaster(fe: FixedExpense) {
    if (!confirm(`「${fe.name} ¥${fe.amount.toLocaleString("ja-JP")}」を削除しますか？`)) return
    const result = await apiRequest(`/api/fixed-expenses/${fe.id}`, { method: "DELETE" })
    if (!result.ok) {
      alert(result.error ?? "削除できませんでした")
      return
    }
    fetchData()
  }

  async function deleteVariable(v: VariableExpense) {
    if (!confirm(`「${v.name} ¥${v.amount.toLocaleString("ja-JP")}」を削除しますか？`)) return
    const result = await apiRequest(`/api/variable-expenses/${v.id}`, { method: "DELETE" })
    if (!result.ok) {
      alert(result.error ?? "削除できませんでした")
      return
    }
    fetchData()
  }

  async function toggleVariablePaid(v: VariableExpense) {
    const result = await apiRequest(`/api/variable-expenses/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: v.name,
        amount: v.amount,
        paymentDate: v.paymentDate,
        month: v.month,
        isPaid: !v.isPaid,
      }),
    })
    if (!result.ok) {
      alert(result.error ?? "更新できませんでした")
      return
    }
    fetchData()
  }

  const fixedTotal = fixedMasters.reduce((s, fe) => s + fe.amount, 0)
  const varTotal = variables.reduce((s, v) => s + v.amount, 0)

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* 毎月の固定費（支払い方法問わず、毎月いくらかかっているか） */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">毎月の固定費</p>
            <p className="font-mono text-lg font-bold">¥{fixedTotal.toLocaleString("ja-JP")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(true)}
              className="text-xs text-[var(--muted-foreground)] font-medium px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]"
            >
              プリセット
            </button>
            <button
              onClick={() => { setEditFixedMaster(null); setShowAddFixed(true) }}
              className="text-xs text-[var(--primary)] font-medium px-3 py-2 rounded-lg border border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
            >
              ＋ 追加
            </button>
          </div>
        </div>
        <p className="px-5 pt-3 text-[10px] text-[var(--muted-foreground)]">
          カード払い含め、毎月固定でかかっている金額の一覧
        </p>

        {fixedLoading ? (
          <div className="px-5 py-8 text-center text-xs text-[var(--muted-foreground)]">
            読み込み中...
          </div>
        ) : fixedError ? (
          <div className="px-5 py-8 text-center space-y-2">
            <p className="text-xs text-[var(--expense)]">読み込みに失敗しました</p>
            <button
              onClick={() => fetchData()}
              className="text-xs text-[var(--primary)] font-medium underline"
            >
              再試行
            </button>
          </div>
        ) : fixedMasters.length === 0 ? (
          <EmptyState title="固定費が登録されていません" className="py-8" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {fixedMasters.map((fe) => (
              <li key={fe.id} className="flex items-center justify-between px-5 py-3.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fe.name}</p>
                  {fe.note && (
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{fe.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm text-[var(--expense)]">
                    ¥{fe.amount.toLocaleString("ja-JP")}
                  </span>
                  <button
                    onClick={() => { setEditFixedMaster(fe); setShowAddFixed(true) }}
                    className="text-xs text-[var(--primary)] px-2 py-2 rounded"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteFixedMaster(fe)}
                    className="text-xs text-[var(--expense)] px-2 py-2 rounded"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 口座引き落とし（その月、いついくら口座から出ていくか） */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-[var(--muted)] text-lg"
          >
            ◀
          </button>
          <span className="font-medium text-sm">{monthLabel(month)}</span>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-[var(--muted)] text-lg"
          >
            ▶
          </button>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">口座引き落とし</p>
            <p className="font-mono text-lg font-bold">¥{varTotal.toLocaleString("ja-JP")}</p>
          </div>
          <button
            onClick={() => { setEditVariable(null); setShowAddVariable(true) }}
            className="text-xs text-[var(--primary)] font-medium px-3 py-2 rounded-lg border border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
          >
            ＋ 追加
          </button>
        </div>
        <p className="px-5 pt-3 text-[10px] text-[var(--muted-foreground)]">
          家賃・カード請求など、この月に口座から引き落とされる予定。支払ったらチェックしてください
        </p>

        {variables.length === 0 ? (
          <EmptyState title="引き落とし予定がありません" className="py-8" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {variables.map((v) => (
              <li
                key={v.id}
                className={`flex items-center gap-3 px-5 py-3.5 ${v.isPaid ? "opacity-50" : ""}`}
              >
                <button
                  onClick={() => toggleVariablePaid(v)}
                  aria-label={v.isPaid ? "未払いに戻す" : "支払い済みにする"}
                  className={`w-6 h-6 shrink-0 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                    v.isPaid
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                      : "border-[var(--border)]"
                  }`}
                >
                  {v.isPaid ? "✓" : ""}
                </button>
                <button
                  onClick={() => { setEditVariable(v); setShowAddVariable(true) }}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {v.paymentDate.split("-").slice(1).join("/").replace(/^0/, "")} 引き落とし
                    {v.isPaid && "・支払い済み"}
                  </p>
                </button>
                <span className="font-mono text-sm text-[var(--expense)] shrink-0">
                  ¥{v.amount.toLocaleString("ja-JP")}
                </span>
                <button
                  onClick={() => deleteVariable(v)}
                  className="w-9 h-9 shrink-0 rounded-full border border-[var(--border)] flex items-center justify-center text-xs text-[var(--muted-foreground)] hover:border-[var(--expense)] hover:text-[var(--expense)]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showPresets && (
        <PresetSheet
          existingNames={fixedMasters.map((fe) => fe.name)}
          onClose={() => setShowPresets(false)}
          onSaved={fetchData}
        />
      )}
      {showAddFixed && (
        <AddFixedSheet
          master={editFixedMaster}
          onClose={() => setShowAddFixed(false)}
          onSaved={fetchData}
        />
      )}
      {showAddVariable && (
        <AddVariableSheet
          month={month}
          editing={editVariable}
          onClose={() => { setShowAddVariable(false); setEditVariable(null) }}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}

function PresetSheet({
  existingNames,
  onClose,
  onSaved,
}: {
  existingNames: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const available = FIXED_PRESETS.filter((p) => !existingNames.includes(p.name))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const allSelected = available.length > 0 && selected.size === available.length

  async function handleSave() {
    if (selected.size === 0) return
    setLoading(true)
    setError(null)
    const result = await apiRequest("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed_selected", names: [...selected] }),
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? "追加できませんでした")
      return
    }
    onSaved()
    onClose()
  }

  const selectedTotal = available
    .filter((p) => selected.has(p.name))
    .reduce((s, p) => s + p.amount, 0)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 pb-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl overflow-y-auto"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--surface)] pt-4 pb-2 px-6">
          <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">追加する固定費を選択</h2>
            <button
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(available.map((p) => p.name)))
              }
              className="text-xs text-[var(--primary)] px-2 py-2"
            >
              {allSelected ? "全解除" : "全選択"}
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {available.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-6 text-center">
              すべてのプリセットが登録済みです
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {available.map((p) => (
                <li key={p.name}>
                  <button
                    onClick={() => toggle(p.name)}
                    className="w-full flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                          selected.has(p.name)
                            ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {selected.has(p.name) ? "✓" : ""}
                      </span>
                      <span className="text-sm">{p.name}</span>
                    </div>
                    <span className="font-mono text-sm">¥{p.amount.toLocaleString("ja-JP")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="text-xs text-[var(--expense)] text-center pt-2">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={selected.size === 0 || loading}
              className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
            >
              {loading
                ? "追加中..."
                : selected.size === 0
                  ? "追加する"
                  : `${selected.size}件追加（¥${selectedTotal.toLocaleString("ja-JP")}）`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddFixedSheet({
  master,
  onClose,
  onSaved,
}: {
  master: FixedExpense | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(master?.name ?? "")
  const [amount, setAmount] = useState(
    master ? master.amount.toLocaleString("ja-JP") : ""
  )
  const [note, setNote] = useState(master?.note ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const num = parseInt(amount.replace(/,/g, ""), 10)
    if (!name || !num) return
    setLoading(true)
    setError(null)
    const body = { name, amount: num, note: note || null }
    const result = master
      ? await apiRequest(`/api/fixed-expenses/${master.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await apiRequest("/api/fixed-expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_master", ...body }),
        })
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? "保存できませんでした")
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 pb-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl p-6 space-y-4 overflow-y-auto"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
        <h2 className="text-base font-semibold text-center">
          {master ? "固定費を編集" : "固定費を追加"}
        </h2>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 家賃、Netflix"
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-base outline-none focus:ring-2 focus:ring-[var(--primary)]"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">毎月の金額</label>
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
              className="w-full pl-8 pr-4 py-3 font-mono bg-[var(--muted)] rounded-xl text-base outline-none focus:ring-2 focus:ring-[var(--primary)] text-right"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
            備考（任意）
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例: ローン残り24回、2027年3月まで"
            maxLength={200}
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-base outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--expense)] text-center">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">キャンセル</button>
          <button
            onClick={handleSave}
            disabled={!name || !amount || loading}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "保存中..." : master ? "更新する" : "追加する"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddVariableSheet({
  month,
  editing,
  onClose,
  onSaved,
}: {
  month: string
  editing: VariableExpense | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(editing?.name ?? "")
  const [amount, setAmount] = useState(editing ? editing.amount.toLocaleString("ja-JP") : "")
  const [paymentDate, setPaymentDate] = useState(editing?.paymentDate ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const num = parseInt(amount.replace(/,/g, ""), 10)
    if (!name || !num || !paymentDate) return
    setLoading(true)
    setError(null)
    const body = { name, amount: num, paymentDate, month, isPaid: editing?.isPaid ?? false }
    const result = editing
      ? await apiRequest(`/api/variable-expenses/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await apiRequest("/api/variable-expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? "保存できませんでした")
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 pb-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface)] rounded-t-3xl p-6 space-y-4 overflow-y-auto"
        style={{ maxHeight: "85dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto" />
        <h2 className="text-base font-semibold text-center">
          {editing ? "引き落としを編集" : "引き落としを追加"}
        </h2>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-2 block">よく使う引き落とし（タップで入力）</label>
          <div className="flex flex-wrap gap-2">
            {DEBIT_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setName(p.name)
                  setPaymentDate(presetDateFor(month, p.day))
                  if (p.amount) setAmount(p.amount.toLocaleString("ja-JP"))
                }}
                className={`px-3 py-2 rounded-full border text-xs transition-colors ${
                  name === p.name
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--muted)]"
                }`}
              >
                {p.name}（{p.day === 31 ? "末日" : `${p.day}日`}）
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: クレジットカード請求"
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-base outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
              className="w-full pl-8 pr-4 py-3 font-mono bg-[var(--muted)] rounded-xl text-base outline-none focus:ring-2 focus:ring-[var(--primary)] text-right"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--muted-foreground)] mb-1 block">引き落とし日</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--muted)] rounded-xl text-base outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--expense)] text-center">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm">キャンセル</button>
          <button
            onClick={handleSave}
            disabled={!name || !amount || !paymentDate || loading}
            className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? "保存中..." : editing ? "更新する" : "追加する"}
          </button>
        </div>
      </div>
    </div>
  )
}
