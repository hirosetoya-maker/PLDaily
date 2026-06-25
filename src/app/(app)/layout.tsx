import { BottomNav } from "@/components/layout/bottom-nav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <main className="max-w-lg mx-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
