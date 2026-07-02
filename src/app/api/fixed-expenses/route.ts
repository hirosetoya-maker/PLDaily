import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getFixedExpenses, getMonthlyFixed } from "@/lib/queries/fixed"
import { fixedExpenseSchema, monthlyFixedSchema } from "@/lib/validations/fixed"
import { NextRequest, NextResponse } from "next/server"

// よく使う固定費のプリセット（day: 毎月の引き落とし日、31 = 末日扱い）
const FIXED_PRESETS = [
  { name: "家賃", amount: 30000, day: 31 },
  { name: "借金返済", amount: 20000, day: 31 },
  { name: "食費", amount: 30000, day: 31 },
  { name: "自己理解プログラム", amount: 36025, day: 5 },
  { name: "ユースキャリア教育機構 会費", amount: 11000, day: 8 },
  { name: "SMP", amount: 14361, day: 9 },
  { name: "CapCut", amount: 2180, day: 11 },
  { name: "iCloud", amount: 1500, day: 13 },
  { name: "Google One", amount: 290, day: 15 },
  { name: "宮城島", amount: 9800, day: 16 },
  { name: "FIT PLACE", amount: 4378, day: 20 },
  { name: "iPhone17", amount: 22697, day: 21 },
  { name: "脱毛", amount: 9000, day: 24 },
  { name: "Claude", amount: 3400, day: 26 },
  { name: "奨学金", amount: 15157, day: 27 },
  { name: "Revive", amount: 52137, day: 27 },
  { name: "Amazon Prime", amount: 600, day: 30 },
]

// 月初日文字列("2026-07-01")と日にちから、その月の実在する日付を返す（末日クランプ）
function paymentDateFor(month: string, day: number): string {
  const [y, m] = month.split("-").map((v) => parseInt(v, 10))
  const daysInMonth = new Date(y, m, 0).getDate()
  const d = Math.min(day, daysInMonth)
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

// アクティブな固定費マスタのうち、指定月のエントリがないものを
// 直近の月のエントリから自動生成する（金額と日にちを引き継ぎ、末日はクランプ）
async function carryForwardMonthlyFixed(userId: string, month: string) {
  await sql`
    INSERT INTO monthly_fixed (fixed_expense_id, month, amount, payment_date)
    SELECT fe.id, ${month}::date, prev.amount,
      (${month}::date + (
        LEAST(
          EXTRACT(DAY FROM prev.payment_date)::int,
          EXTRACT(DAY FROM (${month}::date + interval '1 month' - interval '1 day'))::int
        ) - 1
      ) * interval '1 day')::date
    FROM fixed_expenses fe
    JOIN LATERAL (
      SELECT amount, payment_date FROM monthly_fixed
      WHERE fixed_expense_id = fe.id AND month < ${month}::date
      ORDER BY month DESC LIMIT 1
    ) prev ON true
    WHERE fe.user_id = ${userId}
      AND fe.is_active = true AND fe.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM monthly_fixed WHERE fixed_expense_id = fe.id AND month = ${month}::date
      )
    ON CONFLICT (fixed_expense_id, month) DO NOTHING
  `
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const month = req.nextUrl.searchParams.get("month")
  if (month) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 })
    }
    await carryForwardMonthlyFixed(session.user.id, month)
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

  // Seed preset fixed expenses (skips names that already exist)
  if (body.action === "seed_defaults") {
    const month = typeof body.month === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.month)
      ? body.month
      : null
    if (!month) return NextResponse.json({ error: "Invalid month" }, { status: 400 })

    const existing = await sql`
      SELECT name FROM fixed_expenses
      WHERE user_id = ${session.user.id} AND deleted_at IS NULL
    `
    const existingNames = new Set(existing.map((r) => r.name as string))
    let created = 0

    for (const preset of FIXED_PRESETS) {
      if (existingNames.has(preset.name)) continue
      const rows = await sql`
        INSERT INTO fixed_expenses (user_id, name, amount)
        VALUES (${session.user.id}, ${preset.name}, ${preset.amount})
        RETURNING id
      `
      await sql`
        INSERT INTO monthly_fixed (fixed_expense_id, month, amount, payment_date)
        VALUES (${rows[0].id}, ${month}::date, ${preset.amount}, ${paymentDateFor(month, preset.day)}::date)
        ON CONFLICT (fixed_expense_id, month) DO NOTHING
      `
      created++
    }
    return NextResponse.json({ created }, { status: 201 })
  }

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
