import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUserBySessionToken } from "@/lib/server/auth/session"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const session = await getUserBySessionToken(token)
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({ user: session.user }, { status: 200 })
  } catch (error) {
    console.error("Failed to fetch auth user:", error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
