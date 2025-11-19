import { NextResponse } from "next/server"
import { z } from "zod"
import { createUser, findUserByEmail } from "@/lib/server/users-repository"

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Informe seu nome completo")
      .refine((value) => value.trim().split(/\s+/).length >= 2, {
        message: "Informe ao menos nome e sobrenome",
      }),
    email: z.string().email("Informe um e-mail valido"),
    password: z
      .string()
      .min(8, "A senha deve ter no minimo 8 caracteres")
      .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
        message: "Use ao menos uma letra e um numero",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  })

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const flatten = parsed.error.flatten()
      return NextResponse.json(
        {
          message: "Preencha todos os campos com informacoes validas.",
          errors: flatten.fieldErrors,
        },
        { status: 400 },
      )
    }

    const { fullName, email, password } = parsed.data
    const sanitizedEmail = email.trim().toLowerCase()
    const trimmedName = fullName.trim()

    const existing = await findUserByEmail(sanitizedEmail)
    if (existing) {
      return NextResponse.json(
        { message: "Este e-mail ja esta cadastrado. Use outro e-mail ou faca login." },
        { status: 409 },
      )
    }

    await createUser({
      email: sanitizedEmail,
      fullName: trimmedName,
      password,
      role: "USER",
      emailVerified: false,
    })

    return NextResponse.json(
      { message: `Cadastro realizado! Agora voce pode fazer login com ${sanitizedEmail}.` },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration failed:", error)
    return NextResponse.json({ message: "Erro inesperado ao realizar cadastro." }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ message: "Metodo nao permitido" }, { status: 405 })
}
