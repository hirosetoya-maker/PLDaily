import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(10),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const cat = await sql`SELECT user_id, is_default FROM categories WHERE id = ${id}`
  if (!cat[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (cat[0].is_default) return NextResponse.json({ error: "Cannot edit default categories" }, { status: 403 })
  if (cat[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

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
  const cat = await sql`SELECT user_id, is_default FROM categories WHERE id = ${id}`
  if (!cat[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (cat[0].is_default) return NextResponse.json({ error: "Cannot delete default categories" }, { status: 403 })
  if (cat[0].user_id !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await sql`DELETE FROM categories WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
