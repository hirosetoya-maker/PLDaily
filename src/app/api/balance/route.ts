import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getLatestBalance } from "@/lib/queries/balance"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const balanceSchema = z.object({
  amount: z.number().int().min(0),
  note: z.string().max(200).nullable().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const balance = await getLatestBalance(session.user.id)
  return NextResponse.json(balance)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = balanceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, note } = parsed.data
  const rows = await sql`
    INSERT INTO balance_logs (user_id, amount, note)
    VALUES (${session.user.id}, ${amount}, ${note ?? null})
    RETURNING id, recorded_at::text
  `
  return NextResponse.json({ id: rows[0].id, recordedAt: rows[0].recorded_at }, { status: 201 })
}
