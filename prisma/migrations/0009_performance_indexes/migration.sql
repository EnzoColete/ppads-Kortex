CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients((lower(email)));
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON public.receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_user_id ON public.daily_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON public.daily_expenses(date);
