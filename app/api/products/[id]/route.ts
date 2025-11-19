import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

const ALLOWED_COLUMNS = ["name", "description", "price", "unit", "type"] as const

type AllowedColumn = (typeof ALLOWED_COLUMNS)[number]
type ProductRow = Record<AllowedColumn, any> & Record<string, unknown>
type Params = { params: { id: string } }

const trimValue = (value: unknown) => (typeof value === "string" ? value.trim() : value)

const mapProductToDb = (product: unknown) => {
  if (!product || typeof product !== "object") return {}
  const source = product as Record<string, unknown>
  const rawPrice = source.price
  const normalizedPrice = typeof rawPrice === "string" ? rawPrice.replace(",", ".") : rawPrice

  const mapped: Record<AllowedColumn, unknown> = {
    name: source.name !== undefined ? trimValue(source.name) : undefined,
    description: source.description !== undefined ? trimValue(source.description) : undefined,
    price: normalizedPrice,
    unit: source.unit !== undefined ? trimValue(source.unit) : undefined,
    type:
      source.type !== undefined && source.type !== null && `${source.type}`.trim().length > 0
        ? trimValue(source.type)
        : source.type === null
        ? "other"
        : undefined,
  }

  if (mapped.price !== undefined) {
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
    userId: product.user_id ?? null,
  }
}

function pickAllowedColumns(dbProduct: ProductRow) {
  return ALLOWED_COLUMNS.filter((column) => dbProduct[column] !== undefined)
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
               description,
               price,
               unit,
               type,
               created_at,
               updated_at,
               user_id
          FROM public.products
         WHERE id = $1::uuid
         LIMIT 1
      `,
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    return NextResponse.json({ data: mapProductFromDb(rows[0]) })
  } catch (error) {
    console.error("GET /api/products/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao buscar produto." }, { status: 500 })
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
      "SELECT user_id FROM public.products WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && existingRows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    let dbUpdates: ProductRow
    try {
      dbUpdates = mapProductToDb(payload)
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Produto invalido." }, { status: 400 })
    }

    const columns = pickAllowedColumns(dbUpdates)

    if (columns.length === 0) {
      return NextResponse.json({ error: "Nenhum campo valido para atualizar." }, { status: 400 })
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
        UPDATE public.products
           SET ${setFragments.join(", ")},
               updated_at = now()
         WHERE id = $${values.length}::uuid
      RETURNING *
      `,
      values,
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data: mapProductFromDb(rows[0]) })
  } catch (error) {
    console.error("PATCH /api/products/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao atualizar produto." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.products WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const { rowCount } = await runQuery(
      "DELETE FROM public.products WHERE id = $1::uuid",
      [params.id],
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/products/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao excluir produto." }, { status: 500 })
  }
}
