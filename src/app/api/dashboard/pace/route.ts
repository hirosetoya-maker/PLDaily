import { auth } from "@/lib/auth"
import { getDailyPace } from "@/lib/pace"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pace = await getDailyPace(session.user.id)
  return NextResponse.json(pace)
}
