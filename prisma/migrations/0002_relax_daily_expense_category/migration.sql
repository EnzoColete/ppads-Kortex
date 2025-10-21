-- Allow custom categories for daily expenses to match frontend behaviour
ALTER TABLE public.daily_expenses
  DROP CONSTRAINT IF EXISTS daily_expenses_category_check,
  ALTER COLUMN category TYPE varchar(100) USING category::text;

DROP TYPE IF EXISTS daily_expense_category;
