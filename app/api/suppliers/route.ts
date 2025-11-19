import { NextResponse } from "next/server"
import { performance } from "perf_hooks"
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

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

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

const parseQueryParams = (request: Request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"))
  const requestedPageSize = Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedPageSize))
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? ""
  const ownerId = url.searchParams.get("ownerId")?.trim() ?? ""
  return { page, pageSize, search, ownerId }
}

export async function GET(request: Request) {
  const started = performance.now()
  try {
    const { page, pageSize, search, ownerId } = parseQueryParams(request)
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const admin = isAdmin(currentUser.role)
    const filters: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (!admin) {
      filters.push(`user_id = $${paramIndex++}::uuid`)
      params.push(currentUser.id)
    } else if (ownerId) {
      filters.push(`user_id = $${paramIndex++}::uuid`)
      params.push(ownerId)
    }

    if (search) {
      filters.push(
        `(LOWER(name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex} OR cnpj LIKE $${paramIndex})`,
      )
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
    const offset = (page - 1) * pageSize

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
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, pageSize, offset],
    )

    const { rows: countRows } = await runQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.suppliers ${whereClause}`,
      params,
    )

    const meta = {
      page,
      pageSize,
      total: Number(countRows[0]?.count ?? 0),
    }

    return NextResponse.json({ data: rows.map(mapSupplierFromDb), meta })
  } catch (error) {
    console.error("GET /api/suppliers failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao listar fornecedores." }, { status: 500 })
  } finally {
    const duration = Math.round(performance.now() - started)
    console.log(`[API] GET /api/suppliers completed in ${duration}ms`)
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
