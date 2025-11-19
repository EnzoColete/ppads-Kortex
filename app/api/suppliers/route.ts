import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

const SUPPLIER_COLUMNS = ["name", "email", "phone", "address", "cnpj"] as const

type SupplierColumn = (typeof SUPPLIER_COLUMNS)[number]
type SupplierRow = Record<SupplierColumn, any> & Record<string, unknown>

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

function buildInsertPayload(dbSupplier: SupplierRow) {
  const columns = SUPPLIER_COLUMNS.filter((column) => dbSupplier[column] !== undefined)
  const values = columns.map((column) => dbSupplier[column])
  return { columns, values }
}

function isAdmin(role?: string | null) {
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
               cnpj,
               created_at,
               updated_at,
               user_id
          FROM public.suppliers
          ${whereClause}
         ORDER BY created_at DESC
      `,
      params,
    )

    return NextResponse.json({ data: rows.map(mapSupplierFromDb) })
  } catch (error) {
    console.error("GET /api/suppliers failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao listar fornecedores." }, { status: 500 })
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
      return NextResponse.json({ error: "Payload invalido." }, { status: 400 })
    }

    const missingField = SUPPLIER_COLUMNS.find((field) => {
      const value = payload[field]
      return value === undefined || value === null || `${value}`.trim().length === 0
    })

    if (missingField) {
      return NextResponse.json({ error: `Campo '${missingField}' obrigatorio.` }, { status: 400 })
    }

    const { rows: existingEmail } = await runQuery(
      "SELECT id FROM public.suppliers WHERE lower(email) = lower($1) AND user_id = $2::uuid LIMIT 1",
      [payload.email, currentUser.id],
    )

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Ja existe um fornecedor com este email." }, { status: 409 })
    }

    const { rows: existingCnpj } = await runQuery(
      "SELECT id FROM public.suppliers WHERE cnpj = $1 AND user_id = $2::uuid LIMIT 1",
      [payload.cnpj, currentUser.id],
    )

    if (existingCnpj.length > 0) {
      return NextResponse.json({ error: "Ja existe um fornecedor com este CNPJ." }, { status: 409 })
    }

    const dbSupplier = payload as SupplierRow
    const { columns, values } = buildInsertPayload(dbSupplier)

    const placeholders = columns.map((_, index) => `$${index + 2}`)

    const insertQuery = `
      INSERT INTO public.suppliers (user_id, ${columns.join(", ")})
      VALUES ($1::uuid, ${placeholders.join(", ")})
      RETURNING *
    `

    const result = await runQuery(insertQuery, [currentUser.id, ...values])
    const data = result.rows[0]

    return NextResponse.json({ data: mapSupplierFromDb(data) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/suppliers failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao criar fornecedor." }, { status: 500 })
  }
}
