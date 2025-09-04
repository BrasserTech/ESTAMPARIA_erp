-- schema.sql – Reset total + criação do esquema solicitado (com servicos.prazoentrega)
-- Este script DROPpa tudo no schema public e recria as tabelas/seq/func/triggers.

BEGIN;

-- =========================================================
-- LIMPEZA COMPLETA DO SCHEMA PUBLIC
-- =========================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;

-- =========================================================
-- SEQUÊNCIAS (todas iniciando em 1)
-- =========================================================
-- CLIFOR
CREATE SEQUENCE seq_clifor_chave  START 1 INCREMENT 1;
CREATE SEQUENCE seq_clifor_codigo START 1 INCREMENT 1;

-- EMPRESA
CREATE SEQUENCE seq_empresa_chave  START 1 INCREMENT 1;
CREATE SEQUENCE seq_empresa_codigo START 1 INCREMENT 1;

-- CLIFOREMP
CREATE SEQUENCE seq_cliforemp_chave START 1 INCREMENT 1;

-- PRODUTOS
CREATE SEQUENCE seq_produtos_chave  START 1 INCREMENT 1;
CREATE SEQUENCE seq_produtos_codigo START 1 INCREMENT 1;

-- SERVICOS
CREATE SEQUENCE seq_servicos_chave  START 1 INCREMENT 1;
CREATE SEQUENCE seq_servicos_codigo START 1 INCREMENT 1;

-- PRODUTOESTOQUE
CREATE SEQUENCE seq_produtoestoque_chave START 1 INCREMENT 1;

-- ENTRADAS
CREATE SEQUENCE seq_entradas_chave  START 1 INCREMENT 1;
CREATE SEQUENCE seq_entradas_codigo START 1 INCREMENT 1;

-- ITENS DE ENTRADA
CREATE SEQUENCE seq_itementradaprod_chave START 1 INCREMENT 1;
CREATE SEQUENCE seq_itementradaserv_chave START 1 INCREMENT 1;

-- SAIDAS
CREATE SEQUENCE seq_saidas_chave  START 1 INCREMENT 1;
CREATE SEQUENCE seq_saidas_codigo START 1 INCREMENT 1;

-- ITENS DE SAÍDA
CREATE SEQUENCE seq_itemsaidaprod_chave START 1 INCREMENT 1;
CREATE SEQUENCE seq_itemsaidaserv_chave START 1 INCREMENT 1;

-- =========================================================
-- FUNÇÕES DE TRIGGER REUTILIZÁVEIS
-- =========================================================

-- Atualiza datahoraalt em UPDATE
CREATE OR REPLACE FUNCTION trg_set_datahoraalt()
RETURNS trigger AS $$
BEGIN
  NEW.datahoraalt := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Em produtos, se valorvenda vier NULL, usa valorcompra
CREATE OR REPLACE FUNCTION trg_produtos_valorvenda_default()
RETURNS trigger AS $$
BEGIN
  IF NEW.valorvenda IS NULL THEN
    NEW.valorvenda := NEW.valorcompra;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- TABELAS
-- =========================================================

-- CLIFOR
-- tipo: 1=cliente, 2=fornecedor, 3=representante
CREATE TABLE clifor (
  chave        integer  PRIMARY KEY DEFAULT nextval('seq_clifor_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  codigo       integer  NOT NULL UNIQUE DEFAULT nextval('seq_clifor_codigo'),
  nome         text     NOT NULL,
  fisjur       char(1)  NOT NULL CHECK (fisjur IN ('F','J')),
  tipo         smallint NOT NULL CHECK (tipo IN (1,2,3)),
  pertenceemp  integer,              -- opcional
  email        text,
  cpf          text,
  telefone     text,
  endereco     text,
  datahoracad  timestamp NOT NULL DEFAULT NOW(),
  datahoraalt  timestamp NOT NULL DEFAULT NOW()
);

-- EMPRESA
CREATE TABLE empresa (
  chave        integer  PRIMARY KEY DEFAULT nextval('seq_empresa_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  nome         text     NOT NULL,
  codigo       integer  NOT NULL UNIQUE DEFAULT nextval('seq_empresa_codigo'),
  cnpj         text     NOT NULL,
  datahoracad  timestamp NOT NULL DEFAULT NOW(),
  datahoraalt  timestamp NOT NULL DEFAULT NOW()
);

-- CLIFOREMP (vínculo clifor/empresa)
CREATE TABLE cliforemp (
  chave        integer  PRIMARY KEY DEFAULT nextval('seq_cliforemp_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  chaveclifor  integer  NOT NULL REFERENCES clifor(chave)  ON DELETE RESTRICT,
  chaveemp     integer  NOT NULL REFERENCES empresa(chave) ON DELETE RESTRICT,
  datahoraalt  timestamp NOT NULL DEFAULT NOW()
);

-- PRODUTOS
CREATE TABLE produtos (
  chave        integer  PRIMARY KEY DEFAULT nextval('seq_produtos_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  codigo       integer  NOT NULL UNIQUE DEFAULT nextval('seq_produtos_codigo'),
  nome         text     NOT NULL,
  chaveemp     integer  REFERENCES empresa(chave) ON DELETE SET NULL, -- opcional
  valorcompra  numeric(14,2) NOT NULL,
  valorvenda   numeric(14,2),  -- ajustado por trigger se vier NULL
  obs          text,
  categoria    integer  NOT NULL DEFAULT 1,
  validade     date,
  datahoracad  timestamp NOT NULL DEFAULT NOW(),
  datahoraalt  timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_prod_preco_nonneg
    CHECK ((valorcompra >= 0) AND (valorvenda IS NULL OR valorvenda >= 0))
);

-- Trigger: valorvenda = valorcompra quando não informado
CREATE TRIGGER tg_produtos_before_insupd
BEFORE INSERT OR UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION trg_produtos_valorvenda_default();

-- SERVICOS (inclui prazoentrega DATE)
CREATE TABLE servicos (
  chave        integer  PRIMARY KEY DEFAULT nextval('seq_servicos_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  codigo       integer  NOT NULL UNIQUE DEFAULT nextval('seq_servicos_codigo'),
  nome         text     NOT NULL,
  chaveemp     integer  REFERENCES empresa(chave) ON DELETE SET NULL, -- opcional
  valorvenda   numeric(14,2) NOT NULL,
  obs          text,
  categoria    integer  NOT NULL DEFAULT 1,
  validade     date,
  prazoentrega date,  -- NOVO: prazo de entrega (sem hora)
  datahoracad  timestamp NOT NULL DEFAULT NOW(),
  datahoraalt  timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_serv_preco_nonneg CHECK (valorvenda >= 0)
);

-- PRODUTOESTOQUE
-- qtdetotal = qteentrada + qtdesaida (saída negativa por convenção)
CREATE TABLE produtoestoque (
  chave        integer  PRIMARY KEY DEFAULT nextval('seq_produtoestoque_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  chaveproduto integer  NOT NULL REFERENCES produtos(chave) ON DELETE CASCADE,
  qteentrada   numeric(14,3) NOT NULL DEFAULT 0 CHECK (qteentrada >= 0),
  qtdesaida    numeric(14,3) NOT NULL DEFAULT 0 CHECK (qtdesaida <= 0),
  qtdetotal    numeric(14,3) GENERATED ALWAYS AS (COALESCE(qteentrada,0) + COALESCE(qtdesaida,0)) STORED,
  datahoraalt  timestamp NOT NULL DEFAULT NOW()
);

-- ENTRADAS
CREATE TABLE entradas (
  chave        integer PRIMARY KEY DEFAULT nextval('seq_entradas_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  codigo       integer NOT NULL UNIQUE DEFAULT nextval('seq_entradas_codigo'),
  chaveclifor  integer NOT NULL REFERENCES clifor(chave) ON DELETE RESTRICT,
  datahoracad  timestamp NOT NULL DEFAULT NOW(),
  obs          text,
  total        numeric(14,2) NOT NULL DEFAULT 0,
  datahoraalt  timestamp NOT NULL DEFAULT NOW()
);

-- ITEMENTRADAPROD
CREATE TABLE itementradaprod (
  chave         integer PRIMARY KEY DEFAULT nextval('seq_itementradaprod_chave'),
  ativo         smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  chaveentrada  integer NOT NULL REFERENCES entradas(chave) ON DELETE CASCADE,
  chaveproduto  integer NOT NULL REFERENCES produtos(chave) ON DELETE RESTRICT,
  datahoraalt   timestamp NOT NULL DEFAULT NOW()
);

-- ITEMENTRADASERV
CREATE TABLE itementradaserv (
  chave         integer PRIMARY KEY DEFAULT nextval('seq_itementradaserv_chave'),
  ativo         smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  chaveentrada  integer NOT NULL REFERENCES entradas(chave) ON DELETE CASCADE,
  chaveservico  integer NOT NULL REFERENCES servicos(chave) ON DELETE RESTRICT,
  datahoraalt   timestamp NOT NULL DEFAULT NOW()
);

-- SAIDAS
CREATE TABLE saidas (
  chave        integer PRIMARY KEY DEFAULT nextval('seq_saidas_chave'),
  ativo        smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  codigo       integer NOT NULL UNIQUE DEFAULT nextval('seq_saidas_codigo'),
  chaveclifor  integer NOT NULL REFERENCES clifor(chave) ON DELETE RESTRICT,
  datahoracad  timestamp NOT NULL DEFAULT NOW(),
  obs          text,
  total        numeric(14,2) NOT NULL DEFAULT 0
);

-- ITEMSAIDAPROD
CREATE TABLE itemsaidaprod (
  chave         integer PRIMARY KEY DEFAULT nextval('seq_itemsaidaprod_chave'),
  ativo         smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  chavesaida    integer NOT NULL REFERENCES saidas(chave) ON DELETE CASCADE,
  chaveproduto  integer NOT NULL REFERENCES produtos(chave) ON DELETE RESTRICT,
  datahoraalt   timestamp NOT NULL DEFAULT NOW()
);

-- ITEMSAIDASERV
CREATE TABLE itemsaidaserv (
  chave         integer PRIMARY KEY DEFAULT nextval('seq_itemsaidaserv_chave'),
  ativo         smallint NOT NULL     DEFAULT 1 CHECK (ativo IN (1,2)),
  chavesaida    integer NOT NULL REFERENCES saidas(chave) ON DELETE CASCADE,
  chaveservico  integer NOT NULL REFERENCES servicos(chave) ON DELETE RESTRICT,
  datahoraalt   timestamp NOT NULL DEFAULT NOW()
);

-- =========================================================
-- TRIGGERS datahoraalt (UPDATE)
-- =========================================================
CREATE TRIGGER tg_clifor_upd       BEFORE UPDATE ON clifor          FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_empresa_upd      BEFORE UPDATE ON empresa         FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_cliforemp_upd    BEFORE UPDATE ON cliforemp       FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_produtos_upd     BEFORE UPDATE ON produtos        FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_servicos_upd     BEFORE UPDATE ON servicos        FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_pestoque_upd     BEFORE UPDATE ON produtoestoque  FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_entradas_upd     BEFORE UPDATE ON entradas        FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_ieprod_upd       BEFORE UPDATE ON itementradaprod FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_ieserv_upd       BEFORE UPDATE ON itementradaserv FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_saidas_upd       BEFORE UPDATE ON saidas          FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_isprod_upd       BEFORE UPDATE ON itemsaidaprod   FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();
CREATE TRIGGER tg_isserv_upd       BEFORE UPDATE ON itemsaidaserv   FOR EACH ROW EXECUTE FUNCTION trg_set_datahoraalt();

COMMIT;
