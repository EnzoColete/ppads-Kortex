import { Pool, PoolClient } from "pg"
import type { ServiceOrder, ServiceOrderItem } from "@/lib/types"
import { ensureServiceOrdersSchema } from "@/lib/server/ensure-service-orders"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL not configured")
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
})

const mapNumeric = (value: any): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const mapDateValue = (value: any): string | undefined => {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().split("T")[0]
}

const toNullableUuid = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toNullableDate = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toNullableText = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const mapOrderItemRow = (row: any): ServiceOrderItem => ({
  id: row.id,
  serviceOrderId: row.service_order_id,
  productId: row.product_id ?? undefined,
  description: row.description,
  quantity: mapNumeric(row.quantity),
  unitPrice: mapNumeric(row.unit_price),
  total: mapNumeric(row.total),
  createdAt: new Date(row.created_at),
})

const mapOrderRow = (row: any, items: ServiceOrderItem[]): ServiceOrder => ({
  id: row.id,
  orderNumber: row.order_number,
  clientId: row.client_id,
  assignedTo: row.assigned_to ?? undefined,
  status: row.status,
  title: row.title,
  description: row.description ?? "",
  priority: row.priority ?? undefined,
  scheduledDate: mapDateValue(row.scheduled_date),
  completedDate: mapDateValue(row.completed_date),
  totalValue: mapNumeric(row.total_value),
  notes: row.notes ?? undefined,
  items,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
})

async function withConnection<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

async function fetchItems(client: PoolClient, orderIds: string[]): Promise<Map<string, ServiceOrderItem[]>> {
  if (orderIds.length === 0) return new Map()

  const { rows } = await client.query(
    `
      SELECT id,
             service_order_id,
             product_id,
             description,
             quantity,
             unit_price,
             total,
             created_at
        FROM public.service_order_items
       WHERE service_order_id = ANY($1::uuid[])
       ORDER BY created_at ASC
    `,
    [orderIds],
  )

  const itemsByOrder = new Map<string, ServiceOrderItem[]>()

  for (const row of rows) {
    const item = mapOrderItemRow(row)
    const key = row.service_order_id
    if (!itemsByOrder.has(key)) {
      itemsByOrder.set(key, [])
    }
    itemsByOrder.get(key)!.push(item)
  }

  return itemsByOrder
}

export const serviceOrdersRepository = {
  async getAll(): Promise<ServiceOrder[]> {
    await ensureServiceOrdersSchema()

    return withConnection(async (client) => {
      const { rows } = await client.query(`
        SELECT id,
               order_number,
               client_id,
               assigned_to,
               status,
               title,
               description,
               priority,
               scheduled_date,
               completed_date,
               total_value,
               notes,
               created_at,
               updated_at
          FROM public.service_orders
         ORDER BY created_at DESC
      `)

      const orderIds = rows.map((row) => row.id)
      const itemsByOrder = await fetchItems(client, orderIds)

      return rows.map((row) => mapOrderRow(row, itemsByOrder.get(row.id) ?? []))
    })
  },

  async getById(id: string): Promise<ServiceOrder | undefined> {
    await ensureServiceOrdersSchema()

    return withConnection(async (client) => {
      const { rows } = await client.query(
        `
          SELECT id,
                 order_number,
                 client_id,
                 assigned_to,
                 status,
                 title,
                 description,
                 priority,
                 scheduled_date,
                 completed_date,
                 total_value,
                 notes,
                 created_at,
                 updated_at
            FROM public.service_orders
           WHERE id = $1::uuid
        `,
        [id],
      )

      if (rows.length === 0) return undefined

      const itemsByOrder = await fetchItems(client, [id])

      return mapOrderRow(rows[0], itemsByOrder.get(id) ?? [])
    })
  },

  async create(order: Omit<ServiceOrder, "id" | "createdAt" | "updatedAt">): Promise<ServiceOrder> {
    await ensureServiceOrdersSchema()

    return withConnection(async (client) => {
      await client.query("BEGIN")
      try {
        const insertOrder = await client.query(
          `
            INSERT INTO public.service_orders (
              order_number,
              client_id,
              assigned_to,
              status,
              title,
              description,
              priority,
              scheduled_date,
              completed_date,
              total_value,
              notes
            )
            VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8::date, $9::date, $10, $11)
            RETURNING *
          `,
          [
            order.orderNumber,
            order.clientId,
            toNullableUuid(order.assignedTo),
            order.status,
            order.title,
            order.description?.trim() ?? "",
            toNullableText(order.priority),
            toNullableDate(order.scheduledDate),
            toNullableDate(order.completedDate),
            mapNumeric(order.totalValue),
            toNullableText(order.notes),
          ],
        )

        const insertedOrder = insertOrder.rows[0]
        let insertedItems: ServiceOrderItem[] = []

        if (order.items && order.items.length > 0) {
          const valueFragments: string[] = []
          const params: any[] = [insertedOrder.id]

          order.items.forEach((item, index) => {
            const baseIndex = index * 5
            valueFragments.push(
              `($1::uuid, $${baseIndex + 2}::uuid, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${
                baseIndex + 6
              })`,
            )
            params.push(toNullableUuid(item.productId), item.description?.trim() ?? "", item.quantity, item.unitPrice, item.total)
          })

          const insertItemsQuery = `
            INSERT INTO public.service_order_items (
              service_order_id,
              product_id,
              description,
              quantity,
              unit_price,
              total
            )
            VALUES ${valueFragments.join(", ")}
            RETURNING *
          `

          const { rows: insertedItemRows } = await client.query(insertItemsQuery, params)
          insertedItems = insertedItemRows.map(mapOrderItemRow)
        }

        await client.query("COMMIT")

        return mapOrderRow(insertedOrder, insertedItems)
      } catch (error) {
        await client.query("ROLLBACK")
        throw error
      }
    })
  },

  async update(id: string, updates: Partial<ServiceOrder>): Promise<ServiceOrder | null> {
    await ensureServiceOrdersSchema()

    return withConnection(async (client) => {
      const fields: string[] = []
      const params: any[] = []
      let index = 1

      if (updates.status !== undefined) {
        fields.push(`status = $${index++}`)
        params.push(updates.status)
      }

      if (updates.assignedTo !== undefined) {
        fields.push(`assigned_to = $${index++}::uuid`)
        params.push(toNullableUuid(updates.assignedTo))
      }

      if (updates.title !== undefined) {
        fields.push(`title = $${index++}`)
        params.push(updates.title?.trim() ?? "")
      }

      if (updates.description !== undefined) {
        fields.push(`description = $${index++}`)
        params.push(updates.description?.trim() ?? "")
      }

      if (updates.priority !== undefined) {
        fields.push(`priority = $${index++}`)
        params.push(toNullableText(updates.priority))
      }

      if (updates.scheduledDate !== undefined) {
        fields.push(`scheduled_date = $${index++}::date`)
        params.push(toNullableDate(updates.scheduledDate))
      }

      if (updates.completedDate !== undefined) {
        fields.push(`completed_date = $${index++}::date`)
        params.push(toNullableDate(updates.completedDate))
      }

      if (updates.totalValue !== undefined) {
        fields.push(`total_value = $${index++}`)
        params.push(mapNumeric(updates.totalValue))
      }

      if (updates.notes !== undefined) {
        fields.push(`notes = $${index++}`)
        params.push(toNullableText(updates.notes))
      }

      if (fields.length === 0) {
        const existing = await serviceOrdersRepository.getById(id)
        return existing ?? null
      }

      params.push(id)

      const { rows } = await client.query(
        `
          UPDATE public.service_orders
             SET ${fields.join(", ")},
                 updated_at = now()
           WHERE id = $${index}::uuid
        RETURNING *
        `,
        params,
      )

      if (rows.length === 0) return null

      const itemsByOrder = await fetchItems(client, [id])
      return mapOrderRow(rows[0], itemsByOrder.get(id) ?? [])
    })
  },

  async delete(id: string): Promise<boolean> {
    await ensureServiceOrdersSchema()

    return withConnection(async (client) => {
      const { rowCount } = await client.query(
        "DELETE FROM public.service_orders WHERE id = $1::uuid",
        [id],
      )
      return rowCount > 0
    })
  },
}






