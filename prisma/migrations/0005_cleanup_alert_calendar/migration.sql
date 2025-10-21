-- Rename app_users table back to users (keeping data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_users'
  ) THEN
    ALTER TABLE public.app_users RENAME TO users;
  END IF;
END $$;

-- Ensure primary key default matches Prisma expectations
ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;

-- Drop unused tables
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;

-- Drop enums no longer in use
DROP TYPE IF EXISTS alert_type;
DROP TYPE IF EXISTS report_type;
DROP TYPE IF EXISTS calendar_event_type;
DROP TYPE IF EXISTS calendar_alert_level;

NOTIFY pgrst, 'reload schema';
