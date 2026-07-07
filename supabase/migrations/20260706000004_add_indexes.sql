-- Migration: Add performance indexes to financial and category tables
-- Created: 2026-07-06
-- Purpose: Improve query performance for reporting and filtering queries

-- ── financeiro_resumos ───────────────────────────────────────────
-- Query pattern: SELECT * ORDER BY periodo_fim DESC
-- These indexes speed up period-based lookups and the ORDER BY

CREATE INDEX IF NOT EXISTS idx_financeiro_resumos_periodo_fim
  ON financeiro_resumos(periodo_fim);

CREATE INDEX IF NOT EXISTS idx_financeiro_resumos_periodo_inicio
  ON financeiro_resumos(periodo_inicio);

CREATE INDEX IF NOT EXISTS idx_financeiro_resumos_periodo
  ON financeiro_resumos(periodo_inicio, periodo_fim);

-- ── categorias_movimentacao_caixa ─────────────────────────────────
-- Query pattern: SELECT * WHERE ativo = true
-- Also frequently filtered by tipo in the UI dropdown

CREATE INDEX IF NOT EXISTS idx_categorias_mov_caixa_tipo
  ON categorias_movimentacao_caixa(tipo);

CREATE INDEX IF NOT EXISTS idx_categorias_mov_caixa_ativo
  ON categorias_movimentacao_caixa(ativo);

CREATE INDEX IF NOT EXISTS idx_categorias_mov_caixa_tipo_ativo
  ON categorias_movimentacao_caixa(tipo, ativo);

-- ── configuracoes_empresa ─────────────────────────────────────────
-- Single-row table (one company). No empresa_id column exists.
-- All queries are LIMIT 1 scans — no index needed.
-- Skipping intentionally.
