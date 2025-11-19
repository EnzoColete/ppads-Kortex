import { Pool, type PoolClient } from "pg"

let pool: Pool | undefined

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL not configured")
  }

  const maxConnections = Number(process.env.DATABASE_POOL_SIZE ?? "3")

  return new Pool({
    connectionString,
    max: Number.isNaN(maxConnections) ? 3 : maxConnections,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  })
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool()
  }
  return pool
}

export async function runQuery<T = any>(text: string, params?: any[]) {
  const client = await getPool().connect()
  try {
    const result = await client.query<T>(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
