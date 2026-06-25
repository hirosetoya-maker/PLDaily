import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getIncomeById } from "@/lib/queries/income"
import { incomeSchema } from "@/lib/validations/income"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const income = await getIncomeById(id)
  if (!income) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (income.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = incomeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, type, date, memo } = parsed.data
  await sql`
    UPDATE income SET
      amount = ${amount},
      type = ${type},
      date = ${date}::date,
      memo = ${memo ?? null},
      updated_at = NOW()
    WHERE id = ${id}
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const income = await getIncomeById(id)
  if (!income) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (income.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await sql`DELETE FROM income WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
