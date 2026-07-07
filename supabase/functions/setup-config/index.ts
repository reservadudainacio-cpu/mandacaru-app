import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const { method } = req;

  try {
    if (method === "POST") {
      const sql = `
        CREATE TABLE IF NOT EXISTS configuracoes (
          chave TEXT PRIMARY KEY,
          valor TEXT NOT NULL,
          descricao TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

        INSERT INTO configuracoes (chave, valor, descricao)
        SELECT 'whatsapp_numero', '5565993625869', 'Número do WhatsApp para receber pedidos'
        WHERE NOT EXISTS (SELECT 1 FROM configuracoes WHERE chave = 'whatsapp_numero');
      `;

      const { error: rpcError } = await supabase.rpc("exec_sql", { sql_text: sql });
      if (rpcError) {
        // exec_sql might not exist - try via raw query
        const { error } = await supabase.from("configuracoes").select("chave").limit(1);
        if (error && error.message?.includes("relation") && error.message?.includes("does not exist")) {
          return new Response(
            JSON.stringify({ error: "Tabela 'configuracoes' não existe e não foi possível criá-la automaticamente. Execute o SQL de migração manualmente no dashboard do Supabase." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
