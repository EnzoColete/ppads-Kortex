CREATE TYPE IF NOT EXISTS service_order_status AS ENUM ('pending','in_progress','completed','cancelled');
CREATE TYPE IF NOT EXISTS service_order_priority AS ENUM ('low','medium','high','urgent');

CREATE TABLE IF NOT EXISTS public.service_orders (
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
);

CREATE TABLE IF NOT EXISTS public.service_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_client ON public.service_orders (client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_assigned ON public.service_orders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders (status);
CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled ON public.service_orders (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_service_order_items_order ON public.service_order_items (service_order_id);

CREATE OR REPLACE FUNCTION public.service_orders_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_orders_updated_at ON public.service_orders;
CREATE TRIGGER service_orders_updated_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.service_orders_set_updated_at();

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.service_orders TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.service_order_items TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';