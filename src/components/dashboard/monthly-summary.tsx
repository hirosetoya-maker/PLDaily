import { formatCurrency } from "@/lib/utils"

interface MonthlySummaryProps {
  income: number
  expenses: number
}

export function MonthlySummary({ income, expenses }: MonthlySummaryProps) {
  const net = income - expenses
  const isPositive = net >= 0

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)]">
      <span className="text-xs text-[var(--muted-foreground)]">今月の収支</span>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--income)] text-sm">▲</span>
            <span className="text-sm text-[var(--muted-foreground)]">収入</span>
          </div>
          <span className="font-mono text-sm font-medium text-[var(--income)]">
            {formatCurrency(income)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--expense)] text-sm">▼</span>
            <span className="text-sm text-[var(--muted-foreground)]">支出</span>
          </div>
          <span className="font-mono text-sm font-medium text-[var(--expense)]">
            {formatCurrency(expenses)}
          </span>
        </div>
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-sm font-medium">差引</span>
          <span
            className={`font-mono text-lg font-bold ${
              isPositive ? "text-[var(--income)]" : "text-[var(--expense)]"
            }`}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(net)}
          </span>
        </div>
      </div>
    </div>
  )
}
