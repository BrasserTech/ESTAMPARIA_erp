-- src/database/schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome         text NOT NULL,
  documento    text,
  email        text,
  telefone     text,
  endereco     text,
  criado_em    timestamp NOT NULL DEFAULT now()
);

-- PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku          text UNIQUE NOT NULL,
  nome         text NOT NULL,
  cor          text,
  tamanho      text,
  preco        numeric(12,2) NOT NULL DEFAULT 0,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamp NOT NULL DEFAULT now()
);

-- SERVIÇOS
CREATE TABLE IF NOT EXISTS servicos (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo       text UNIQUE NOT NULL,
  descricao    text NOT NULL,
  tempo_min    integer,
  preco        numeric(12,2) NOT NULL DEFAULT 0,
  ativo        boolean NOT NULL DEFAULT true,
  criado_em    timestamp NOT NULL DEFAULT now()
);

-- VENDAS (cabeçalho)
CREATE TABLE IF NOT EXISTS vendas (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero       bigserial UNIQUE,
  cliente_id   uuid REFERENCES clientes(id),
  data_venda   timestamp NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'ABERTA',
  total        numeric(12,2) NOT NULL DEFAULT 0
);

-- ITENS DA VENDA (produto OU serviço)
CREATE TABLE IF NOT EXISTS venda_itens (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id     uuid NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id   uuid REFERENCES produtos(id),
  servico_id   uuid REFERENCES servicos(id),
  qtde         integer NOT NULL DEFAULT 1,
  preco_unit   numeric(12,2) NOT NULL DEFAULT 0,
  CHECK (
    (produto_id IS NOT NULL AND servico_id IS NULL) OR
    (produto_id IS NULL AND servico_id IS NOT NULL)
  )
);

-- MOVIMENTAÇÕES (Entradas/Saídas)
CREATE TABLE IF NOT EXISTS movimentacoes (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo         text NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  categoria    text,
  descricao    text,
  valor        numeric(12,2) NOT NULL,
  data_mov     date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagto  text,
  venda_id     uuid REFERENCES vendas(id),
  criado_em    timestamp NOT NULL DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_clientes_nome  ON clientes  USING gin (to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_produtos_nome  ON produtos  (nome);
CREATE INDEX IF NOT EXISTS idx_servicos_desc  ON servicos  (descricao);
CREATE INDEX IF NOT EXISTS idx_vendas_data    ON vendas    (data_venda);
CREATE INDEX IF NOT EXISTS idx_mov_data       ON movimentacoes (data_mov);

-- Trigger para recalcular total da venda
CREATE OR REPLACE FUNCTION venda_recalc_total()
RETURNS trigger AS $$
BEGIN
  UPDATE vendas v
     SET total = COALESCE((
       SELECT SUM(qtde * preco_unit) FROM venda_itens vi WHERE vi.venda_id = v.id
     ), 0)
   WHERE v.id = COALESCE(NEW.venda_id, OLD.venda_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_venda_itens_aiud ON venda_itens;
CREATE TRIGGER trg_venda_itens_aiud
AFTER INSERT OR UPDATE OR DELETE ON venda_itens
FOR EACH ROW EXECUTE FUNCTION venda_recalc_total();
