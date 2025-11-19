import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

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

function isAdmin(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN"
}

function unauthorized() {
  return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
}

function mapReceiptProduct(row: any) {
  return {
    id: row.id,
    productId: row.product_id,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    total: Number(row.total ?? 0),
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

async function fetchReceiptProducts(receiptId: string) {
  const { rows } = await runQuery(
    `
      SELECT id,
             product_id,
             quantity,
             unit_price,
             total
        FROM public.receipt_products
       WHERE receipt_id = $1::uuid
    `,
    [receiptId],
  )
  return rows
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }
    const admin = isAdmin(currentUser.role)

    const { rows } = await runQuery(
      `${RECEIPT_SELECT}
         WHERE id = $1::uuid
         LIMIT 1
      `,
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Recibo nao encontrado." }, { status: 404 })
    }

    if (!admin && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const products = await fetchReceiptProducts(params.id)
    return NextResponse.json({ data: mapReceipt(rows[0], products) })
  } catch (error) {
    console.error("GET /api/receipts/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao buscar recibo." }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return unauthorized()
    }

    const { rows } = await runQuery<{ user_id: string }>(
      "SELECT user_id FROM public.receipts WHERE id = $1::uuid LIMIT 1",
      [params.id],
    )

    if (rows.length === 0) {
      return NextResponse.json({ error: "Recibo nao encontrado." }, { status: 404 })
    }

    if (!isAdmin(currentUser.role) && rows[0].user_id !== currentUser.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
    }

    const { rowCount } = await runQuery(
      "DELETE FROM public.receipts WHERE id = $1::uuid",
      [params.id],
    )

    if (rowCount === 0) {
      return NextResponse.json({ error: "Recibo nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/receipts/[id] failed:", error)
    return NextResponse.json({ error: "Erro inesperado ao excluir recibo." }, { status: 500 })
  }
}
