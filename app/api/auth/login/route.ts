import { NextResponse } from "next/server"
import { z } from "zod"
import { createSession } from "@/lib/server/auth/session"
import {
  findUserByEmail,
  updatePasswordHashById,
  verifyPassword,
} from "@/lib/server/users-repository"

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail valido"),
  password: z.string().min(1, "Informe a senha"),
})

function normalizeEnvString(value: string | undefined) {
  if (!value) return undefined
  return value.replace(/^['"]|['"]$/g, "").trim()
}

function resolveDefaultPassword(email: string) {
  const candidates = [
    [normalizeEnvString(process.env.DEFAULT_ADMIN_EMAIL), normalizeEnvString(process.env.DEFAULT_ADMIN_PASSWORD)],
    [normalizeEnvString(process.env.DEFAULT_CLIENT_EMAIL), normalizeEnvString(process.env.DEFAULT_CLIENT_PASSWORD)],
  ] as const

  for (const [candidateEmail, candidatePassword] of candidates) {
    if (!candidateEmail || !candidatePassword) continue

    if (candidateEmail.toLowerCase() === email.toLowerCase()) {
      return candidatePassword
    }
  }

  return undefined
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ message: "Informe e-mail e senha validos." }, { status: 400 })
    }

    const sanitizedEmail = parsed.data.email.trim().toLowerCase()
    let user = await findUserByEmail(sanitizedEmail)

    if (!user) {
      return NextResponse.json({ message: "Credenciais invalidas." }, { status: 401 })
    }

    if (!user.password_hash) {
      const defaultPassword = resolveDefaultPassword(sanitizedEmail)

      if (defaultPassword && parsed.data.password === defaultPassword) {
        const passwordHash = await updatePasswordHashById(user.id, defaultPassword)
        user = { ...user, password_hash: passwordHash }
      }
    }

    const isValidPassword = await verifyPassword(user, parsed.data.password)
    if (!isValidPassword) {
      return NextResponse.json({ message: "Credenciais invalidas." }, { status: 401 })
    }

    const session = await createSession(user.id)

    const response = NextResponse.json({ message: "Login realizado com sucesso." })
    response.cookies.set("auth_token", session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    })

    return response
  } catch (error) {
    console.error("Login failed:", error)
    return NextResponse.json({ message: "Erro inesperado ao realizar login." }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ message: "Metodo nao permitido" }, { status: 405 })
}
