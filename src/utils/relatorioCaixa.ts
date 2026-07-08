import { supabase } from '../lib/supabase';

export interface DadosRelatorioCaixa {
  caixa: {
    id: string;
    aberto_em: string;
    fechado_em: string;
    saldo_inicial: number;
    saldo_final: number;
    observacao: string | null;
  };
  movimentacoes: Array<{
    id: string;
    tipo: string;
    valor: number;
    descricao: string;
    categoria: string | null;
    forma_pagamento: string;
    observacao: string | null;
    data_movimentacao: string;
    created_at: string;
    pedido_id: string | null;
  }>;
  vendas: Array<{
    movimentacao_id: string;
    valor: number;
    pedido: {
      id: string;
      created_at: string;
      nome_cliente: string | null;
      mesa: number | null;
      tipo: string;
      forma_pagamento: string | null;
      status: string;
      total: number;
      itens?: Array<{
        product_name: string | null;
        quantidade: number;
        preco_unitario: number;
      }>;
    } | null;
  }>;
  empresa?: {
    nome_empresa: string;
    logo_url?: string | null;
  };
  resumo: {
    totalVendas: number;
    totalEntradas: number;
    totalSaidas: number;
    totalSangrias: number;
    totalSuprimentos: number;
    qtdMovimentacoes: number;
    qtdVendas: number;
    saldoEsperado: number;
  };
}

const MOV_TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  sangria: 'Sangria',
  suprimento: 'Suprimento',
  venda: 'Venda',
  ajuste: 'Ajuste',
};

function formatBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatData(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatDataHora(d: string): string {
  return new Date(d).toLocaleString('pt-BR');
}

export async function fetchRelatorioData(caixaId: string): Promise<DadosRelatorioCaixa> {
  const { data: caixa, error: caixaErr } = await supabase
    .from('caixas')
    .select('*')
    .eq('id', caixaId)
    .single();

  if (caixaErr || !caixa) throw new Error('Caixa não encontrado');

  const { data: movs, error: movsErr } = await supabase
    .from('movimentacoes_caixa')
    .select('*')
    .eq('caixa_id', caixaId)
    .order('created_at', { ascending: true });

  if (movsErr) throw new Error('Erro ao buscar movimentações');

  const vendasMovs = (movs || []).filter(m => m.tipo === 'venda' && m.pedido_id);

  const vendas: DadosRelatorioCaixa['vendas'] = [];
  for (const vm of vendasMovs) {
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .eq('id', vm.pedido_id)
      .single();

    vendas.push({
      movimentacao_id: vm.id,
      valor: Number(vm.valor),
      pedido: pedido
        ? {
            id: pedido.id,
            created_at: pedido.created_at,
            nome_cliente: pedido.nome_cliente,
            mesa: pedido.mesa,
            tipo: pedido.tipo,
            forma_pagamento: pedido.forma_pagamento,
            status: pedido.status,
            total: Number(pedido.total),
            itens: (pedido.itens_pedido || []).map((i: Record<string, unknown>) => ({
              product_name: (i.product_name as string) || null,
              quantidade: Number(i.quantidade),
              preco_unitario: Number(i.preco_unitario),
            })),
          }
        : null,
    });
  }

  let empresa: DadosRelatorioCaixa['empresa'] | undefined;
  const { data: cfg } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'nome_empresa')
    .single();
  if (cfg) {
    empresa = { nome_empresa: cfg.valor };
  } else {
    const { data: ec } = await supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle();
    if (ec) {
      empresa = { nome_empresa: ec.nome_empresa, logo_url: ec.logo_url };
    }
  }

  const movsList = (movs || []).map(m => ({
    id: m.id,
    tipo: m.tipo,
    valor: Number(m.valor),
    descricao: m.descricao,
    categoria: m.categoria,
    forma_pagamento: m.forma_pagamento,
    observacao: m.observacao,
    data_movimentacao: m.data_movimentacao,
    created_at: m.created_at,
    pedido_id: m.pedido_id,
  }));

  const totalVendas = movsList.filter(m => m.tipo === 'venda').reduce((s, m) => s + m.valor, 0);
  const totalEntradas = movsList.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movsList.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
  const totalSangrias = movsList.filter(m => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0);
  const totalSuprimentos = movsList.filter(m => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0);
  const saldoEsperado = Number(caixa.saldo_inicial) + totalVendas + totalEntradas + totalSuprimentos - totalSaidas - totalSangrias;

  return {
    caixa: {
      id: caixa.id,
      aberto_em: caixa.aberto_em,
      fechado_em: caixa.fechado_em,
      saldo_inicial: Number(caixa.saldo_inicial),
      saldo_final: Number(caixa.saldo_final || saldoEsperado),
      observacao: caixa.observacao,
    },
    movimentacoes: movsList,
    vendas,
    empresa,
    resumo: {
      totalVendas,
      totalEntradas,
      totalSaidas,
      totalSangrias,
      totalSuprimentos,
      qtdMovimentacoes: movsList.length,
      qtdVendas: vendasMovs.length,
      saldoEsperado,
    },
  };
}

export function gerarRelatorioHtml(dados: DadosRelatorioCaixa, autoPrint = true): string {
  const { caixa, movimentacoes, vendas, empresa, resumo } = dados;
  const nomeEmpresa = empresa?.nome_empresa || 'Mandacaru Esfiharia e Jantinha';
  const agora = new Date().toLocaleString('pt-BR');
  const diferenca = caixa.saldo_final - resumo.saldoEsperado;
  const difLabel = diferenca > 0 ? 'Sobra' : diferenca < 0 ? 'Falta' : 'OK';
  const difClass = diferenca > 0 ? 'positive' : diferenca < 0 ? 'negative' : 'neutral';
  const pedidoStatusLabel: Record<string, string> = {
    novo: 'Novo', aberto: 'Aberto', em_preparo: 'Em Preparo',
    pronto: 'Finalizado', entregue: 'Entregue', cancelado: 'Cancelado',
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório de Caixa - ${nomeEmpresa}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 20px; background: #fff; }
  @media print { body { padding: 0; } }
  .header { text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1f2937; }
  .header h2 { font-size: 14px; color: #6b7280; font-weight: normal; margin-top: 4px; }
  .header .meta { font-size: 11px; color: #9ca3af; margin-top: 8px; }
  .section { margin-bottom: 24px; }
  .section h3 { font-size: 14px; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 13px; }
  .info-grid .label { color: #6b7280; }
  .info-grid .value { font-weight: 600; text-align: right; }
  .info-grid .full { grid-column: 1 / -1; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; color: #374151; font-weight: 700; text-align: left; padding: 8px 10px; border-bottom: 2px solid #d1d5db; }
  td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:hover { background: #f9fafb; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-green { color: #059669; }
  .text-red { color: #dc2626; }
  .text-bold { font-weight: 700; }
  .total-row td { border-top: 2px solid #374151; font-weight: 700; background: #f9fafb; }
  .resumo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
  .resumo-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .resumo-card .label { font-size: 11px; color: #6b7280; }
  .resumo-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .resumo-card .value.positive { color: #059669; }
  .resumo-card .value.negative { color: #dc2626; }
  .resumo-card .value.neutral { color: #374151; }
  .dif-card { grid-column: 1 / -1; }
  .diff-positive { color: #059669; font-weight: 700; }
  .diff-negative { color: #dc2626; font-weight: 700; }
  .diff-neutral { color: #374151; font-weight: 700; }
  .tipo-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .tipo-venda { background: #d1fae5; color: #065f46; }
  .tipo-entrada { background: #dbeafe; color: #1e40af; }
  .tipo-saida { background: #fee2e2; color: #991b1b; }
  .tipo-sangria { background: #ffedd5; color: #9a3412; }
  .tipo-suprimento { background: #e0e7ff; color: #3730a3; }
  .tipo-ajuste { background: #fef9c3; color: #854d0e; }
  .footer { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  @media print {
    .no-print { display: none; }
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    th { background: #f3f4f6 !important; }
    .resumo-card { background: #f9fafb !important; break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${nomeEmpresa}</h1>
  <h2>Relatório de Fechamento de Caixa</h2>
  <div class="meta">Gerado em ${agora} | ID: ${caixa.id.slice(0, 8)}</div>
</div>

<div class="section">
  <h3>Dados do Caixa</h3>
  <div class="info-grid">
    <span class="label">Abertura</span><span class="value">${formatDataHora(caixa.aberto_em)}</span>
    <span class="label">Fechamento</span><span class="value">${formatDataHora(caixa.fechado_em)}</span>
    <span class="label">Status</span><span class="value">Fechado</span>
    ${caixa.observacao ? `<span class="label full">Observação</span><span class="value full">${caixa.observacao}</span>` : ''}
  </div>
</div>

<div class="section">
  <h3>Resumo Financeiro</h3>
  <div class="resumo-grid">
    <div class="resumo-card"><div class="label">Valor Inicial</div><div class="value">${formatBRL(caixa.saldo_inicial)}</div></div>
    <div class="resumo-card"><div class="label">Total de Vendas</div><div class="value text-green">${formatBRL(resumo.totalVendas)}</div></div>
    <div class="resumo-card"><div class="label">Entradas Manuais</div><div class="value text-green">${formatBRL(resumo.totalEntradas)}</div></div>
    <div class="resumo-card"><div class="label">Suprimentos</div><div class="value text-green">${formatBRL(resumo.totalSuprimentos)}</div></div>
    <div class="resumo-card"><div class="label">Saídas</div><div class="value text-red">${formatBRL(resumo.totalSaidas)}</div></div>
    <div class="resumo-card"><div class="label">Sangrias</div><div class="value text-red">${formatBRL(resumo.totalSangrias)}</div></div>
    <div class="resumo-card"><div class="label">Saldo Esperado</div><div class="value">${formatBRL(resumo.saldoEsperado)}</div></div>
    <div class="resumo-card"><div class="label">Valor Informado</div><div class="value">${formatBRL(caixa.saldo_final)}</div></div>
    <div class="resumo-card dif-card">
      <div class="label">Diferença (${difLabel})</div>
      <div class="value"><span class="diff-${difClass}">${diferenca === 0 ? 'R$ 0,00' : formatBRL(Math.abs(diferenca))}${diferenca > 0 ? ' (Sobra)' : diferenca < 0 ? ' (Falta)' : ''}</span></div>
    </div>
  </div>
  <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
    Movimentações: ${resumo.qtdMovimentacoes} | Vendas: ${resumo.qtdVendas}
  </div>
</div>

<div class="section">
  <h3>Movimentações do Caixa</h3>
  ${movimentacoes.length === 0 ? '<p style="color: #9ca3af; font-size: 13px;">Nenhuma movimentação registrada neste período.</p>' : `
  <table>
    <thead><tr>
      <th>Data/Hora</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Forma Pag.</th><th class="text-right">Valor</th>
    </tr></thead>
    <tbody>
      ${movimentacoes.map(m => {
        const ehEntrada = ['venda', 'entrada', 'suprimento', 'ajuste'].includes(m.tipo);
        return `<tr>
          <td>${formatDataHora(m.created_at)}</td>
          <td><span class="tipo-badge tipo-${m.tipo}">${MOV_TIPO_LABEL[m.tipo] || m.tipo}</span></td>
          <td>${m.descricao}${m.observacao ? '<br><span style="font-size:10px;color:#9ca3af">' + m.observacao + '</span>' : ''}</td>
          <td>${m.categoria || '-'}</td>
          <td>${m.forma_pagamento}</td>
          <td class="text-right ${ehEntrada ? 'text-green' : 'text-red'}">${ehEntrada ? '+' : '-'}${formatBRL(m.valor)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`}
</div>

<div class="section">
  <h3>Vendas / Pedidos (${vendas.length})</h3>
  ${vendas.length === 0 ? '<p style="color: #9ca3af; font-size: 13px;">Nenhuma venda registrada neste período.</p>' : `
  <table>
    <thead><tr>
      <th>Data/Hora</th><th>Cliente</th><th>Tipo</th><th>Pagamento</th><th>Status</th><th class="text-right">Total</th><th>Itens</th>
    </tr></thead>
    <tbody>
      ${vendas.map(v => {
        if (!v.pedido) return '';
        const p = v.pedido;
        return `<tr>
          <td>${formatDataHora(p.created_at)}</td>
          <td>${p.nome_cliente || (p.mesa ? 'Mesa ' + p.mesa : 'Anônimo')}</td>
          <td>${p.tipo}</td>
          <td>${p.forma_pagamento || 'nao_informado'}</td>
          <td>${pedidoStatusLabel[p.status] || p.status}</td>
          <td class="text-right text-green text-bold">${formatBRL(p.total)}</td>
          <td>${(p.itens || []).map(i => i.product_name || 'Item').join(', ')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`}
</div>

<div class="footer">
  ${nomeEmpresa} — Relatório gerado automaticamente pelo sistema de gestão.
</div>

<div class="no-print" style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="padding:10px 24px;background:#f97316;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Imprimir / Salvar PDF</button>
  <button onclick="window.close()" style="padding:10px 24px;background:#e5e7eb;color:#374151;border:none;border-radius:6px;font-size:14px;cursor:pointer;margin-left:8px">Fechar</button>
</div>

<script>
${autoPrint ? "window.onload = function() { setTimeout(function() { window.print(); }, 500); };" : ""}
</script>
</body>
</html>`;
}

export function abrirRelatorioParaImpressao(dados: DadosRelatorioCaixa, autoPrint = true): void {
  const html = gerarRelatorioHtml(dados, autoPrint);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'width=900,height=700');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-caixa-mandacaru-${dados.caixa.id.slice(0, 8)}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function gerarEAbirRelatorio(caixaId: string, autoPrint = true): Promise<void> {
  const dados = await fetchRelatorioData(caixaId);
  abrirRelatorioParaImpressao(dados, autoPrint);
}
