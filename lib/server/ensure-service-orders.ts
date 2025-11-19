import { Client } from "pg"

let ensurePromise: Promise<void> | null = null

export async function ensureServiceOrdersSchema(): Promise<void> {
  if (ensurePromise) {
    return ensurePromise
  }

  ensurePromise = (async () => {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error("DATABASE_URL not configured")
    }

    const client = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
    })

    await client.connect()

    try {
      const hasStatusType = await client
        .query("SELECT 1 FROM pg_type WHERE typname = 'service_order_status' LIMIT 1")
        .then((result) => result.rowCount > 0)
      if (!hasStatusType) {
        await client.query(
          "CREATE TYPE service_order_status AS ENUM ('pending','in_progress','completed','cancelled')",
        )
      }
      await client.query(
        "GRANT USAGE ON TYPE service_order_status TO postgres, authenticator, anon, authenticated, service_role",
      )

      const hasPriorityType = await client
        .query("SELECT 1 FROM pg_type WHERE typname = 'service_order_priority' LIMIT 1")
        .then((result) => result.rowCount > 0)
      if (!hasPriorityType) {
        await client.query("CREATE TYPE service_order_priority AS ENUM ('low','medium','high','urgent')")
      }
      await client.query(
        "GRANT USAGE ON TYPE service_order_priority TO postgres, authenticator, anon, authenticated, service_role",
      )

      await client.query(`
        CREATE TABLE IF NOT EXISTS public.service_orders (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          order_number text UNIQUE NOT NULL,
          user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
          client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
          assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
          status service_order_status NOT NULL DEFAULT 'pending',
          title text NOT NULL,
          description text,
          priority service_order_priority,
          scheduled_date date,
          completed_date date,
          total_value numeric(10,2) DEFAULT 0,
          notes text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `)

      await client.query(`
        ALTER TABLE public.service_orders
          ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE
      `)

      await client.query(`
        DO $$
        DECLARE
          default_owner uuid;
        BEGIN
          SELECT id
            INTO default_owner
            FROM public.users
           ORDER BY CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END, created_at
           LIMIT 1;

          IF default_owner IS NOT NULL THEN
            UPDATE public.service_orders
               SET user_id = default_owner
             WHERE user_id IS NULL;

            ALTER TABLE public.service_orders
              ALTER COLUMN user_id SET NOT NULL;
          END IF;
        END $$;
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS public.service_order_items (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          service_order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
          product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
          description text NOT NULL,
          quantity numeric(10,2) NOT NULL,
          unit_price numeric(10,2) NOT NULL,
          total numeric(10,2) NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `)

      await client.query("CREATE INDEX IF NOT EXISTS idx_service_orders_client ON public.service_orders (client_id)")
      await client.query("CREATE INDEX IF NOT EXISTS idx_service_orders_user ON public.service_orders (user_id)")
      await client.query("CREATE INDEX IF NOT EXISTS idx_service_orders_assigned ON public.service_orders (assigned_to)")
      await client.query("CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders (status)")
      await client.query("CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled ON public.service_orders (scheduled_date)")
      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_service_order_items_order ON public.service_order_items (service_order_id)",
      )

      await client.query(`
        CREATE OR REPLACE FUNCTION public.service_orders_set_updated_at()
        RETURNS trigger AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `)

      await client.query("DROP TRIGGER IF EXISTS service_orders_updated_at ON public.service_orders")
      await client.query(`
        CREATE TRIGGER service_orders_updated_at
        BEFORE UPDATE ON public.service_orders
        FOR EACH ROW EXECUTE FUNCTION public.service_orders_set_updated_at()
      `)

      await client.query("ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY")
      await client.query("ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY")

      await client.query(
        "GRANT ALL ON TABLE public.service_orders TO postgres, authenticator, anon, authenticated, service_role",
      )
      await client.query(
        "GRANT ALL ON TABLE public.service_order_items TO postgres, authenticator, anon, authenticated, service_role",
      )

      try {
        await client.query("NOTIFY pgrst, 'reload schema'")
      } catch (notificationError) {
        console.warn("Failed to notify PostgREST to reload schema:", notificationError)
      }
    } finally {
      await client.end()
    }
  })().catch((error) => {
    ensurePromise = null
    throw error
  })

  return ensurePromise
}
