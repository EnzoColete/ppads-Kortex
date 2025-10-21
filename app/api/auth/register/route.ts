import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { Client } from "pg"

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Informe seu nome completo")
      .refine((value) => value.trim().split(/\s+/).length >= 2, {
        message: "Informe ao menos nome e sobrenome",
      }),
    email: z.string().email("Informe um e-mail valido"),
    password: z
      .string()
      .min(8, "A senha deve ter no minimo 8 caracteres")
      .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
        message: "Use ao menos uma letra e um numero",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao coincidem",
    path: ["confirmPassword"],
  })

const ensureUsersTable = (() => {
  let promise: Promise<void> | null = null

  return async () => {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      console.warn("DATABASE_URL nao configurada; nao foi possivel garantir a existencia da tabela public.users.")
      return
    }

    if (!promise) {
      promise = (async () => {
        const client = new Client({
          connectionString: databaseUrl,
          ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
        })

        await client.connect()

        try {
          const { rows } = await client.query<{ table_name: string | null }>(
            "select to_regclass('public.users') as table_name",
          )
          const tableExists = Boolean(rows[0]?.table_name)

          if (!tableExists) {
            await client.query(`
              CREATE TABLE public.users (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                email text UNIQUE NOT NULL,
                full_name text NOT NULL,
                password_hash text NOT NULL,
                role text NOT NULL CHECK (role IN ('admin','technician','client')),
                email_verified boolean DEFAULT false,
                verification_token text,
                verification_expires_at timestamptz,
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
              );
            `)
          }

          const { rows: columnRows } = await client.query<{ column_name: string }>(
            `
              SELECT column_name
              FROM information_schema.columns
              WHERE table_schema = 'public'
                AND table_name = 'users'
            `,
          )

          const columns = new Set(columnRows.map((column) => column.column_name))

          if (!columns.has("full_name")) {
            if (columns.has("name")) {
              await client.query(`
                ALTER TABLE public.users
                  ADD COLUMN full_name text;

                UPDATE public.users
                  SET full_name = name
                  WHERE full_name IS NULL;

                ALTER TABLE public.users
                  ALTER COLUMN full_name SET NOT NULL;

                ALTER TABLE public.users
                  DROP COLUMN name;
              `)
              columns.add("full_name")
              columns.delete("name")
            } else {
              await client.query(`
                ALTER TABLE public.users
                  ADD COLUMN full_name text;
              `)
              columns.add("full_name")
            }
          }

          if (!columns.has("password_hash")) {
            await client.query(`
              ALTER TABLE public.users
                ADD COLUMN password_hash text;
            `)
            columns.add("password_hash")
          }

          if (!columns.has("email_verified")) {
            await client.query(`
              ALTER TABLE public.users
                ADD COLUMN email_verified boolean DEFAULT false;
            `)
            columns.add("email_verified")
          }

          if (!columns.has("verification_token")) {
            await client.query(`
              ALTER TABLE public.users
                ADD COLUMN verification_token text;
            `)
            columns.add("verification_token")
          }

          if (!columns.has("verification_expires_at")) {
            await client.query(`
              ALTER TABLE public.users
                ADD COLUMN verification_expires_at timestamptz;
            `)
            columns.add("verification_expires_at")
          }

          if (!columns.has("created_at")) {
            await client.query(`
              ALTER TABLE public.users
                ADD COLUMN created_at timestamptz DEFAULT now();
            `)
            columns.add("created_at")
          }

          if (!columns.has("updated_at")) {
            await client.query(`
              ALTER TABLE public.users
                ADD COLUMN updated_at timestamptz DEFAULT now();
            `)
            columns.add("updated_at")
          }

          await client.query(`
            ALTER TABLE public.users
              ALTER COLUMN updated_at SET DEFAULT now(),
              ALTER COLUMN created_at SET DEFAULT now();
          `)

          await client.query(`
            GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM pg_policies
                WHERE schemaname = 'public'
                  AND tablename = 'users'
                  AND policyname = 'users_select_authenticated'
              ) THEN
                CREATE POLICY users_select_authenticated ON public.users
                  FOR SELECT TO authenticated
                  USING (true);
              END IF;
            END $$;
          `)
        } finally {
          await client.end()
        }
      })().catch((error) => {
        promise = null
        throw error
      })
    }

    return promise
  }
})()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const flatten = parsed.error.flatten()
      return NextResponse.json(
        {
          message: "Preencha todos os campos com informacoes validas.",
          errors: flatten.fieldErrors,
        },
        { status: 400 },
      )
    }

    const { fullName, email, password } = parsed.data
    const sanitizedEmail = email.trim().toLowerCase()
    const trimmedName = fullName.trim()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const databaseUrl = process.env.DATABASE_URL

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey || !databaseUrl) {
      return NextResponse.json({ message: "Configuracao do Supabase ausente." }, { status: 500 })
    }

    await ensureUsersTable()

    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const anonClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const pgClient = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    })

    await pgClient.connect()

    try {
      const { rows: existingRows } = await pgClient.query<{ id: string }>(
        "select id from public.users where lower(email) = $1 limit 1",
        [sanitizedEmail],
      )

      if (existingRows.length > 0) {
        return NextResponse.json(
          { message: "Este e-mail ja esta cadastrado. Use outro e-mail ou faca login." },
          { status: 409 },
        )
      }

      const { data: signUpResult, error: signUpError } = await anonClient.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          data: { fullName: trimmedName },
        },
      })

      if (signUpError) {
        if (signUpError.status === 422 || signUpError.status === 409 || signUpError.status === 400) {
          return NextResponse.json(
            { message: "Este e-mail ja esta cadastrado. Use outro e-mail ou faca login." },
            { status: 409 },
          )
        }
        console.error(signUpError)
        return NextResponse.json({ message: "Erro ao criar usuario." }, { status: 500 })
      }

      const authUser = signUpResult?.user

      if (!authUser) {
        return NextResponse.json({ message: "Falha ao criar usuario." }, { status: 500 })
      }

      const passwordHash = await bcrypt.hash(password, 12)

      try {
        await pgClient.query(
          `
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
          `,
          [authUser.id, sanitizedEmail, trimmedName, passwordHash, "client", Boolean(authUser.email_confirmed_at)],
        )
      } catch (insertError) {
        console.error(insertError)
        await adminClient.auth.admin.deleteUser(authUser.id)
        return NextResponse.json({ message: "Erro ao finalizar cadastro." }, { status: 500 })
      }

      return NextResponse.json(
        { message: `Cadastro realizado! Enviamos um e-mail de confirmacao para ${sanitizedEmail}.` },
        { status: 201 },
      )
    } finally {
      await pgClient.end().catch(() => {})
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Erro inesperado ao realizar cadastro." }, { status: 500 })
  }
}

export function GET() {
  return NextResponse.json({ message: "Metodo nao permitido" }, { status: 405 })
}
