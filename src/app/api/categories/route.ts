import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(10),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await sql`
    SELECT id, user_id, name, icon, is_default, sort_order
    FROM categories
    WHERE user_id IS NULL OR user_id = ${session.user.id}
    ORDER BY is_default DESC, sort_order ASC, created_at ASC
  `
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      icon: r.icon,
      isDefault: r.is_default,
      sortOrder: r.sort_order,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, icon } = parsed.data
  const rows = await sql`
    INSERT INTO categories (user_id, name, icon)
    VALUES (${session.user.id}, ${name}, ${icon})
    RETURNING id
  `
  return NextResponse.json({ id: rows[0].id }, { status: 201 })
}
