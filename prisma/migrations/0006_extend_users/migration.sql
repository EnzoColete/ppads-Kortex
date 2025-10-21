CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Extend users table with registration-specific fields
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token text,
  ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz;

UPDATE public.users SET full_name = name WHERE full_name IS NULL;
UPDATE public.users SET password_hash = crypt('temporary', gen_salt('bf')) WHERE password_hash IS NULL;

ALTER TABLE public.users ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN password_hash SET NOT NULL;

ALTER TABLE public.users DROP COLUMN IF EXISTS name;

ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.users ALTER COLUMN updated_at SET DEFAULT now();

