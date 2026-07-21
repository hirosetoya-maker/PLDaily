import { auth } from "@/lib/auth"
import { getMonthSummary } from "@/lib/queries/monthSummary"
import { NextResponse } from "next/server"

function jstNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
}

function monthStartOf(offset: number): string {
  const now = jstNow()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [current, previous] = await Promise.all([
    getMonthSummary(session.user.id, monthStartOf(0)),
    getMonthSummary(session.user.id, monthStartOf(-1)),
  ])

  return NextResponse.json({ current, previous })
}
