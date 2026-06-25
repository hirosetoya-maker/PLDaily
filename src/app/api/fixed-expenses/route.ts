import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getFixedExpenses, getMonthlyFixed } from "@/lib/queries/fixed"
import { fixedExpenseSchema, monthlyFixedSchema } from "@/lib/validations/fixed"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const month = req.nextUrl.searchParams.get("month")
  if (month) {
    const items = await getMonthlyFixed(session.user.id, month)
    return NextResponse.json(items)
  }

  const items = await getFixedExpenses(session.user.id)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Create fixed expense master
  if (body.action === "create_master") {
    const parsed = fixedExpenseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    const { name, amount } = parsed.data
    const rows = await sql`
      INSERT INTO fixed_expenses (user_id, name, amount)
      VALUES (${session.user.id}, ${name}, ${amount})
      RETURNING id
    `
    return NextResponse.json({ id: rows[0].id }, { status: 201 })
  }

  // Upsert monthly fixed entry
  const parsed = monthlyFixedSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { fixedExpenseId, month, amount, paymentDate } = parsed.data

  // Verify ownership
  const fe = await sql`SELECT user_id FROM fixed_expenses WHERE id = ${fixedExpenseId}`
  if (!fe[0] || fe[0].user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await sql`
    INSERT INTO monthly_fixed (fixed_expense_id, month, amount, payment_date)
    VALUES (${fixedExpenseId}, ${month}::date, ${amount}, ${paymentDate}::date)
    ON CONFLICT (fixed_expense_id, month) DO UPDATE SET
      amount = EXCLUDED.amount,
      payment_date = EXCLUDED.payment_date
  `
  return NextResponse.json({ ok: true }, { status: 201 })
}
