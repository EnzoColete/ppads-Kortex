require("dotenv/config")
const { Client } = require("pg")

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const queries = [
    "DROP TABLE IF EXISTS public.service_order_items CASCADE;",
    "DROP TABLE IF EXISTS public.service_orders CASCADE;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_order_status') THEN CREATE TYPE service_order_status AS ENUM ('pending','in_progress','completed','cancelled'); END IF; END $$;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_order_priority') THEN CREATE TYPE service_order_priority AS ENUM ('low','medium','high','urgent'); END IF; END $$;",
    "GRANT USAGE ON TYPE service_order_status TO postgres, authenticator, anon, authenticated, service_role;",
    "GRANT USAGE ON TYPE service_order_priority TO postgres, authenticator, anon, authenticated, service_role;",
    `CREATE TABLE public.service_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number text UNIQUE NOT NULL,
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
    );`,
    `CREATE TABLE public.service_order_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
      product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
      description text NOT NULL,
      quantity numeric(10,2) NOT NULL,
      unit_price numeric(10,2) NOT NULL,
      total numeric(10,2) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );`,
    "CREATE INDEX idx_service_orders_client ON public.service_orders (client_id);",
    "CREATE INDEX idx_service_orders_assigned ON public.service_orders (assigned_to);",
    "CREATE INDEX idx_service_orders_status ON public.service_orders (status);",
    "CREATE INDEX idx_service_orders_scheduled ON public.service_orders (scheduled_date);",
    "CREATE INDEX idx_service_order_items_order ON public.service_order_items (service_order_id);",
    `CREATE OR REPLACE FUNCTION public.service_orders_set_updated_at()
      RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;`,
    "CREATE TRIGGER service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.service_orders_set_updated_at();",
    "ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;",
    "GRANT ALL ON TABLE public.service_orders TO postgres, authenticator, anon, authenticated, service_role;",
    "GRANT ALL ON TABLE public.service_order_items TO postgres, authenticator, anon, authenticated, service_role;",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;",
    "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticator, anon, authenticated, service_role;",
    "ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;",
    "ALTER PUBLICATION supabase_realtime ADD TABLE public.service_order_items;",
    "NOTIFY pgrst, 'reload schema';",
  ]

  for (const sql of queries) {
    await client.query(sql)
  }

  await client.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
