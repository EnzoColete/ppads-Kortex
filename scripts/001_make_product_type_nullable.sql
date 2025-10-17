-- Migration: Make product type column nullable
-- This allows products to be created without a type restriction

ALTER TABLE products 
ALTER COLUMN type DROP NOT NULL;

-- Optionally set a default value for existing products without a type
UPDATE products 
SET type = 'general' 
WHERE type IS NULL;
