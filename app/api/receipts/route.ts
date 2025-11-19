import { NextResponse } from "next/server"
import { performance } from "perf_hooks"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

type ReceiptProductPayload = {
  productId: string
  quantity: number
  unitPrice: number
  total: number
}

const RECEIPT_SELECT = `
  SELECT id,
         type,
         supplier_id,
         client_id,
         entity_name,
         description,
         date,
         total,
         has_invoice,
         observations,
         created_at,
         updated_at,
         user_id
    FROM public.receipts
`

const DEFAULT_PAGE_SIZE = 15
const MAX_PAGE_SIZE = 100

function isAdmin(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

function unauthorized(message = "Nao autenticado.") {
  return NextResponse.json({ error: message }, { status: 401 })
}

function mapReceiptProduct(product: any) {
  return {
    id: product.id,
    productId: product.product_id,
    quantity: Number(product.quantity ?? 0),
    unitPrice: Number(product.unit_price ?? 0),
    total: Number(product.total ?? 0),
  }
}

function mapReceipt(row: any, products: any[]) {
  return {
    id: row.id,
    type: row.type,
    supplierId: row.supplier_id ?? undefined,
    clientId: row.client_id ?? undefined,
    entityName: row.entity_name ?? undefined,
    description: row.description ?? undefined,
    date: row.date,
    total: Number(row.total ?? 0),
    hasInvoice: Boolean(row.has_invoice),
    observations: row.observations ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id ?? null,
    products: products.map(mapReceiptProduct),
  }
}

async function fetchReceiptProducts(receiptIds: string[]) {
  if (receiptIds.length === 0) {
    return new Map<string, any[]>()
  }

  const { rows } = await runQuery(
    `
      SELECT id,
             receipt_id,
             product_id,
             quantity,
             unit_price,
             total
        FROM public.receipt_products
       WHERE receipt_id = ANY($1::uuid[])
    `,
    [receiptIds],
  )

  const map = new Map<string, any[]>()
  for (const row of rows) {
    if (!map.has(row.receipt_id)) {
      map.set(row.receipt_id, [])
    }
    map.get(row.receipt_id)!.push(row)
  }
  return map
}

function normalizeProducts(products: unknown): ReceiptProductPayload[] {
  if (!Array.isArray(products)) return []
  return products
    .map((product) => ({
      productId: typeof product?.productId === "string" ? product.productId : "",
      quantity: Number(product?.quantity ?? 0),
      unitPrice: Number(product?.unitPrice ?? 0),
      total: Number(product?.total ?? 0),
    }))
    .filter((product) => product.productId && product.quantity > 0)
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
        `(LOWER(entity_name) LIKE $${paramIndex} OR LOWER(id::text) LIKE $${paramIndex} OR LOWER(type) LIKE $${paramIndex})`,
      )
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
    const offset = (page - 1) * pageSize

    const { rows } = await runQuery(
      `${RECEIPT_SELECT}
        ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...params, pageSize, offset],
    )

    const receiptIds = rows.map((row) => row.id)
    const productsByReceipt = await fetchReceiptProducts(receiptIds)

    const mapped = rows.map((row) => mapReceipt(row, productsByReceipt.get(row.id) ?? []))

    const { rows: countRows } = await runQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.receipts ${whereClause}`,
      params,
    )

    const meta = {
      page,
      pageSize,
      total: Number(countRows[0]?.count ?? 0),
    }

    return NextResponse.json({ data: mapped, meta })
  } catch (error) {
    console.error("GET /api/receipts failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao listar recibos." }, { status: 500 })
  } finally {
    const duration = Math.round(performance.now() - started)
    console.log(`[API] GET /api/receipts completed in ${duration}ms`)
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

    const type = payload.type
    if (type !== "supplier" && type !== "client") {
      return NextResponse.json({ error: "Tipo de recibo invalido." }, { status: 400 })
    }

    if (type === "supplier" && !payload.supplierId) {
      return NextResponse.json({ error: "Fornecedor obrigatorio." }, { status: 400 })
    }

    if (type === "client" && !payload.clientId) {
      return NextResponse.json({ error: "Cliente obrigatorio." }, { status: 400 })
    }

    const products = normalizeProducts(payload.products)
    if (products.length === 0) {
      return NextResponse.json({ error: "Adicione ao menos um produto." }, { status: 400 })
    }

    const admin = isAdmin(currentUser.role)

    if (type === "supplier") {
      const { rows } = await runQuery<{ user_id: string }>(
        "SELECT user_id FROM public.suppliers WHERE id = $1::uuid LIMIT 1",
        [payload.supplierId],
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: "Fornecedor nao encontrado." }, { status: 404 })
      }
      if (!admin && rows[0].user_id !== currentUser.id) {
        return NextResponse.json({ error: "Fornecedor nao pertence ao usuario atual." }, { status: 403 })
      }
    }

    if (type === "client") {
      const { rows } = await runQuery<{ user_id: string }>(
        "SELECT user_id FROM public.clients WHERE id = $1::uuid LIMIT 1",
        [payload.clientId],
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: "Cliente nao encontrado." }, { status: 404 })
      }
      if (!admin && rows[0].user_id !== currentUser.id) {
        return NextResponse.json({ error: "Cliente nao pertence ao usuario atual." }, { status: 403 })
      }
    }

    const productIds = [...new Set(products.map((product) => product.productId))]
    if (productIds.length > 0) {
      const { rows } = await runQuery<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM public.products WHERE id = ANY($1::uuid[])",
        [productIds],
      )

      const foundIds = new Set(rows.map((row) => row.id))
      const missing = productIds.filter((id) => !foundIds.has(id))
      if (missing.length > 0) {
        return NextResponse.json({ error: `Produto nao encontrado: ${missing.join(", ")}` }, { status: 404 })
      }

      if (!admin) {
        const unauthorizedProduct = rows.find((row) => row.user_id !== currentUser.id)
        if (unauthorizedProduct) {
          return NextResponse.json({ error: "Produto nao pertence ao usuario atual." }, { status: 403 })
        }
      }
    }

    const total = products.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0)
    const receiptDate =
      payload.date && `${payload.date}`.trim().length > 0 ? payload.date : new Date().toISOString().split("T")[0]

    const insertReceipt = await runQuery(
      `
        INSERT INTO public.receipts (
          user_id,
          type,
          supplier_id,
          client_id,
          entity_name,
          description,
          date,
          total,
          has_invoice,
          observations
        )
        VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5, $6, $7::date, $8, $9, $10)
        RETURNING *
      `,
      [
        currentUser.id,
        type,
        type === "supplier" ? payload.supplierId : null,
        type === "client" ? payload.clientId : null,
        payload.entityName ?? null,
        payload.description ?? null,
        receiptDate,
        total,
        type === "client" ? Boolean(payload.hasInvoice) : false,
        payload.observations ?? null,
      ],
    )

    const receipt = insertReceipt.rows[0]

    const valueFragments: string[] = []
    const params: any[] = [receipt.id]

    products.forEach((product, index) => {
      const base = index * 4
      valueFragments.push(`($1::uuid, $${base + 2}::uuid, $${base + 3}, $${base + 4}, $${base + 5})`)
      params.push(
        product.productId,
        product.quantity,
        product.unitPrice,
        product.total || product.quantity * product.unitPrice,
      )
    })

    if (valueFragments.length > 0) {
      await runQuery(
        `
          INSERT INTO public.receipt_products (
            receipt_id,
            product_id,
            quantity,
            unit_price,
            total
          )
          VALUES ${valueFragments.join(", ")}
        `,
        params,
      )
    }

    return NextResponse.json({ data: mapReceipt(receipt, products) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/receipts failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao criar recibo." }, { status: 500 })
  }
}
