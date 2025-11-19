import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

const SUPPLIER_COLUMNS = ["name", "email", "phone", "address", "cnpj"] as const

type SupplierColumn = (typeof SUPPLIER_COLUMNS)[number]
type SupplierRow = Record<SupplierColumn, any> & Record<string, unknown>

type Params = { params: { id: string } }

const mapSupplierFromDb = (supplier: any) => {
  if (!supplier) return supplier
  const { user_id } = supplier
  return {
    id: supplier.id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    cnpj: supplier.cnpj,
    createdAt: supplier.created_at,
    updatedAt: supplier.updated_at,
    userId: user_id ?? null,
  }
}

function pickAllowedColumns(dbSupplier: SupplierRow) {
  return SUPPLIER_COLUMNS.filter((column) => dbSupplier[column] !== undefined)
}

function isAdmin(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

function unauthorized() {
  return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
}

export async function GET(_: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery(
      `
        SELECT id,
               name,
               email,
               phone,
               address,
               cnpj,
               created_at,
               updated_at,
               user_id
          FROM public.suppliers
         WHERE id = $1::uuid
         LIMIT 1
      `,
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    return NextResponse.json({ data: mapSupplierFromDb(rows[0]) })
  } catch (error) {
    console.error("GET /api/suppliers/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao buscar fornecedor." }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const payload = await request.json()

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
    }

    const { rows: ownerRows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.suppliers WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (ownerRows.length === 0) {
      return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && ownerRows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const dbUpdates = payload as SupplierRow
    const columns = pickAllowedColumns(dbUpdates)

    if (columns.length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido para atualizar." }, { status: 400 })
    }

    if (dbUpdates.email) {
      const { rows: emailRows } = await runQuery(
        "SELECT id FROM public.suppliers WHERE lower(email) = lower($1) AND id <> $2::uuid AND user_id = $3::uuid LIMIT 1",
        [dbUpdates.email, params.id, currentUser.id],
      )

      if (emailRows.length > 0) {
        return NextResponse.json({ error: "Ja existe um fornecedor com este email." }, { status: 409 })
      }
    }

    if (dbUpdates.cnpj) {
      const { rows: cnpjRows } = await runQuery(
        "SELECT id FROM public.suppliers WHERE cnpj = $1 AND id <> $2::uuid AND user_id = $3::uuid LIMIT 1",
        [dbUpdates.cnpj, params.id, currentUser.id],
      )

      if (cnpjRows.length > 0) {
        return NextResponse.json({ error: "Ja existe um fornecedor com este CNPJ." }, { status: 409 })
      }
    }

    const setFragments: string[] = []
    const values: any[] = []

    columns.forEach((column, index) => {
      setFragments.push(`${column} = $${index + 1}`)
      values.push(dbUpdates[column])
    })

    values.push(params.id)

    const { rows } = await runQuery(
      `
        UPDATE public.suppliers
           SET ${setFragments.join(", ")},
               updated_at = now()
         WHERE id = $${values.length}::uuid
      RETURNING *
      `,
      values,
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: mapSupplierFromDb(rows[0]) })
  } catch (error) {
    console.error("PATCH /api/suppliers/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao atualizar fornecedor." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.suppliers WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const { rowCount } = await runQuery(
      "DELETE FROM public.suppliers WHERE id = $1::uuid",
      [params.id],
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/suppliers/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao excluir fornecedor." }, { status: 500 })
  }
}
