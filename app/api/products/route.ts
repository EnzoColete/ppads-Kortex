import { NextResponse } from "next/server"
import { runQuery } from "@/lib/server/db"

const ALLOWED_COLUMNS = ["name", "description", "price", "unit", "type"] as const

type AllowedColumn = (typeof ALLOWED_COLUMNS)[number]

type ProductRow = Record<AllowedColumn, any> & Record<string, unknown>

const REQUIRED_FIELDS: AllowedColumn[] = ["name", "unit", "price"]

const trimValue = (value: unknown) => (typeof value === "string" ? value.trim() : value)

const mapProductToDb = (product: unknown) => {
  if (!product || typeof product !== "object") {
    return {}
  }

  const source = product as Record<string, unknown>
  const rawPrice = source.price
  const normalizedPrice =
    typeof rawPrice === "string"
      ? rawPrice.replace(",", ".")
      : rawPrice

  const mapped: Record<AllowedColumn, unknown> = {
    name: trimValue(source.name) ?? "",
    description: trimValue(source.description) ?? "",
    price: normalizedPrice,
    unit: trimValue(source.unit) ?? "",
    type: source.type !== undefined && source.type !== null && `${source.type}`.trim().length > 0
      ? trimValue(source.type)
      : "other",
  }

  if (mapped.price !== undefined && mapped.price !== null) {
    const numericPrice = Number(mapped.price)
    if (Number.isNaN(numericPrice)) {
      throw new Error("Preco invalido.")
    }
    mapped.price = numericPrice
  }

  return mapped as ProductRow
}

const mapProductFromDb = (product: any) => {
  if (!product) return product
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price === null || product.price === undefined ? 0 : Number(product.price),
    unit: product.unit ?? "",
    type: product.type ?? null,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  }
}

function buildInsertPayload(dbProduct: ProductRow) {
  const columns = ALLOWED_COLUMNS.filter((column) => dbProduct[column] !== undefined)
  const values = columns.map((column) => dbProduct[column])
  return { columns, values }
}

export async function GET() {
  try {
    const { rows } = await runQuery(
      `
        SELECT id,
               name,
               description,
               price,
               unit,
               type,
               created_at,
               updated_at
          FROM public.products
         ORDER BY created_at DESC
      `,
    )

    return NextResponse.json({
      data: rows.map(mapProductFromDb),
    })
  } catch (error) {
    console.error("GET /api/products failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao listar produtos." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Payload invalido para produto." }, { status: 400 })
    }

    let dbProduct: ProductRow
    try {
      dbProduct = mapProductToDb(payload)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Produto invalido." }, { status: 400 })
    }

    for (const field of REQUIRED_FIELDS) {
      if (dbProduct[field] === undefined || dbProduct[field] === null || dbProduct[field] === "") {
        return NextResponse.json({ error: `Campo '${field}' obrigatorio.` }, { status: 400 })
      }
    }

    const { columns, values } = buildInsertPayload(dbProduct)

    if (columns.length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido informado." }, { status: 400 })
    }

    const placeholders = columns.map((_, index) => `$${index + 1}`)

    const insertQuery = `
      INSERT INTO public.products (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `

    const result = await runQuery(insertQuery, values)
    const data = result.rows[0]

    return NextResponse.json({ data: mapProductFromDb(data) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/products failed:", error)
    const message = error instanceof Error ? error.message : "Erro inesperado ao criar produto."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
