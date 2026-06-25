import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { fixedExpenseSchema } from "@/lib/validations/fixed"

const paidSchema = z.object({ isPaid: z.boolean() })

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Toggle is_paid on monthly_fixed
  if ("isPaid" in body) {
    const parsed = paidSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 })

    const mf = await sql`
      SELECT mf.id, fe.user_id FROM monthly_fixed mf
      JOIN fixed_expenses fe ON mf.fixed_expense_id = fe.id
      WHERE mf.id = ${id}
    `
    if (!mf[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (mf[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await sql`UPDATE monthly_fixed SET is_paid = ${parsed.data.isPaid} WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  }

  // Update fixed expense master
  const fe = await sql`SELECT user_id FROM fixed_expenses WHERE id = ${id}`
  if (!fe[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (fe[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = fixedExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await sql`
    UPDATE fixed_expenses SET name = ${parsed.data.name}, amount = ${parsed.data.amount}
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const fe = await sql`SELECT user_id FROM fixed_expenses WHERE id = ${id}`
  if (!fe[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (fe[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await sql`UPDATE fixed_expenses SET is_active = false, deleted_at = NOW() WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
