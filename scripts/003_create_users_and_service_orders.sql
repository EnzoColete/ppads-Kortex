-- Create users table with roles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'client')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_orders table
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_date DATE,
  completed_date DATE,
  total_value DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_order_items table for products/services in the order
CREATE TABLE IF NOT EXISTS service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_orders_client_id ON service_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_assigned_to ON service_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_scheduled_date ON service_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_service_order_items_service_order_id ON service_order_items(service_order_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- RLS Policies for service_orders table
CREATE POLICY "Users can view their assigned orders" ON service_orders
  FOR SELECT USING (
    assigned_to::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'technician')
    )
  );

CREATE POLICY "Admins and technicians can create orders" ON service_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'technician')
    )
  );

CREATE POLICY "Admins and technicians can update orders" ON service_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'technician')
    )
  );

-- RLS Policies for service_order_items table
CREATE POLICY "Users can view items of their orders" ON service_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = service_order_items.service_order_id
      AND (
        so.assigned_to::text = auth.uid()::text OR
        EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role IN ('admin', 'technician'))
      )
    )
  );
