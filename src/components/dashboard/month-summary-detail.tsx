import { formatCurrency } from "@/lib/utils"
import type { MonthSummary } from "@/types"

interface MonthSummaryDetailProps {
  title: string
  summary: MonthSummary
}

function monthLabel(month: string): string {
  const [, m] = month.split("-")
  return `${parseInt(m, 10)}月`
}

export function MonthSummaryDetail({ title, summary }: MonthSummaryDetailProps) {
  const isPositive = summary.net >= 0
  const maxAmount = Math.max(1, ...summary.categories.map((c) => c.amount))

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted-foreground)]">
          {title}（{monthLabel(summary.month)}）
        </span>
        <span
          className={`font-mono text-sm font-bold ${
            isPositive ? "text-[var(--income)]" : "text-[var(--expense)]"
          }`}
        >
          {isPositive ? "+" : "−"}
          {formatCurrency(Math.abs(summary.net))}
        </span>
      </div>

      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between text-xs">
        <span className="text-[var(--muted-foreground)]">
          収入 <span className="font-mono text-[var(--income)]">{formatCurrency(summary.income)}</span>
        </span>
        <span className="text-[var(--muted-foreground)]">
          支出 <span className="font-mono text-[var(--expense)]">{formatCurrency(summary.expenseTotal)}</span>
        </span>
      </div>

      {summary.categories.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-[var(--muted-foreground)]">
          この月の支出記録はありません
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {summary.categories.map((c) => (
            <li key={c.categoryId ?? "none"} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm flex items-center gap-2">
                  <span>{c.categoryIcon}</span>
                  <span>{c.categoryName}</span>
                </span>
                <span className="font-mono text-sm">{formatCurrency(c.amount)}</span>
              </div>
              <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--expense)] rounded-full"
                  style={{ width: `${(c.amount / maxAmount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {summary.fixedTotal > 0 && (
        <p className="px-5 py-2 text-[10px] text-[var(--muted-foreground)] border-t border-[var(--border)]">
          うち固定費 {formatCurrency(summary.fixedTotal)}（月次一覧のカテゴリには含まれません）
        </p>
      )}
    </div>
  )
}
