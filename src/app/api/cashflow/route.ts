import { auth } from "@/lib/auth"
import { calculateMonthlyCashFlow } from "@/lib/cashflow"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const points = await calculateMonthlyCashFlow(session.user.id)
  return NextResponse.json(points)
}
