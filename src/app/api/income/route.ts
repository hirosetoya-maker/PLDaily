import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getIncome } from "@/lib/queries/income"
import { incomeSchema } from "@/lib/validations/income"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get("from") ?? undefined
  const to = searchParams.get("to") ?? undefined

  const income = await getIncome(session.user.id, { from, to })
  return NextResponse.json(income)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = incomeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, type, date, memo } = parsed.data
  const rows = await sql`
    INSERT INTO income (user_id, amount, type, date, memo)
    VALUES (${session.user.id}, ${amount}, ${type}, ${date}::date, ${memo ?? null})
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id }, { status: 201 })
}
