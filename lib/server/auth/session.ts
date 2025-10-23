import crypto from "crypto"
import { runQuery } from "@/lib/server/db"

const SESSION_TTL_HOURS = 24 * 7 // 7 days
let ensuredSchema = false

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

async function ensureSchema() {
  if (ensuredSchema) return

  await runQuery(`
    CREATE TABLE IF NOT EXISTS public.sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
  `)

  ensuredSchema = true
}

export async function createSession(userId: string) {
  await ensureSchema()

  const token = crypto.randomBytes(48).toString("hex")
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000)

  await runQuery(
    `
      INSERT INTO public.sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token_hash)
      DO UPDATE SET expires_at = EXCLUDED.expires_at
    `,
    [userId, tokenHash, expiresAt],
  )

  return { token, expiresAt }
}

export async function getUserBySessionToken(token: string) {
  await ensureSchema()
  const tokenHash = hashToken(token)

  const { rows } = await runQuery<{
    user_id: string
    email: string
    full_name: string
    role: string
    email_verified: boolean
    created_at: string
    updated_at: string
    session_id: string
  }>(
    `
      SELECT
        s.id as session_id,
        u.id as user_id,
        u.email,
        u.full_name,
        u.role,
        u.email_verified,
        u.created_at,
        u.updated_at
      FROM public.sessions s
      JOIN public.users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
      LIMIT 1
    `,
    [tokenHash],
  )

  if (rows.length === 0) return null

  const record = rows[0]

  return {
    sessionId: record.session_id,
    user: {
      id: record.user_id,
      email: record.email,
      fullName: record.full_name,
      role: record.role,
      emailVerified: record.email_verified,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    },
  }
}

export async function deleteSessionByToken(token: string) {
  await ensureSchema()
  const tokenHash = hashToken(token)
  await runQuery("DELETE FROM public.sessions WHERE token_hash = $1", [tokenHash])
}

export async function deleteSessionById(sessionId: string) {
  await ensureSchema()
  await runQuery("DELETE FROM public.sessions WHERE id = $1::uuid", [sessionId])
}
