-- Update the user_role enum to only allow ADMIN/USER
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TABLE public.users ALTER COLUMN role TYPE text USING role::text;
    DROP TYPE user_role;
  END IF;
END $$;

CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

ALTER TABLE public.users
  ALTER COLUMN role TYPE user_role
    USING (
      CASE
        WHEN upper(role::text) = 'ADMIN' THEN 'ADMIN'
        ELSE 'USER'
      END
    )::user_role,
  ALTER COLUMN role SET DEFAULT 'USER',
  ALTER COLUMN role SET NOT NULL;

-- Ownership columns for multi-tenant isolation
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);

ALTER TABLE public.daily_expenses
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_id ON public.daily_expenses(user_id);

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_service_orders_user_id ON public.service_orders(user_id);

-- tenant-scoped unique constraints
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_email_key;
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_cnpj_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_email_key;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_cpf_cnpj_key;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_user_email_key UNIQUE (user_id, email);
ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_user_cnpj_key UNIQUE (user_id, cnpj);
ALTER TABLE public.clients
  ADD CONSTRAINT clients_user_email_key UNIQUE (user_id, email);
ALTER TABLE public.clients
  ADD CONSTRAINT clients_user_cpf_key UNIQUE (user_id, cpf_cnpj);

DO $$
DECLARE
  default_owner uuid;
BEGIN
  SELECT id
    INTO default_owner
    FROM public.users
   ORDER BY CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END, created_at
   LIMIT 1;

  IF default_owner IS NULL THEN
    RAISE NOTICE 'Nenhum usuario encontrado; user_id permanecera permitindo NULL ate atualizacao manual.';
  ELSE
    UPDATE public.suppliers SET user_id = default_owner WHERE user_id IS NULL;
    UPDATE public.clients SET user_id = default_owner WHERE user_id IS NULL;
    UPDATE public.products SET user_id = default_owner WHERE user_id IS NULL;
    UPDATE public.receipts SET user_id = default_owner WHERE user_id IS NULL;
    UPDATE public.daily_expenses SET user_id = default_owner WHERE user_id IS NULL;
    UPDATE public.service_orders SET user_id = default_owner WHERE user_id IS NULL;

    ALTER TABLE public.suppliers ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.products ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.receipts ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.daily_expenses ALTER COLUMN user_id SET NOT NULL;
    ALTER TABLE public.service_orders ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;
