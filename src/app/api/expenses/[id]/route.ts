import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getExpenseById } from "@/lib/queries/expenses"
import { expenseSchema } from "@/lib/validations/expense"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const expense = await getExpenseById(id)
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (expense.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = expenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, categoryId, date, memo } = parsed.data
  if (categoryId) {
    const cat = await sql`
      SELECT 1 FROM categories WHERE id = ${categoryId} AND (user_id IS NULL OR user_id = ${session.user.id})
    `
    if (!cat[0]) return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }
  await sql`
    UPDATE expenses SET
      amount = ${amount},
      category_id = ${categoryId ?? null},
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
  const expense = await getExpenseById(id)
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (expense.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await sql`DELETE FROM expenses WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
