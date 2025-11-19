import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

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

const ALLOWED_COLUMNS = ["name", "email", "phone", "address", "cpf_cnpj", "latitude", "longitude"] as const

type AllowedColumn = (typeof ALLOWED_COLUMNS)[number]

type ClientRow = Record<AllowedColumn, any> & Record<string, unknown>

function buildInsertPayload(dbClient: ClientRow) {
  const columns = ALLOWED_COLUMNS.filter((column) => dbClient[column] !== undefined)
  const values = columns.map((column) => dbClient[column])
  return { columns, values }
}

function isAdmin(role: string | undefined | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

function unauthorized() {
  return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const admin = isAdmin(currentUser.role)
    const params: any[] = []
    let whereClause = ""

    if (!admin) {
      whereClause = "WHERE user_id = $1::uuid"
      params.push(currentUser.id)
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
          ${whereClause}
         ORDER BY created_at DESC
      `,
      params,
    )

    return NextResponse.json({
      data: rows.map(mapClientFromDb),
    })
  } catch (error) {
    console.error("GET /api/clients failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao listar clientes." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const payload = await request.json()

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid client payload." }, { status: 400 })
    }

    const dbClient = mapClientToDb(payload)

    if (!dbClient.email) {
      return NextResponse.json({ error: "Email e obrigatorio para o cliente." }, { status: 400 })
    }

    const existingEmail = await runQuery<{ id: string; name: string }>(
      "SELECT id, name FROM public.clients WHERE lower(email) = lower($1) AND user_id = $2::uuid LIMIT 1",
      [dbClient.email, currentUser.id],
    )

    if (existingEmail.rows.length > 0) {
      return NextResponse.json(
        { error: "Ja existe um cliente cadastrado com este email: " + existingEmail.rows[0].name },
        { status: 409 },
      )
    }

    if (dbClient.cpf_cnpj) {
      const existingCpf = await runQuery<{ id: string; name: string }>(
        "SELECT id, name FROM public.clients WHERE cpf_cnpj = $1 AND user_id = $2::uuid LIMIT 1",
        [dbClient.cpf_cnpj, currentUser.id],
      )

      if (existingCpf.rows.length > 0) {
        return NextResponse.json(
          { error: "Ja existe um cliente cadastrado com este CPF/CNPJ: " + existingCpf.rows[0].name },
          { status: 409 },
        )
      }
    }

    const { columns, values } = buildInsertPayload(dbClient)

    if (columns.length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido informado." }, { status: 400 })
    }

    const placeholders = columns.map((_, index) => `$${index + 2}`)

    const insertQuery = `
      INSERT INTO public.clients (user_id, ${columns.join(", ")})
      VALUES ($1::uuid, ${placeholders.join(", ")})
      RETURNING *
    `

    const result = await runQuery(insertQuery, [currentUser.id, ...values])
    const data = result.rows[0]

    return NextResponse.json({ data: mapClientFromDb(data) })
  } catch (error) {
    console.error("POST /api/clients failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao criar cliente." }, { status: 500 })
  }
}
