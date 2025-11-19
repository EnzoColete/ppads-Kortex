#!/usr/bin/env node
/**
 * Bootstrap default auth users (cliente e admin) no Supabase Auth e na tabela public.users.
 */
require("dotenv/config")

const { createClient } = require("@supabase/supabase-js")
const { Client } = require("pg")
const bcrypt = require("bcryptjs")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const databaseUrl = process.env.DATABASE_URL

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  console.error("? Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e DATABASE_URL no .env antes de rodar o bootstrap.")
  process.exit(1)
}

const seeds = [
  {
    email: (process.env.DEFAULT_CLIENT_EMAIL || "cliente@exemplo.com").toLowerCase(),
    password: process.env.DEFAULT_CLIENT_PASSWORD || "Zp4!r9LmQ#2s",
    fullName: process.env.DEFAULT_CLIENT_NAME || "Cliente Exemplo",
    role: "USER",
  },
  {
    email: (process.env.DEFAULT_ADMIN_EMAIL || "admin@exemplo.com").toLowerCase(),
    password: process.env.DEFAULT_ADMIN_PASSWORD || "Adm1n!#2024",
    fullName: process.env.DEFAULT_ADMIN_NAME || "Administrador do Sistema",
    role: "ADMIN",
  },
]

const authClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const pgClient = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

async function ensureUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      full_name text NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL CHECK (role IN ('ADMIN','USER')) DEFAULT 'USER',
      email_verified boolean DEFAULT false,
      verification_token text,
      verification_expires_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
          AND policyname = 'users_select_authenticated'
      ) THEN
        CREATE POLICY users_select_authenticated ON public.users
          FOR SELECT TO authenticated
          USING (true);
      END IF;
    END $$;
  `
  await pgClient.query(sql)
}

async function ensureAuthUser({ email, password, fullName }) {
  const { data, error } = await authClient.auth.admin.listUsers()
  if (error) throw error

  const existing = data?.users?.find((user) => user.email?.toLowerCase() === email)
  if (existing) {
    console.log(`? Usu�rio ${email} j� existe. Atualizando senha e marcando como confirmado.`)
    const { error: updateError } = await authClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: false,
      user_metadata: { fullName },
    })
    if (updateError) throw updateError
    return existing
  }

  console.log(`? Criando usu�rio ${email}.`)
  const { data: created, error: createError } = await authClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { fullName },
  })
  if (createError) throw createError
  return created.user
}

async function upsertUserRecord({ id, email_confirmed_at }, { email, fullName, role, password }) {
  const passwordHash = await bcrypt.hash(password, 12)
  const sql = `
    INSERT INTO public.users (id, email, full_name, password_hash, role, email_verified)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      email_verified = EXCLUDED.email_verified,
      updated_at = now();
  `
  await pgClient.query(sql, [id, email, fullName, passwordHash, role, Boolean(email_confirmed_at)])
}

async function run() {
  await pgClient.connect()
  await ensureUsersTable()

  for (const seed of seeds) {
    console.log(`\n??  Processando ${seed.email}`)
    const authUser = await ensureAuthUser(seed)
    await upsertUserRecord(authUser, seed)
    console.log(`? Usu�rio ${seed.email} pronto.`)
  }
}

run()
  .then(async () => {
    await pgClient.end()
    console.log("\n?? Bootstrap conclu�do. Agora voc� pode fazer login com as credenciais configuradas.")
    process.exit(0)
  })
  .catch(async (error) => {
    await pgClient.end().catch(() => {})
    console.error(`\n? Falha ao executar bootstrap: ${error.message}`)
    process.exit(1)
  })



