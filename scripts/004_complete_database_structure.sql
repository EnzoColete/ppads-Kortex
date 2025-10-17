-- Estrutura completa do banco de dados para o sistema de gestão de fornecedores e clientes
-- Este script cria todas as tabelas necessárias para armazenar todos os dados do sistema

-- Limpar tabelas existentes se necessário (cuidado em produção)
DROP TABLE IF EXISTS receipt_products CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS daily_expenses CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- 1. TABELA DE FORNECEDORES
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE CLIENTES
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE PRODUTOS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('nitrogen', 'semen', 'other')),
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'unidade',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE RECIBOS
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('supplier', 'client')),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    entity_name VARCHAR(255), -- Nome da entidade caso não seja cadastrada
    description TEXT,
    date DATE NOT NULL,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    has_invoice BOOLEAN DEFAULT FALSE, -- Para recibos de cliente
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Garantir que pelo menos um ID ou nome da entidade seja fornecido
    CONSTRAINT check_entity CHECK (
        (supplier_id IS NOT NULL AND client_id IS NULL) OR
        (client_id IS NOT NULL AND supplier_id IS NULL) OR
        (entity_name IS NOT NULL)
    )
);

-- 5. TABELA DE PRODUTOS DO RECIBO (Relacionamento N:N)
CREATE TABLE receipt_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(receipt_id, product_id)
);

-- 6. TABELA DE GASTOS DIÁRIOS
CREATE TABLE daily_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    food DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fuel DECIMAL(10, 2) NOT NULL DEFAULT 0,
    toll DECIMAL(10, 2) DEFAULT 0,
    supplier DECIMAL(10, 2) NOT NULL DEFAULT 0,
    supplier_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date) -- Um registro por dia
);

-- 7. TABELA DE ALERTAS
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('30days', '40days', '50days', '60days')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABELA DE RELATÓRIOS
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    data JSONB, -- Dados do relatório em formato JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABELA DE EVENTOS DO CALENDÁRIO
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fuel', 'expense', 'receipt')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(10, 2),
    supplier VARCHAR(255),
    client VARCHAR(255),
    days_since INTEGER,
    alert_level VARCHAR(10) CHECK (alert_level IN ('green', 'yellow', 'orange', 'red')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES PARA MELHOR PERFORMANCE
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_cnpj ON suppliers(cnpj);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_cpf_cnpj ON clients(cpf_cnpj);
CREATE INDEX idx_clients_location ON clients(latitude, longitude);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX idx_receipts_type ON receipts(type);
CREATE INDEX idx_receipts_supplier ON receipts(supplier_id);
CREATE INDEX idx_receipts_client ON receipts(client_id);
CREATE INDEX idx_daily_expenses_date ON daily_expenses(date);
CREATE INDEX idx_alerts_client ON alerts(client_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_dates ON reports(start_date, end_date);
CREATE INDEX idx_calendar_events_date ON calendar_events(date);
CREATE INDEX idx_calendar_events_type ON calendar_events(type);

-- TRIGGERS PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE suppliers IS 'Tabela de fornecedores do sistema';
COMMENT ON TABLE clients IS 'Tabela de clientes com coordenadas GPS para mapeamento';
COMMENT ON TABLE products IS 'Produtos categorizados (nitrogênio, sêmen, outros)';
COMMENT ON TABLE receipts IS 'Recibos emitidos para fornecedores e clientes';
COMMENT ON TABLE receipt_products IS 'Produtos incluídos em cada recibo';
COMMENT ON TABLE daily_expenses IS 'Gastos diários categorizados';
COMMENT ON TABLE alerts IS 'Sistema de alertas automáticos para clientes inativos';
COMMENT ON TABLE reports IS 'Relatórios gerados pelo sistema';
COMMENT ON TABLE calendar_events IS 'Eventos do calendário com alertas visuais';

-- DADOS DE EXEMPLO (OPCIONAL)
INSERT INTO suppliers (name, email, phone, address, cnpj) VALUES
('Fornecedor Exemplo', 'fornecedor@exemplo.com', '(11) 99999-9999', 'Rua Exemplo, 123', '12.345.678/0001-90');

INSERT INTO clients (name, email, phone, address, cpf_cnpj, latitude, longitude) VALUES
('Cliente Exemplo', 'cliente@exemplo.com', '(11) 88888-8888', 'Av. Exemplo, 456', '123.456.789-00', -23.5505, -46.6333);

INSERT INTO products (name, type, description, price, unit) VALUES
('Nitrogênio Líquido', 'nitrogen', 'Nitrogênio para conservação', 150.00, 'litro'),
('Sêmen Bovino Premium', 'semen', 'Sêmen de touro premiado', 80.00, 'dose');
