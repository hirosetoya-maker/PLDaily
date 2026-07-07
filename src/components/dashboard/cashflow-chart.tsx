"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/utils"
import type { MonthlyCashFlow } from "@/types"

interface CashFlowChartProps {
  data: MonthlyCashFlow[]
}

function monthLabel(month: string): string {
  const [, m] = month.split("-")
  return `${parseInt(m)}月`
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { payload: MonthlyCashFlow }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-lg text-xs space-y-1">
      <p className="text-[var(--muted-foreground)]">{label}</p>
      <p className="font-mono">▲収入 {formatCurrency(d.income)}</p>
      <p className="font-mono">▼支出 {formatCurrency(d.expense)}</p>
      <p className={`font-mono font-bold ${d.net >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"}`}>
        差引 {d.net >= 0 ? "+" : "−"}{formatCurrency(Math.abs(d.net))}
      </p>
    </div>
  )
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (!data.length) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
        <span className="text-xs text-[var(--muted-foreground)]">月次収支</span>
        <div className="h-32 flex items-center justify-center text-[var(--muted-foreground)] text-sm mt-4">
          収支を記録するとグラフが表示されます
        </div>
      </div>
    )
  }

  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }))
  const hasDeficit = data.some((d) => d.net < 0)

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--muted-foreground)]">月次収支（毎月の固定費含む）</span>
        {hasDeficit && (
          <span className="text-xs text-[var(--expense)] font-medium">⚠ 赤字の月あり</span>
        )}
      </div>
      <div className="flex items-center gap-4 mb-3 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[var(--income)]" />
          <span className="text-[10px] text-[var(--muted-foreground)]">▲収入</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-[var(--expense)]" />
          <span className="text-[10px] text-[var(--muted-foreground)]">▼支出</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>

      {/* 月ごとの差引（黒字/赤字） */}
      <div className="flex mt-2">
        {chartData.map((d) => (
          <div key={d.month} className="flex-1 text-center">
            <p
              className={`font-mono text-[10px] font-medium ${
                d.net >= 0 ? "text-[var(--income)]" : "text-[var(--expense)]"
              }`}
            >
              {d.net >= 0 ? "+" : "−"}
              {Math.abs(d.net) >= 10000
                ? `${(Math.abs(d.net) / 10000).toFixed(1)}万`
                : Math.abs(d.net).toLocaleString("ja-JP")}
            </p>
            {d.isCurrent && <p className="text-[9px] text-[var(--muted-foreground)]">今月</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
