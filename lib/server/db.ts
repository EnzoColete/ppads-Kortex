// db.ts
import { Pool, type PoolClient } from "pg"

let pool: Pool | null = null

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
    // aumenta um pouco o timeout de conexão pra evitar erro em free tier mais lento
    connectionTimeoutMillis: 15_000,
    // se for banco externo (supabase, neon, railway etc), força SSL
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
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

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
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
