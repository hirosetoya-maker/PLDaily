import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getVariableExpenses } from "@/lib/queries/fixed"
import { variableExpenseSchema } from "@/lib/validations/fixed"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const month = req.nextUrl.searchParams.get("month") ?? ""
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 })

  const items = await getVariableExpenses(session.user.id, month)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = variableExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, amount, paymentDate, month } = parsed.data
  const rows = await sql`
    INSERT INTO variable_expenses (user_id, name, amount, payment_date, month)
    VALUES (${session.user.id}, ${name}, ${amount}, ${paymentDate}::date, ${month}::date)
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id }, { status: 201 })
}
