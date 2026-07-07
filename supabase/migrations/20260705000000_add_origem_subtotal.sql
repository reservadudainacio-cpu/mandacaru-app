ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS origem text DEFAULT 'sistema' CHECK (origem IN ('sistema', 'whatsapp'));
