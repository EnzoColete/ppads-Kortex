-- Remove the check constraint on products.type to allow any value
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_type_check;

-- Make the type column nullable to allow products without type
ALTER TABLE products ALTER COLUMN type DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN products.type IS 'Product type - can be any custom value or null';
