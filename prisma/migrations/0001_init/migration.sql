-- Prisma migration converted from legacy SQL structure for Supabase/PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enumerations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'receipt_type') THEN
    CREATE TYPE receipt_type AS ENUM ('supplier', 'client');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_expense_category') THEN
    CREATE TYPE daily_expense_category AS ENUM ('alimentacao', 'combustivel', 'pedagio', 'fornecedor');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM ('30days', '40days', '50days', '60days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
    CREATE TYPE report_type AS ENUM ('daily', 'weekly', 'monthly', 'custom');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_type') THEN
    CREATE TYPE calendar_event_type AS ENUM ('fuel', 'expense', 'receipt');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_alert_level') THEN
    CREATE TYPE calendar_alert_level AS ENUM ('green', 'yellow', 'orange', 'red');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'technician', 'client');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_order_status') THEN
    CREATE TYPE service_order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_order_priority') THEN
    CREATE TYPE service_order_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
END $$;

-- Tables
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  cnpj VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  cpf_cnpj VARCHAR(20) NOT NULL UNIQUE,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(30),
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type receipt_type NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  entity_name VARCHAR(255),
  description TEXT,
  date DATE NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  has_invoice BOOLEAN NOT NULL DEFAULT FALSE,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT receipts_entity_check CHECK (
    (supplier_id IS NOT NULL AND client_id IS NULL) OR
    (client_id IS NOT NULL AND supplier_id IS NULL)
  )
);

CREATE TABLE public.receipt_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 3) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT receipt_products_unique UNIQUE (receipt_id, product_id)
);

CREATE TABLE public.daily_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category daily_expense_category NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  observations TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type report_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type calendar_event_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value NUMERIC(10, 2),
  supplier VARCHAR(255),
  client VARCHAR(255),
  days_since INTEGER,
  alert_level calendar_alert_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(255) NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status service_order_status NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority service_order_priority,
  scheduled_date DATE,
  completed_date DATE,
  total_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suppliers_name ON public.suppliers(name);
CREATE INDEX idx_suppliers_cnpj ON public.suppliers(cnpj);
CREATE INDEX idx_clients_name ON public.clients(name);
CREATE INDEX idx_clients_cpf_cnpj ON public.clients(cpf_cnpj);
CREATE INDEX idx_products_type ON public.products(type);
CREATE INDEX idx_receipts_date ON public.receipts(date);
CREATE INDEX idx_receipts_type ON public.receipts(type);
CREATE INDEX idx_receipts_supplier ON public.receipts(supplier_id);
CREATE INDEX idx_receipts_client ON public.receipts(client_id);
CREATE INDEX idx_daily_expenses_date ON public.daily_expenses(date);
CREATE INDEX idx_daily_expenses_category ON public.daily_expenses(category);
CREATE INDEX idx_daily_expenses_supplier ON public.daily_expenses(supplier_id);
CREATE INDEX idx_alerts_client ON public.alerts(client_id);
CREATE INDEX idx_alerts_type ON public.alerts(type);
CREATE INDEX idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX idx_reports_type ON public.reports(type);
CREATE INDEX idx_reports_dates ON public.reports(start_date, end_date);
CREATE INDEX idx_calendar_events_date ON public.calendar_events(date);
CREATE INDEX idx_calendar_events_type ON public.calendar_events(type);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_service_orders_client ON public.service_orders(client_id);
CREATE INDEX idx_service_orders_assigned ON public.service_orders(assigned_to);
CREATE INDEX idx_service_orders_status ON public.service_orders(status);
CREATE INDEX idx_service_orders_scheduled ON public.service_orders(scheduled_date);
CREATE INDEX idx_service_order_items_service ON public.service_order_items(service_order_id);

-- Triggers to keep updated_at in sync for write operations executed outside Prisma
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_receipts_updated_at
BEFORE UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_daily_expenses_updated_at
BEFORE UPDATE ON public.daily_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_service_orders_updated_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

