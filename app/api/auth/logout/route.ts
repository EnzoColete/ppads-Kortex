import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { deleteSessionByToken } from "@/lib/server/auth/session"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (token) {
      await deleteSessionByToken(token)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    })

    return response
  } catch (error) {
    console.error("Logout failed:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ message: "Metodo nao permitido" }, { status: 405 })
}
