import bcrypt from "bcryptjs"
import { runQuery } from "@/lib/server/db"

type UserRow = {
  id: string
  email: string
  full_name: string
  password_hash: string | null
  role: string
  email_verified: boolean
  created_at: string
  updated_at: string
}

let ensured = false

async function ensureUsersTable() {
  if (ensured) return

  await runQuery(`
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      full_name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL CHECK (role IN ('admin','technician','client')),
      email_verified boolean NOT NULL DEFAULT false,
      verification_token text,
      verification_expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `)

  await runQuery(`
    CREATE OR REPLACE FUNCTION set_users_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  await runQuery(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'users'
          AND trigger_name = 'trigger_set_users_updated_at'
      ) THEN
        CREATE TRIGGER trigger_set_users_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW EXECUTE FUNCTION set_users_updated_at();
      END IF;
    END;
    $$;
  `)

  ensured = true
}

export type PublicUser = {
  id: string
  email: string
  fullName: string
  role: "admin" | "technician" | "client"
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

function mapRow(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as PublicUser["role"],
    emailVerified: Boolean(row.email_verified),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function findUserByEmail(email: string) {
  await ensureUsersTable()

  const { rows } = await runQuery<UserRow>(
    `SELECT * FROM public.users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  )

  if (rows.length === 0) return null
  return rows[0]
}

export async function listUsers(): Promise<PublicUser[]> {
  await ensureUsersTable()
  const { rows } = await runQuery<UserRow>(
    `SELECT * FROM public.users ORDER BY created_at DESC`,
  )
  return rows.map(mapRow)
}

export async function createUser(params: {
  email: string
  fullName: string
  password: string
  role?: "admin" | "technician" | "client"
  emailVerified?: boolean
}) {
  await ensureUsersTable()

  const passwordHash = await bcrypt.hash(params.password, 12)
  const role = params.role ?? "client"
  const emailVerified = Boolean(params.emailVerified)

  const { rows } = await runQuery<UserRow>(
    `
      INSERT INTO public.users (email, full_name, password_hash, role, email_verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [params.email.trim().toLowerCase(), params.fullName.trim(), passwordHash, role, emailVerified],
  )

  return mapRow(rows[0])
}

export async function updateUserByEmail(email: string, updates: { fullName?: string; role?: string }) {
  await ensureUsersTable()

  const fields: string[] = []
  const values: any[] = []
  let index = 1

  if (updates.fullName !== undefined) {
    fields.push(`full_name = $${index++}`)
    values.push(updates.fullName.trim())
  }

  if (updates.role !== undefined) {
    fields.push(`role = $${index++}`)
    values.push(updates.role)
  }

  if (fields.length === 0) {
    const existing = await findUserByEmail(email)
    return existing ? mapRow(existing) : null
  }

  values.push(email.trim().toLowerCase())

  const { rows } = await runQuery<UserRow>(
    `
      UPDATE public.users
         SET ${fields.join(", ")},
             updated_at = now()
       WHERE lower(email) = lower($${index})
       RETURNING *
    `,
    values,
  )

  if (rows.length === 0) return null
  return mapRow(rows[0])
}

export async function deleteUserByEmail(email: string) {
  await ensureUsersTable()
  const { rowCount } = await runQuery(
    `DELETE FROM public.users WHERE lower(email) = lower($1)`,
    [email.trim().toLowerCase()],
  )
  return rowCount > 0
}

export async function verifyPassword(row: UserRow, password: string) {
  if (!row.password_hash || typeof row.password_hash !== "string" || row.password_hash.length === 0) {
    return false
  }

  return bcrypt.compare(password, row.password_hash)
}

export async function updatePasswordHashById(userId: string, password: string) {
  await ensureUsersTable()
  const passwordHash = await bcrypt.hash(password, 12)
  await runQuery(
    `UPDATE public.users SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [passwordHash, userId],
  )
  return passwordHash
}
