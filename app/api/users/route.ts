import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteUserByEmail, listUsers, updateUserByEmail } from "@/lib/server/users-repository"

type MaybeResponse = NextResponse | null

function ensureAdmin(user: Awaited<ReturnType<typeof getCurrentUser>>): MaybeResponse {
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }
  return null
}

export async function GET() {
  const currentUser = await getCurrentUser()
  const forbidden = ensureAdmin(currentUser)
  if (forbidden) return forbidden

  const users = await listUsers()
  return NextResponse.json({ data: users })
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser()
  const forbidden = ensureAdmin(currentUser)
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const { email, updates } = body ?? {}

    if (!email || typeof email !== "string" || !updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
    }

    const updated = await updateUserByEmail(email, {
      fullName: updates.fullName,
      role: updates.role,
    })

    if (!updated) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json({ error: "Erro ao atualizar usuario." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser()
  const forbidden = ensureAdmin(currentUser)
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const { email } = body ?? {}

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Informe o email do usuario." }, { status: 400 })
    }

    const deleted = await deleteUserByEmail(email)
    if (!deleted) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete user:", error)
    return NextResponse.json({ error: "Erro ao excluir usuario." }, { status: 500 })
  }
}
