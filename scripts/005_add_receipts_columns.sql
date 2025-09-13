-- Adicionar colunas faltantes na tabela receipts
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'client',
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_invoice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Adicionar constraint para garantir que apenas um dos IDs seja preenchido
ALTER TABLE receipts 
ADD CONSTRAINT check_supplier_or_client 
CHECK (
  (type = 'supplier' AND supplier_id IS NOT NULL AND client_id IS NULL) OR
  (type = 'client' AND client_id IS NOT NULL AND supplier_id IS NULL)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_receipts_supplier_id ON receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client_id ON receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_type ON receipts(type);
