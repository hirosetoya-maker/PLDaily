import { auth } from "@/lib/auth"
import { calculateCashFlow } from "@/lib/cashflow"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const points = await calculateCashFlow(session.user.id, 90)
  return NextResponse.json(points)
}
