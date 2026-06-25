"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import type { CashFlowPoint } from "@/types"

interface CashFlowChartProps {
  data: CashFlowPoint[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-lg text-xs">
      <p className="text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className="font-mono font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (!data.length) {
    return (
      <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
        <span className="text-xs text-[var(--muted-foreground)]">キャッシュフロー予測</span>
        <div className="h-32 flex items-center justify-center text-[var(--muted-foreground)] text-sm mt-4">
          残高を設定するとグラフが表示されます
        </div>
      </div>
    )
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const hasNegative = data.some((d) => d.balance < 0)

  const actualData = data.filter((d) => !d.isProjected)
  const projectedData = data.filter((d) => d.isProjected)

  // Weekly ticks
  const ticks = data
    .filter((_, i) => i % 7 === 0)
    .map((d) => d.date)

  const minBalance = Math.min(...data.map((d) => d.balance))
  const maxBalance = Math.max(...data.map((d) => d.balance))

  const scheduledCount = data.filter((d) => d.isProjected && d.balance !== data[0]?.balance).length

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--muted-foreground)]">キャッシュフロー予測</span>
        {hasNegative && (
          <span className="text-xs text-[var(--expense)] font-medium">⚠ 残高不足の予測あり</span>
        )}
      </div>
      <div className="flex items-center gap-4 mb-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-[var(--primary)]" />
          <span className="text-[10px] text-[var(--muted-foreground)]">実績</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 border-t-2 border-dashed border-[var(--primary)] opacity-60" />
          <span className="text-[10px] text-[var(--muted-foreground)]">予測</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            ticks={ticks}
            tickFormatter={(v) => {
              const [, m, d] = v.split("-")
              return `${parseInt(m)}/${parseInt(d)}`
            }}
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
            domain={[Math.min(0, minBalance - 10000), maxBalance + 10000]}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasNegative && (
            <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 4" strokeWidth={1} />
          )}
          <ReferenceLine x={todayStr} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary)" }}
            data={actualData.length > 0 ? [...actualData, { ...projectedData[0], balance: actualData[actualData.length - 1]?.balance }] : data}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeDasharray="5 5"
            strokeOpacity={0.6}
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary)" }}
            data={projectedData}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
