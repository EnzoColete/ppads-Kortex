-- Add missing cpfCnpj column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Update any existing records to have empty string instead of null
UPDATE clients SET cpf_cnpj = '' WHERE cpf_cnpj IS NULL;
