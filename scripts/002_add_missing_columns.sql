-- Add missing cnpj column to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20);

-- Update existing suppliers to have empty cnpj if needed
UPDATE suppliers SET cnpj = '' WHERE cnpj IS NULL;
