import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { fixedExpenseSchema } from "@/lib/validations/fixed"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const fe = await sql`SELECT user_id FROM fixed_expenses WHERE id = ${id}`
  if (!fe[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (fe[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = fixedExpenseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await sql`
    UPDATE fixed_expenses SET name = ${parsed.data.name}, amount = ${parsed.data.amount}, note = ${parsed.data.note ?? null}
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
