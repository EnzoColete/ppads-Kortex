import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

const ALLOWED_COLUMNS = ["name", "email", "phone", "address", "cpf_cnpj", "latitude", "longitude"] as const

type AllowedColumn = (typeof ALLOWED_COLUMNS)[number]

type ClientRow = Record<AllowedColumn, any> & Record<string, unknown>

type Params = { params: { id: string } }

const mapClientToDb = (client: any) => {
  if (!client) return client
  const { cpfCnpj, ...rest } = client
  return {
    ...rest,
    ...(cpfCnpj !== undefined ? { cpf_cnpj: cpfCnpj } : {}),
  }
}

const mapClientFromDb = (client: any) => {
  if (!client) return client
  const { cpf_cnpj, user_id, ...rest } = client
  return {
    ...rest,
    cpfCnpj: cpf_cnpj ?? null,
    userId: user_id ?? null,
  }
}

function pickAllowedColumns(dbClient: ClientRow) {
  return ALLOWED_COLUMNS.filter((column) => dbClient[column] !== undefined)
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
               cpf_cnpj,
               latitude,
               longitude,
               created_at,
               updated_at,
               user_id
          FROM public.clients
         WHERE id = $1::uuid
         LIMIT 1
      `,
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    return NextResponse.json({ data: mapClientFromDb(rows[0]) })
  } catch (error) {
    console.error("GET /api/clients/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao buscar cliente." }, { status: 500 })
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

    const { rows: existingRows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.clients WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && existingRows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const dbUpdates = mapClientToDb(payload as ClientRow)
    const columns = pickAllowedColumns(dbUpdates)

    if (columns.length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido para atualizar." }, { status: 400 })
    }

    if (dbUpdates.email) {
      const { rows: emailRows } = await runQuery(
        "SELECT id FROM public.clients WHERE lower(email) = lower($1) AND id <> $2::uuid AND user_id = $3::uuid LIMIT 1",
        [dbUpdates.email, params.id, currentUser.id],
      )

      if (emailRows.length > 0) {
        return NextResponse.json({ error: "Ja existe um cliente com este email." }, { status: 409 })
      }
    }

    if (dbUpdates.cpf_cnpj) {
      const { rows: cpfRows } = await runQuery(
        "SELECT id FROM public.clients WHERE cpf_cnpj = $1 AND id <> $2::uuid AND user_id = $3::uuid LIMIT 1",
        [dbUpdates.cpf_cnpj, params.id, currentUser.id],
      )

      if (cpfRows.length > 0) {
        return NextResponse.json({ error: "Ja existe um cliente com este CPF/CNPJ." }, { status: 409 })
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
        UPDATE public.clients
           SET ${setFragments.join(", ")},
               updated_at = now()
         WHERE id = $${values.length}::uuid
      RETURNING *
      `,
      values,
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: mapClientFromDb(rows[0]) })
  } catch (error) {
    console.error("PATCH /api/clients/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao atualizar cliente." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.clients WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const { rowCount } = await runQuery(
      "DELETE FROM public.clients WHERE id = $1::uuid",
      [params.id],
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/clients/[id] failed:", error)
    const message = error instanceof Error ? error.message : "Erro inesperado ao excluir cliente."
    const normalized = message.toLowerCase()

    if (normalized.includes("violates foreign key constraint") || normalized.includes("constraint")) {
      return NextResponse.json(
        { error: "Nao e possivel excluir o cliente pois existem registros vinculados (recibos, ordens, etc.)." },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: "Erro inesperado ao excluir cliente." }, { status: 500 })
  }
}
