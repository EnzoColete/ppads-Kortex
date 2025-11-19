import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { runQuery } from "@/lib/server/db"

type ResourceKey =
  | "suppliers"
  | "clients"
  | "products"
  | "receipts"
  | "receipt_products"
  | "alerts"
  | "daily_expenses"
  | "reports"
  | "calendar_events"

type TableConfig = {
  table: string
  defaultOrder?: { column: string; ascending: boolean }
}

const RESOURCE_CONFIG: Record<ResourceKey, TableConfig> = {
  suppliers: { table: "suppliers", defaultOrder: { column: "created_at", ascending: false } },
  clients: { table: "clients", defaultOrder: { column: "created_at", ascending: false } },
  products: { table: "products", defaultOrder: { column: "created_at", ascending: false } },
  receipts: { table: "receipts", defaultOrder: { column: "created_at", ascending: false } },
  receipt_products: { table: "receipt_products" },
  alerts: { table: "alerts", defaultOrder: { column: "created_at", ascending: false } },
  daily_expenses: { table: "daily_expenses", defaultOrder: { column: "date", ascending: false } },
  reports: { table: "reports", defaultOrder: { column: "created_at", ascending: false } },
  calendar_events: { table: "calendar_events", defaultOrder: { column: "date", ascending: false } },
}

const COLUMN_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser()
  if (!user || (user.role ?? "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 })
  }
  return null
}

function sanitizeColumn(column: string): string {
  if (!COLUMN_REGEX.test(column)) {
    throw new Error(`Coluna invalida: ${column}`)
  }
  return column
}

function notFoundResponse(resource: string) {
  return NextResponse.json({ error: `Resource '${resource}' not found.` }, { status: 404 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

function normalizeValue<T>(value: T): T | null {
  return value === undefined ? null : value
}

function sanitizeRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Payload deve ser um objeto com chaves/valores")
  }

  const record: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const column = sanitizeColumn(key)
    record[column] = normalizeValue(value)
  }
  return record
}

function parseRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map(sanitizeRecord)
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Payload invalido.")
  }

  const typedPayload = payload as Record<string, unknown>

  if (Array.isArray(typedPayload.records)) {
    return typedPayload.records.map(sanitizeRecord)
  }

  if (typedPayload.record && typeof typedPayload.record === "object") {
    return [sanitizeRecord(typedPayload.record)]
  }

  return [sanitizeRecord(payload)]
}

function buildInsertStatement(table: string, records: Record<string, unknown>[]) {
  const columnSet = new Set<string>()
  for (const record of records) {
    for (const key of Object.keys(record)) {
      columnSet.add(sanitizeColumn(key))
    }
  }

  const columns = Array.from(columnSet)
  if (columns.length === 0) {
    throw new Error("Nenhum campo valido fornecido para insercao")
  }

  const values: unknown[] = []
  const valueFragments = records.map((record) => {
    const placeholders = columns.map((column) => {
      values.push(Object.prototype.hasOwnProperty.call(record, column) ? record[column] : null)
      return `$${values.length}`
    })
    return `(${placeholders.join(", ")})`
  })

  const query = `
    INSERT INTO public.${table} (${columns.join(", ")})
    VALUES ${valueFragments.join(", ")}
    RETURNING *
  `

  return { query, values }
}

export async function GET(request: NextRequest, { params }: { params: { resource: string } }) {
  const forbidden = await requireAdmin()
  if (forbidden) return forbidden

  try {
    const resource = params.resource as ResourceKey
    const config = RESOURCE_CONFIG[resource]

    if (!config) {
      return notFoundResponse(params.resource)
    }

    const url = new URL(request.url)
    const searchParams = url.searchParams
    const includeProducts = searchParams.get("includeProducts") === "true"
    const idFilter = searchParams.has("id")

    const conditions: string[] = []
    const values: unknown[] = []

    for (const [key, value] of searchParams.entries()) {
      if (key === "includeProducts") continue
      const column = sanitizeColumn(key)
      conditions.push(`${column} = $${values.length + 1}`)
      values.push(value)
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""

    let orderClause = ""
    if (config.defaultOrder && !idFilter) {
      const orderColumn = sanitizeColumn(config.defaultOrder.column)
      orderClause = ` ORDER BY ${orderColumn} ${config.defaultOrder.ascending ? "ASC" : "DESC"}`
    }

    const query = `SELECT * FROM public.${config.table}${whereClause}${orderClause}`
    const { rows } = await runQuery<Record<string, unknown>>(query, values)

    let dataRows = rows

    if (resource === "receipts" && includeProducts && rows.length > 0) {
      const receiptIds = rows
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)

      if (receiptIds.length > 0) {
        const { rows: itemRows } = await runQuery<Record<string, unknown>>(
          `
            SELECT id,
                   receipt_id,
                   product_id,
                   description,
                   quantity,
                   unit_price,
                   total,
                   created_at
              FROM public.receipt_products
             WHERE receipt_id = ANY($1::uuid[])
             ORDER BY created_at ASC
          `,
          [receiptIds],
        )

        const itemsByReceipt = new Map<string, Record<string, unknown>[]>()
        for (const item of itemRows) {
          const key = String(item.receipt_id)
          if (!itemsByReceipt.has(key)) {
            itemsByReceipt.set(key, [])
          }
          itemsByReceipt.get(key)!.push(item)
        }

        dataRows = rows.map((row) => ({
          ...row,
          receipt_products: itemsByReceipt.get(String(row.id)) ?? [],
        }))
      }
    }

    const data = idFilter ? dataRows[0] ?? null : dataRows
    return NextResponse.json({ data })
  } catch (error) {
    console.error("Admin GET error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch resource."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { resource: string } }) {
  const forbidden = await requireAdmin()
  if (forbidden) return forbidden

  try {
    const resource = params.resource as ResourceKey
    const config = RESOURCE_CONFIG[resource]

    if (!config) {
      return notFoundResponse(params.resource)
    }

    const payload = await request.json()
    const records = parseRecords(payload)

    if (records.length === 0) {
      return badRequest("Missing payload.")
    }

    const { query, values } = buildInsertStatement(config.table, records)
    const { rows } = await runQuery(query, values)

    const responseData = Array.isArray(payload) || (payload && typeof payload === "object" && "records" in payload)
      ? rows
      : rows[0] ?? null

    return NextResponse.json({ data: responseData })
  } catch (error) {
    console.error("Admin POST error:", error)
    const message = error instanceof Error ? error.message : "Failed to create resource."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { resource: string } }) {
  const forbidden = await requireAdmin()
  if (forbidden) return forbidden

  try {
    const resource = params.resource as ResourceKey
    const config = RESOURCE_CONFIG[resource]

    if (!config) {
      return notFoundResponse(params.resource)
    }

    const payload = await request.json()

    if (!payload || typeof payload !== "object") {
      return badRequest("Missing payload.")
    }

    const { id, updates } = payload as { id?: string; updates?: Record<string, unknown> }

    if (!id) {
      return badRequest("Payload must include 'id'.")
    }

    if (!updates || typeof updates !== "object") {
      return badRequest("Payload must include 'updates'.")
    }

    const sanitizedUpdates = sanitizeRecord(updates)
    const entries = Object.entries(sanitizedUpdates)

    if (entries.length === 0) {
      return badRequest("Nenhum campo valido informado para atualizar.")
    }

    const values: unknown[] = []
    const setClauses = entries.map(([key, value], index) => {
      values.push(normalizeValue(value))
      return `${sanitizeColumn(key)} = $${index + 1}`
    })

    values.push(id)

    const query = `
      UPDATE public.${config.table}
         SET ${setClauses.join(", ")}
       WHERE id = $${values.length}::uuid
      RETURNING *
    `

    const { rows } = await runQuery(query, values)
    const data = rows[0] ?? null

    if (!data) {
      return NextResponse.json({ error: "Registro nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Admin PATCH error:", error)
    const message = error instanceof Error ? error.message : "Failed to update resource."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { resource: string } }) {
  const forbidden = await requireAdmin()
  if (forbidden) return forbidden

  try {
    const resource = params.resource as ResourceKey
    const config = RESOURCE_CONFIG[resource]

    if (!config) {
      return notFoundResponse(params.resource)
    }

    const payload = await request.json()

    if (!payload || typeof payload !== "object") {
      return badRequest("Payload must include data.")
    }

    const { id, filters } = payload as { id?: string; filters?: Record<string, unknown> }

    const conditions: string[] = []
    const values: unknown[] = []

    if (id) {
      conditions.push(`id = $${values.length + 1}::uuid`)
      values.push(id)
    } else if (filters && typeof filters === "object") {
      for (const [key, value] of Object.entries(filters)) {
        const column = sanitizeColumn(key)
        conditions.push(`${column} = $${values.length + 1}`)
        values.push(value)
      }
    }

    if (conditions.length === 0) {
      return badRequest("Payload must include 'id' or 'filters'.")
    }

    const query = `DELETE FROM public.${config.table} WHERE ${conditions.join(" AND ")}`
    const result = await runQuery(query, values)

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Registro nao encontrado." }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin DELETE error:", error)
    const message = error instanceof Error ? error.message : "Failed to delete resource."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
