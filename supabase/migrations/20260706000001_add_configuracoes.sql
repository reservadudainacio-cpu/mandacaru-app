CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "configuracoes_select_public" ON configuracoes FOR SELECT USING (true);
CREATE POLICY "configuracoes_all_authenticated" ON configuracoes FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('whatsapp_numero', '5565993625869', 'Número do WhatsApp para receber pedidos')
ON CONFLICT (chave) DO NOTHING;
