import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getFixedExpenses, getMonthlyFixed } from "@/lib/queries/fixed"
import { fixedExpenseSchema, monthlyFixedSchema } from "@/lib/validations/fixed"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// 毎月かかる固定費のプリセット（クライアントの一覧と対応）
const FIXED_PRESETS: Record<string, number> = {
  家賃: 30000,
  借金返済: 20000,
  食費: 30000,
  自己理解プログラム: 36025,
  "ユースキャリア教育機構 会費": 11000,
  SMP: 14361,
  CapCut: 2180,
  iCloud: 1500,
  "Google One": 290,
  宮城島: 9800,
  "FIT PLACE": 4378,
  iPhone17: 22697,
  脱毛: 9000,
  Claude: 3400,
  奨学金: 15157,
  Revive: 52137,
  "Amazon Prime": 600,
}

const seedSchema = z.object({
  action: z.literal("seed_selected"),
  names: z.array(z.string()).min(1).max(50),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const month = req.nextUrl.searchParams.get("month")
  if (month) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 })
    }
    const items = await getMonthlyFixed(session.user.id, month)
    return NextResponse.json(items)
  }

  const items = await getFixedExpenses(session.user.id)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }
  const action = (body as { action?: string }).action

  // 選択されたプリセットだけ登録（既存の名前はスキップ）
  if (action === "seed_selected") {
    const parsed = seedSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const existing = await sql`
      SELECT name FROM fixed_expenses
      WHERE user_id = ${session.user.id} AND deleted_at IS NULL
    `
    const existingNames = new Set(existing.map((r) => r.name as string))
    let created = 0

    for (const name of parsed.data.names) {
      const amount = FIXED_PRESETS[name]
      if (amount === undefined || existingNames.has(name)) continue
      await sql`
        INSERT INTO fixed_expenses (user_id, name, amount)
        VALUES (${session.user.id}, ${name}, ${amount})
      `
      created++
    }
    return NextResponse.json({ created }, { status: 201 })
  }

  // Create fixed expense master
  if (action === "create_master") {
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
