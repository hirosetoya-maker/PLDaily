import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(20),
})

async function checkOwnership(id: string, userId: string) {
  const cat = await sql`SELECT user_id FROM categories WHERE id = ${id}`
  if (!cat[0]) return { error: "Not found", status: 404 }
  // Default categories (user_id IS NULL) are editable/deletable by any signed-in user
  if (cat[0].user_id !== null && cat[0].user_id !== userId) {
    return { error: "Forbidden", status: 403 }
  }
  return null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const err = await checkOwnership(id, session.user.id)
  if (err) return NextResponse.json({ error: err.error }, { status: err.status })

  const body = await req.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await sql`UPDATE categories SET name = ${parsed.data.name}, icon = ${parsed.data.icon} WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const err = await checkOwnership(id, session.user.id)
  if (err) return NextResponse.json({ error: err.error }, { status: err.status })

  // Detach expenses referencing this category so the FK doesn't block deletion
  await sql`UPDATE expenses SET category_id = NULL WHERE category_id = ${id}`
  await sql`DELETE FROM categories WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
