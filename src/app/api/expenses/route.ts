import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getExpenses } from "@/lib/queries/expenses"
import { expenseSchema } from "@/lib/validations/expense"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get("from") ?? undefined
  const to = searchParams.get("to") ?? undefined

  const expenses = await getExpenses(session.user.id, { from, to })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, categoryId, date, memo } = parsed.data
  const rows = await sql`
    INSERT INTO expenses (user_id, amount, category_id, date, memo)
    VALUES (${session.user.id}, ${amount}, ${categoryId ?? null}, ${date}::date, ${memo ?? null})
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id }, { status: 201 })
}
