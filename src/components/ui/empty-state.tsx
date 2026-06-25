import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center px-4", className)}>
      <div className="text-4xl mb-4">📭</div>
      <p className="text-[var(--foreground)] font-medium mb-1">{title}</p>
      {description && (
        <p className="text-[var(--muted-foreground)] text-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
