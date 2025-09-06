--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'Schema recriado via reset total';


--
-- Name: _after_itementradaprod_mut(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._after_itementradaprod_mut() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_prod INT; v_q NUMERIC(14,3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_prod := NEW.chaveproduto; v_q := COALESCE(NEW.qtde,1);
    PERFORM _ensure_estoque_produto(v_prod);
    UPDATE produtoestoque
       SET qtentrada = COALESCE(qtentrada,0) + v_q,
           chaveitementrada = COALESCE(chaveitementrada, NEW.chave)
     WHERE chaveproduto = v_prod;
    PERFORM _recalc_estoque_produto(v_prod);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_prod := NEW.chaveproduto;
    PERFORM _ensure_estoque_produto(v_prod);
    UPDATE produtoestoque
       SET qtentrada = COALESCE(qtentrada,0) - COALESCE(OLD.qtde,1) + COALESCE(NEW.qtde,1),
           chaveitementrada = NEW.chave
     WHERE chaveproduto = v_prod;
    PERFORM _recalc_estoque_produto(v_prod);
    RETURN NEW;

  ELSE
    v_prod := OLD.chaveproduto;
    UPDATE produtoestoque
       SET qtentrada = COALESCE(qtentrada,0) - COALESCE(OLD.qtde,1)
     WHERE chaveproduto = v_prod;
    PERFORM _recalc_estoque_produto(v_prod);
    RETURN OLD;
  END IF;
END $$;


ALTER FUNCTION public._after_itementradaprod_mut() OWNER TO postgres;

--
-- Name: _after_itementradaserv_mut(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._after_itementradaserv_mut() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_srv INT; v_q NUMERIC(14,3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_srv := NEW.chaveservico; v_q := COALESCE(NEW.qtde,1);
    PERFORM _ensure_estoque_servico(v_srv);
    UPDATE servicoestoque
       SET qtentrada = COALESCE(qtentrada,0) + v_q,
           chaveitementradaserv = COALESCE(chaveitementradaserv, NEW.chave)
     WHERE chaveservico = v_srv;
    PERFORM _recalc_estoque_servico(v_srv);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_srv := NEW.chaveservico;
    PERFORM _ensure_estoque_servico(v_srv);
    UPDATE servicoestoque
       SET qtentrada = COALESCE(qtentrada,0) - COALESCE(OLD.qtde,1) + COALESCE(NEW.qtde,1),
           chaveitementradaserv = NEW.chave
     WHERE chaveservico = v_srv;
    PERFORM _recalc_estoque_servico(v_srv);
    RETURN NEW;

  ELSE
    v_srv := OLD.chaveservico;
    UPDATE servicoestoque
       SET qtentrada = COALESCE(qtentrada,0) - COALESCE(OLD.qtde,1)
     WHERE chaveservico = v_srv;
    PERFORM _recalc_estoque_servico(v_srv);
    RETURN OLD;
  END IF;
END $$;


ALTER FUNCTION public._after_itementradaserv_mut() OWNER TO postgres;

--
-- Name: _after_itemsaidaprod_mut(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._after_itemsaidaprod_mut() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_prod INT; v_q NUMERIC(14,3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_prod := NEW.chaveproduto; v_q := COALESCE(NEW.qtde,1);
    PERFORM _ensure_estoque_produto(v_prod);
    UPDATE produtoestoque
       SET qtdesaida = COALESCE(qtdesaida,0) + v_q
     WHERE chaveproduto = v_prod;
    PERFORM _recalc_estoque_produto(v_prod);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_prod := NEW.chaveproduto;
    UPDATE produtoestoque
       SET qtdesaida = COALESCE(qtdesaida,0) - COALESCE(OLD.qtde,1) + COALESCE(NEW.qtde,1)
     WHERE chaveproduto = v_prod;
    PERFORM _recalc_estoque_produto(v_prod);
    RETURN NEW;

  ELSE
    v_prod := OLD.chaveproduto;
    UPDATE produtoestoque
       SET qtdesaida = COALESCE(qtdesaida,0) - COALESCE(OLD.qtde,1)
     WHERE chaveproduto = v_prod;
    PERFORM _recalc_estoque_produto(v_prod);
    RETURN OLD;
  END IF;
END $$;


ALTER FUNCTION public._after_itemsaidaprod_mut() OWNER TO postgres;

--
-- Name: _after_itemsaidaserv_mut(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._after_itemsaidaserv_mut() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_srv INT; v_q NUMERIC(14,3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_srv := NEW.chaveservico; v_q := COALESCE(NEW.qtde,1);
    PERFORM _ensure_estoque_servico(v_srv);
    UPDATE servicoestoque
       SET qtdesaida = COALESCE(qtdesaida,0) + v_q
     WHERE chaveservico = v_srv;
    PERFORM _recalc_estoque_servico(v_srv);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_srv := NEW.chaveservico;
    UPDATE servicoestoque
       SET qtdesaida = COALESCE(qtdesaida,0) - COALESCE(OLD.qtde,1) + COALESCE(NEW.qtde,1)
     WHERE chaveservico = v_srv;
    PERFORM _recalc_estoque_servico(v_srv);
    RETURN NEW;

  ELSE
    v_srv := OLD.chaveservico;
    UPDATE servicoestoque
       SET qtdesaida = COALESCE(qtdesaida,0) - COALESCE(OLD.qtde,1)
     WHERE chaveservico = v_srv;
    PERFORM _recalc_estoque_servico(v_srv);
    RETURN OLD;
  END IF;
END $$;


ALTER FUNCTION public._after_itemsaidaserv_mut() OWNER TO postgres;

--
-- Name: _calc_valortotal_items(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._calc_valortotal_items() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.valortotal := ROUND(COALESCE(NEW.qtde,1) * COALESCE(NEW.valorunit,0), 2);
  RETURN NEW;
END $$;


ALTER FUNCTION public._calc_valortotal_items() OWNER TO postgres;

--
-- Name: _ensure_estoque_produto(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._ensure_estoque_produto(_chaveproduto integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO produtoestoque (ativo, chaveproduto, qtentrada, qtdesaida, qtdtotal)
  SELECT 1, _chaveproduto, 0, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM produtoestoque WHERE chaveproduto = _chaveproduto);
END $$;


ALTER FUNCTION public._ensure_estoque_produto(_chaveproduto integer) OWNER TO postgres;

--
-- Name: _ensure_estoque_servico(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._ensure_estoque_servico(_chaveservico integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO servicoestoque (ativo, chaveservico, qtentrada, qtdesaida, qtdtotal)
  SELECT 1, _chaveservico, 0, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM servicoestoque WHERE chaveservico = _chaveservico);
END $$;


ALTER FUNCTION public._ensure_estoque_servico(_chaveservico integer) OWNER TO postgres;

--
-- Name: _recalc_estoque_produto(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._recalc_estoque_produto(_chaveproduto integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE produtoestoque e
     SET qtdtotal = COALESCE(e.qtentrada,0) - COALESCE(e.qtdesaida,0),
         datahoraalt = NOW()
   WHERE e.chaveproduto = _chaveproduto;
END $$;


ALTER FUNCTION public._recalc_estoque_produto(_chaveproduto integer) OWNER TO postgres;

--
-- Name: _recalc_estoque_servico(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._recalc_estoque_servico(_chaveservico integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE servicoestoque e
     SET qtdtotal = COALESCE(e.qtentrada,0) - COALESCE(e.qtdesaida,0),
         datahoraalt = NOW()
   WHERE e.chaveservico = _chaveservico;
END $$;


ALTER FUNCTION public._recalc_estoque_servico(_chaveservico integer) OWNER TO postgres;

--
-- Name: fn_servicoestoque_adjust(integer, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_servicoestoque_adjust(p_chaveservico integer, p_delta_entrada numeric, p_delta_saida numeric) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- se não existe, cria a linha base
  INSERT INTO servicoestoque (chaveservico, qteentrada, qtdesaida, qtdetotal)
  VALUES (p_chaveservico, 0, 0, 0)
  ON CONFLICT (chaveservico) DO NOTHING;

  -- aplica os deltas (>= 0 recomendável)
  UPDATE servicoestoque
     SET qteentrada = qteentrada + COALESCE(p_delta_entrada, 0),
         qtdesaida  = qtdesaida  + COALESCE(p_delta_saida, 0),
         qtdetotal  = (qteentrada + COALESCE(p_delta_entrada, 0))
                      - (qtdesaida  + COALESCE(p_delta_saida, 0)),
         datahoraalt = NOW()
   WHERE chaveservico = p_chaveservico;
END;
$$;


ALTER FUNCTION public.fn_servicoestoque_adjust(p_chaveservico integer, p_delta_entrada numeric, p_delta_saida numeric) OWNER TO postgres;

--
-- Name: trg_produtos_valorvenda_default(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_produtos_valorvenda_default() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.valorvenda IS NULL THEN
    NEW.valorvenda := NEW.valorcompra;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_produtos_valorvenda_default() OWNER TO postgres;

--
-- Name: trg_servicoestoque_recalc_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_servicoestoque_recalc_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.qtdetotal := COALESCE(NEW.qteentrada,0) - COALESCE(NEW.qtdesaida,0);
  NEW.datahoraalt := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_servicoestoque_recalc_total() OWNER TO postgres;

--
-- Name: trg_set_datahoraalt(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_set_datahoraalt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.datahoraalt := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trg_set_datahoraalt() OWNER TO postgres;

--
-- Name: seq_clifor_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_clifor_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_clifor_chave OWNER TO postgres;

--
-- Name: seq_clifor_codigo; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_clifor_codigo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_clifor_codigo OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clifor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clifor (
    chave integer DEFAULT nextval('public.seq_clifor_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    codigo integer DEFAULT nextval('public.seq_clifor_codigo'::regclass) NOT NULL,
    nome text NOT NULL,
    fisjur character(1) NOT NULL,
    tipo smallint NOT NULL,
    pertenceemp integer,
    email text,
    cpf text,
    telefone text,
    endereco text,
    datahoracad timestamp without time zone DEFAULT now() NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT clifor_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2]))),
    CONSTRAINT clifor_fisjur_check CHECK ((fisjur = ANY (ARRAY['F'::bpchar, 'J'::bpchar]))),
    CONSTRAINT clifor_tipo_check CHECK ((tipo = ANY (ARRAY[1, 2, 3])))
);


ALTER TABLE public.clifor OWNER TO postgres;

--
-- Name: seq_cliforemp_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_cliforemp_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_cliforemp_chave OWNER TO postgres;

--
-- Name: cliforemp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cliforemp (
    chave integer DEFAULT nextval('public.seq_cliforemp_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chaveclifor integer NOT NULL,
    chaveemp integer NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT cliforemp_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.cliforemp OWNER TO postgres;

--
-- Name: seq_empresa_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_empresa_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_empresa_chave OWNER TO postgres;

--
-- Name: seq_empresa_codigo; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_empresa_codigo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_empresa_codigo OWNER TO postgres;

--
-- Name: empresa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresa (
    chave integer DEFAULT nextval('public.seq_empresa_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    nome text NOT NULL,
    codigo integer DEFAULT nextval('public.seq_empresa_codigo'::regclass) NOT NULL,
    cnpj text NOT NULL,
    datahoracad timestamp without time zone DEFAULT now() NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT empresa_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.empresa OWNER TO postgres;

--
-- Name: seq_entradas_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_entradas_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_entradas_chave OWNER TO postgres;

--
-- Name: seq_entradas_codigo; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_entradas_codigo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_entradas_codigo OWNER TO postgres;

--
-- Name: entradas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entradas (
    chave integer DEFAULT nextval('public.seq_entradas_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    codigo integer DEFAULT nextval('public.seq_entradas_codigo'::regclass) NOT NULL,
    chaveclifor integer NOT NULL,
    datahoracad timestamp without time zone DEFAULT now() NOT NULL,
    obs text,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT entradas_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.entradas OWNER TO postgres;

--
-- Name: seq_itementradaprod_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_itementradaprod_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_itementradaprod_chave OWNER TO postgres;

--
-- Name: itementradaprod; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.itementradaprod (
    chave integer DEFAULT nextval('public.seq_itementradaprod_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chaveentrada integer NOT NULL,
    chaveproduto integer NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    qtde numeric(14,3) DEFAULT 1 NOT NULL,
    valorunit numeric(14,2) DEFAULT 0 NOT NULL,
    valortotal numeric(14,2),
    CONSTRAINT itementradaprod_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.itementradaprod OWNER TO postgres;

--
-- Name: seq_itementradaserv_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_itementradaserv_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_itementradaserv_chave OWNER TO postgres;

--
-- Name: itementradaserv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.itementradaserv (
    chave integer DEFAULT nextval('public.seq_itementradaserv_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chaveentrada integer NOT NULL,
    chaveservico integer NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    qtde numeric(14,3) DEFAULT 1 NOT NULL,
    valorunit numeric(14,2) DEFAULT 0 NOT NULL,
    valortotal numeric(14,2),
    CONSTRAINT itementradaserv_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.itementradaserv OWNER TO postgres;

--
-- Name: seq_itemsaidaprod_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_itemsaidaprod_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_itemsaidaprod_chave OWNER TO postgres;

--
-- Name: itemsaidaprod; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.itemsaidaprod (
    chave integer DEFAULT nextval('public.seq_itemsaidaprod_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chavesaida integer NOT NULL,
    chaveproduto integer NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    qtde numeric(14,3) DEFAULT 1 NOT NULL,
    valorunit numeric(14,2) DEFAULT 0 NOT NULL,
    valortotal numeric(14,2),
    CONSTRAINT itemsaidaprod_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.itemsaidaprod OWNER TO postgres;

--
-- Name: seq_itemsaidaserv_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_itemsaidaserv_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_itemsaidaserv_chave OWNER TO postgres;

--
-- Name: itemsaidaserv; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.itemsaidaserv (
    chave integer DEFAULT nextval('public.seq_itemsaidaserv_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chavesaida integer NOT NULL,
    chaveservico integer NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    qtde numeric(14,3) DEFAULT 1 NOT NULL,
    valorunit numeric(14,2) DEFAULT 0 NOT NULL,
    valortotal numeric(14,2),
    CONSTRAINT itemsaidaserv_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.itemsaidaserv OWNER TO postgres;

--
-- Name: seq_produtoestoque_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_produtoestoque_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_produtoestoque_chave OWNER TO postgres;

--
-- Name: produtoestoque; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produtoestoque (
    chave integer DEFAULT nextval('public.seq_produtoestoque_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chaveproduto integer NOT NULL,
    qteentrada numeric(14,3) DEFAULT 0 NOT NULL,
    qtdesaida numeric(14,3) DEFAULT 0 NOT NULL,
    qtdetotal numeric(14,3) GENERATED ALWAYS AS ((COALESCE(qteentrada, (0)::numeric) + COALESCE(qtdesaida, (0)::numeric))) STORED,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    chaveitementrada integer,
    qtentrada numeric(14,3) DEFAULT 0 NOT NULL,
    qtdtotal numeric(14,3) DEFAULT 0 NOT NULL,
    CONSTRAINT produtoestoque_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2]))),
    CONSTRAINT produtoestoque_qteentrada_check CHECK ((qteentrada >= (0)::numeric))
);


ALTER TABLE public.produtoestoque OWNER TO postgres;

--
-- Name: seq_produtos_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_produtos_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_produtos_chave OWNER TO postgres;

--
-- Name: seq_produtos_codigo; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_produtos_codigo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_produtos_codigo OWNER TO postgres;

--
-- Name: produtos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.produtos (
    chave integer DEFAULT nextval('public.seq_produtos_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    codigo integer DEFAULT nextval('public.seq_produtos_codigo'::regclass) NOT NULL,
    nome text NOT NULL,
    chaveemp integer,
    valorcompra numeric(14,2) NOT NULL,
    valorvenda numeric(14,2),
    obs text,
    categoria integer DEFAULT 1 NOT NULL,
    validade date,
    datahoracad timestamp without time zone DEFAULT now() NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_prod_preco_nonneg CHECK (((valorcompra >= (0)::numeric) AND ((valorvenda IS NULL) OR (valorvenda >= (0)::numeric)))),
    CONSTRAINT produtos_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.produtos OWNER TO postgres;

--
-- Name: seq_saidas_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_saidas_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_saidas_chave OWNER TO postgres;

--
-- Name: seq_saidas_codigo; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_saidas_codigo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_saidas_codigo OWNER TO postgres;

--
-- Name: saidas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saidas (
    chave integer DEFAULT nextval('public.seq_saidas_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    codigo integer DEFAULT nextval('public.seq_saidas_codigo'::regclass) NOT NULL,
    chaveclifor integer NOT NULL,
    datahoracad timestamp without time zone DEFAULT now() NOT NULL,
    obs text,
    total numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT saidas_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.saidas OWNER TO postgres;

--
-- Name: seq_servicos_chave; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_servicos_chave
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_servicos_chave OWNER TO postgres;

--
-- Name: seq_servicos_codigo; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seq_servicos_codigo
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seq_servicos_codigo OWNER TO postgres;

--
-- Name: servicoestoque; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicoestoque (
    chave integer NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    chaveservico integer NOT NULL,
    qteentrada numeric(14,3) DEFAULT 0 NOT NULL,
    qtdesaida numeric(14,3) DEFAULT 0 NOT NULL,
    qtdetotal numeric(14,3) DEFAULT 0 NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    chaveitementradaserv integer,
    CONSTRAINT servicoestoque_ativo_chk CHECK ((ativo = ANY (ARRAY[0, 1]))),
    CONSTRAINT servicoestoque_qtd_chk CHECK (((qteentrada >= (0)::numeric) AND (qtdesaida >= (0)::numeric)))
);


ALTER TABLE public.servicoestoque OWNER TO postgres;

--
-- Name: servicoestoque_chave_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.servicoestoque_chave_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.servicoestoque_chave_seq OWNER TO postgres;

--
-- Name: servicoestoque_chave_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.servicoestoque_chave_seq OWNED BY public.servicoestoque.chave;


--
-- Name: servicos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servicos (
    chave integer DEFAULT nextval('public.seq_servicos_chave'::regclass) NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    codigo integer DEFAULT nextval('public.seq_servicos_codigo'::regclass) NOT NULL,
    nome text NOT NULL,
    chaveemp integer,
    valorvenda numeric(14,2) NOT NULL,
    obs text,
    categoria integer DEFAULT 1 NOT NULL,
    validade date,
    datahoracad timestamp without time zone DEFAULT now() NOT NULL,
    datahoraalt timestamp without time zone DEFAULT now() NOT NULL,
    prazoentrega date,
    CONSTRAINT ck_serv_preco_nonneg CHECK ((valorvenda >= (0)::numeric)),
    CONSTRAINT servicos_ativo_check CHECK ((ativo = ANY (ARRAY[1, 2])))
);


ALTER TABLE public.servicos OWNER TO postgres;

--
-- Name: servicoestoque chave; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicoestoque ALTER COLUMN chave SET DEFAULT nextval('public.servicoestoque_chave_seq'::regclass);


--
-- Name: clifor clifor_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clifor
    ADD CONSTRAINT clifor_codigo_key UNIQUE (codigo);


--
-- Name: clifor clifor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clifor
    ADD CONSTRAINT clifor_pkey PRIMARY KEY (chave);


--
-- Name: cliforemp cliforemp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliforemp
    ADD CONSTRAINT cliforemp_pkey PRIMARY KEY (chave);


--
-- Name: empresa empresa_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_codigo_key UNIQUE (codigo);


--
-- Name: empresa empresa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresa
    ADD CONSTRAINT empresa_pkey PRIMARY KEY (chave);


--
-- Name: entradas entradas_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas
    ADD CONSTRAINT entradas_codigo_key UNIQUE (codigo);


--
-- Name: entradas entradas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas
    ADD CONSTRAINT entradas_pkey PRIMARY KEY (chave);


--
-- Name: itementradaprod itementradaprod_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itementradaprod
    ADD CONSTRAINT itementradaprod_pkey PRIMARY KEY (chave);


--
-- Name: itementradaserv itementradaserv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itementradaserv
    ADD CONSTRAINT itementradaserv_pkey PRIMARY KEY (chave);


--
-- Name: itemsaidaprod itemsaidaprod_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itemsaidaprod
    ADD CONSTRAINT itemsaidaprod_pkey PRIMARY KEY (chave);


--
-- Name: itemsaidaserv itemsaidaserv_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itemsaidaserv
    ADD CONSTRAINT itemsaidaserv_pkey PRIMARY KEY (chave);


--
-- Name: produtoestoque produtoestoque_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtoestoque
    ADD CONSTRAINT produtoestoque_pkey PRIMARY KEY (chave);


--
-- Name: produtos produtos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_codigo_key UNIQUE (codigo);


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (chave);


--
-- Name: saidas saidas_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saidas
    ADD CONSTRAINT saidas_codigo_key UNIQUE (codigo);


--
-- Name: saidas saidas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saidas
    ADD CONSTRAINT saidas_pkey PRIMARY KEY (chave);


--
-- Name: servicoestoque servicoestoque_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicoestoque
    ADD CONSTRAINT servicoestoque_pkey PRIMARY KEY (chave);


--
-- Name: servicos servicos_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_codigo_key UNIQUE (codigo);


--
-- Name: servicos servicos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (chave);


--
-- Name: idx_produtoestoque_chaveitementrada; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produtoestoque_chaveitementrada ON public.produtoestoque USING btree (chaveitementrada);


--
-- Name: idx_produtoestoque_chaveproduto; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_produtoestoque_chaveproduto ON public.produtoestoque USING btree (chaveproduto);


--
-- Name: idx_servicoestoque_chaveitementradaserv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicoestoque_chaveitementradaserv ON public.servicoestoque USING btree (chaveitementradaserv);


--
-- Name: idx_servicoestoque_chaveservico; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_servicoestoque_chaveservico ON public.servicoestoque USING btree (chaveservico);


--
-- Name: itementradaprod aiud_itementradaprod_estoque; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER aiud_itementradaprod_estoque AFTER INSERT OR DELETE OR UPDATE ON public.itementradaprod FOR EACH ROW EXECUTE FUNCTION public._after_itementradaprod_mut();


--
-- Name: itementradaserv aiud_itementradaserv_estoque; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER aiud_itementradaserv_estoque AFTER INSERT OR DELETE OR UPDATE ON public.itementradaserv FOR EACH ROW EXECUTE FUNCTION public._after_itementradaserv_mut();


--
-- Name: itemsaidaprod aiud_itemsaidaprod_estoque; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER aiud_itemsaidaprod_estoque AFTER INSERT OR DELETE OR UPDATE ON public.itemsaidaprod FOR EACH ROW EXECUTE FUNCTION public._after_itemsaidaprod_mut();


--
-- Name: itemsaidaserv aiud_itemsaidaserv_estoque; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER aiud_itemsaidaserv_estoque AFTER INSERT OR DELETE OR UPDATE ON public.itemsaidaserv FOR EACH ROW EXECUTE FUNCTION public._after_itemsaidaserv_mut();


--
-- Name: itementradaprod biu_itementradaprod_valor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER biu_itementradaprod_valor BEFORE INSERT OR UPDATE OF qtde, valorunit ON public.itementradaprod FOR EACH ROW EXECUTE FUNCTION public._calc_valortotal_items();


--
-- Name: itementradaserv biu_itementradaserv_valor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER biu_itementradaserv_valor BEFORE INSERT OR UPDATE OF qtde, valorunit ON public.itementradaserv FOR EACH ROW EXECUTE FUNCTION public._calc_valortotal_items();


--
-- Name: itemsaidaprod biu_itemsaidaprod_valor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER biu_itemsaidaprod_valor BEFORE INSERT OR UPDATE OF qtde, valorunit ON public.itemsaidaprod FOR EACH ROW EXECUTE FUNCTION public._calc_valortotal_items();


--
-- Name: itemsaidaserv biu_itemsaidaserv_valor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER biu_itemsaidaserv_valor BEFORE INSERT OR UPDATE OF qtde, valorunit ON public.itemsaidaserv FOR EACH ROW EXECUTE FUNCTION public._calc_valortotal_items();


--
-- Name: servicoestoque tbiu_servicoestoque_recalc; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tbiu_servicoestoque_recalc BEFORE INSERT OR UPDATE ON public.servicoestoque FOR EACH ROW EXECUTE FUNCTION public.trg_servicoestoque_recalc_total();


--
-- Name: clifor tg_clifor_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_clifor_upd BEFORE UPDATE ON public.clifor FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: cliforemp tg_cliforemp_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_cliforemp_upd BEFORE UPDATE ON public.cliforemp FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: empresa tg_empresa_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_empresa_upd BEFORE UPDATE ON public.empresa FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: entradas tg_entradas_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_entradas_upd BEFORE UPDATE ON public.entradas FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: itementradaprod tg_ieprod_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_ieprod_upd BEFORE UPDATE ON public.itementradaprod FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: itementradaserv tg_ieserv_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_ieserv_upd BEFORE UPDATE ON public.itementradaserv FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: itemsaidaprod tg_isprod_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_isprod_upd BEFORE UPDATE ON public.itemsaidaprod FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: itemsaidaserv tg_isserv_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_isserv_upd BEFORE UPDATE ON public.itemsaidaserv FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: produtoestoque tg_pestoque_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_pestoque_upd BEFORE UPDATE ON public.produtoestoque FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: produtos tg_produtos_before_insupd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_produtos_before_insupd BEFORE INSERT OR UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.trg_produtos_valorvenda_default();


--
-- Name: produtos tg_produtos_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_produtos_upd BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: saidas tg_saidas_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_saidas_upd BEFORE UPDATE ON public.saidas FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: servicos tg_servicos_upd; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tg_servicos_upd BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.trg_set_datahoraalt();


--
-- Name: cliforemp cliforemp_chaveclifor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliforemp
    ADD CONSTRAINT cliforemp_chaveclifor_fkey FOREIGN KEY (chaveclifor) REFERENCES public.clifor(chave) ON DELETE RESTRICT;


--
-- Name: cliforemp cliforemp_chaveemp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cliforemp
    ADD CONSTRAINT cliforemp_chaveemp_fkey FOREIGN KEY (chaveemp) REFERENCES public.empresa(chave) ON DELETE RESTRICT;


--
-- Name: entradas entradas_chaveclifor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entradas
    ADD CONSTRAINT entradas_chaveclifor_fkey FOREIGN KEY (chaveclifor) REFERENCES public.clifor(chave) ON DELETE RESTRICT;


--
-- Name: itementradaprod itementradaprod_chaveentrada_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itementradaprod
    ADD CONSTRAINT itementradaprod_chaveentrada_fkey FOREIGN KEY (chaveentrada) REFERENCES public.entradas(chave) ON DELETE CASCADE;


--
-- Name: itementradaprod itementradaprod_chaveproduto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itementradaprod
    ADD CONSTRAINT itementradaprod_chaveproduto_fkey FOREIGN KEY (chaveproduto) REFERENCES public.produtos(chave) ON DELETE RESTRICT;


--
-- Name: itementradaserv itementradaserv_chaveentrada_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itementradaserv
    ADD CONSTRAINT itementradaserv_chaveentrada_fkey FOREIGN KEY (chaveentrada) REFERENCES public.entradas(chave) ON DELETE CASCADE;


--
-- Name: itementradaserv itementradaserv_chaveservico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itementradaserv
    ADD CONSTRAINT itementradaserv_chaveservico_fkey FOREIGN KEY (chaveservico) REFERENCES public.servicos(chave) ON DELETE RESTRICT;


--
-- Name: itemsaidaprod itemsaidaprod_chaveproduto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itemsaidaprod
    ADD CONSTRAINT itemsaidaprod_chaveproduto_fkey FOREIGN KEY (chaveproduto) REFERENCES public.produtos(chave) ON DELETE RESTRICT;


--
-- Name: itemsaidaprod itemsaidaprod_chavesaida_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itemsaidaprod
    ADD CONSTRAINT itemsaidaprod_chavesaida_fkey FOREIGN KEY (chavesaida) REFERENCES public.saidas(chave) ON DELETE CASCADE;


--
-- Name: itemsaidaserv itemsaidaserv_chavesaida_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itemsaidaserv
    ADD CONSTRAINT itemsaidaserv_chavesaida_fkey FOREIGN KEY (chavesaida) REFERENCES public.saidas(chave) ON DELETE CASCADE;


--
-- Name: itemsaidaserv itemsaidaserv_chaveservico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.itemsaidaserv
    ADD CONSTRAINT itemsaidaserv_chaveservico_fkey FOREIGN KEY (chaveservico) REFERENCES public.servicos(chave) ON DELETE RESTRICT;


--
-- Name: produtoestoque produtoestoque_chaveitementrada_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtoestoque
    ADD CONSTRAINT produtoestoque_chaveitementrada_fk FOREIGN KEY (chaveitementrada) REFERENCES public.itementradaprod(chave) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: produtoestoque produtoestoque_chaveproduto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtoestoque
    ADD CONSTRAINT produtoestoque_chaveproduto_fkey FOREIGN KEY (chaveproduto) REFERENCES public.produtos(chave) ON DELETE CASCADE;


--
-- Name: produtos produtos_chaveemp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_chaveemp_fkey FOREIGN KEY (chaveemp) REFERENCES public.empresa(chave) ON DELETE SET NULL;


--
-- Name: saidas saidas_chaveclifor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saidas
    ADD CONSTRAINT saidas_chaveclifor_fkey FOREIGN KEY (chaveclifor) REFERENCES public.clifor(chave) ON DELETE RESTRICT;


--
-- Name: servicoestoque servicoestoque_chaveitementradaserv_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicoestoque
    ADD CONSTRAINT servicoestoque_chaveitementradaserv_fk FOREIGN KEY (chaveitementradaserv) REFERENCES public.itementradaserv(chave) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: servicoestoque servicoestoque_chaveservico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicoestoque
    ADD CONSTRAINT servicoestoque_chaveservico_fkey FOREIGN KEY (chaveservico) REFERENCES public.servicos(chave) ON DELETE CASCADE;


--
-- Name: servicos servicos_chaveemp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_chaveemp_fkey FOREIGN KEY (chaveemp) REFERENCES public.empresa(chave) ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

