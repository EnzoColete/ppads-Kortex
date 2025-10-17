-- Corrigir estrutura da tabela daily_expenses
-- Adicionando colunas faltantes na tabela daily_expenses

-- Verificar se a tabela existe e recriar com estrutura correta
DROP TABLE IF EXISTS daily_expenses CASCADE;

CREATE TABLE daily_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('alimentacao', 'combustivel', 'pedagio', 'fornecedor')),
    amount DECIMAL(10,2) NOT NULL,
    observations TEXT,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_daily_expenses_date ON daily_expenses(date);
CREATE INDEX idx_daily_expenses_category ON daily_expenses(category);
CREATE INDEX idx_daily_expenses_supplier_id ON daily_expenses(supplier_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_expenses_updated_at 
    BEFORE UPDATE ON daily_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE daily_expenses IS 'Tabela para armazenar gastos diários do sistema';
COMMENT ON COLUMN daily_expenses.category IS 'Categoria do gasto: alimentacao, combustivel, pedagio, fornecedor';
COMMENT ON COLUMN daily_expenses.supplier_id IS 'Referência ao fornecedor (opcional, apenas para categoria fornecedor)';
