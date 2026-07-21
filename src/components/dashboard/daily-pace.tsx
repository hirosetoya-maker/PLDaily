import { formatCurrency } from "@/lib/utils"
import type { DailyPace } from "@/types"

interface DailyPaceProps {
  pace: DailyPace
}

export function DailyPaceCard({ pace }: DailyPaceProps) {
  const isOverBudget = pace.remainingBudget < 0

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] space-y-4">
      <span className="text-xs text-[var(--muted-foreground)]">支出ペース</span>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--muted-foreground)]">
            1日の平均支出（{pace.daysElapsed}日間）
          </p>
          <p className="font-mono text-lg font-bold text-[var(--expense)]">
            {formatCurrency(Math.round(pace.dailyAverageSoFar))}
            <span className="text-xs font-normal text-[var(--muted-foreground)]"> /日</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--muted-foreground)]">
            残り{pace.daysRemaining}日の1日あたり上限
          </p>
          <p
            className={`font-mono text-lg font-bold ${
              isOverBudget ? "text-[var(--expense)]" : "text-[var(--income)]"
            }`}
          >
            {isOverBudget ? "−" : ""}
            {formatCurrency(Math.abs(Math.round(pace.dailyAllowanceRemaining)))}
            <span className="text-xs font-normal text-[var(--muted-foreground)]"> /日</span>
          </p>
        </div>
      </div>

      {isOverBudget && (
        <p className="text-xs text-[var(--expense)] font-medium">
          ⚠ このままだと今月は赤字の見込みです（不足 {formatCurrency(Math.abs(pace.remainingBudget))}）
        </p>
      )}

      <p className="text-[10px] text-[var(--muted-foreground)]">
        今月の収入 {formatCurrency(pace.monthlyIncome)} − 固定費 {formatCurrency(pace.fixedTotal)} − ここまでの支出{" "}
        {formatCurrency(pace.variableSpentSoFar)} を残り{pace.daysRemaining}日で割った金額です
      </p>
    </div>
  )
}
