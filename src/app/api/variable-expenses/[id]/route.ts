import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { variableExpenseSchema } from "@/lib/validations/fixed"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ve = await sql`SELECT user_id FROM variable_expenses WHERE id = ${id}`
  if (!ve[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (ve[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = variableExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, amount, paymentDate, month } = parsed.data
  await sql`
    UPDATE variable_expenses SET
      name = ${name}, amount = ${amount},
      payment_date = ${paymentDate}::date, month = ${month}::date
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const ve = await sql`SELECT user_id FROM variable_expenses WHERE id = ${id}`
  if (!ve[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (ve[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await sql`DELETE FROM variable_expenses WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
