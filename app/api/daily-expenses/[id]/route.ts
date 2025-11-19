import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

function unauthorized() {
  return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
}

function isAdmin(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery(
      `
        SELECT id,
               date,
               category,
               amount,
               observations,
               supplier_id,
               supplier_name,
               created_at,
               updated_at,
               user_id
          FROM public.daily_expenses
         WHERE id = $1::uuid
         LIMIT 1
      `,
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Despesa nao encontrada." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const row = rows[0]
    return NextResponse.json({
      data: {
        id: row.id,
        date: row.date,
        category: row.category,
        amount: Number(row.amount ?? 0),
        observations: row.observations ?? undefined,
        supplierId: row.supplier_id ?? undefined,
        supplierName: row.supplier_name ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userId: row.user_id ?? null,
      },
    })
  } catch (error) {
    console.error("GET /api/daily-expenses/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao buscar despesa." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.daily_expenses WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Despesa nao encontrada." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const { rowCount } = await runQuery(
      "DELETE FROM public.daily_expenses WHERE id = $1::uuid",
      [params.id],
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: "Despesa nao encontrada." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/daily-expenses/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao excluir despesa." }, { status: 500 })
  }
}
