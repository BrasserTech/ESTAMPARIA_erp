-- ATENÇÃO: ESTE SCRIPT EXCLUIRÁ PERMANENTEMENTE TODOS OS DADOS E REINICIARÁ AS SEQUÊNCIAS.
-- FAÇA UM BACKUP COMPLETO DO BANCO DE DADOS ANTES DE EXECUTAR.

-- 1. Desabilita todos os triggers que podem causar erros de integridade.
ALTER TABLE itemsaidaprod DISABLE TRIGGER ALL;
ALTER TABLE itemsaidaserv DISABLE TRIGGER ALL;
ALTER TABLE itementradaprod DISABLE TRIGGER ALL;
ALTER TABLE itementradaserv DISABLE TRIGGER ALL;

-- 2. Exclui os dados das tabelas, respeitando as chaves estrangeiras.
DELETE FROM itemsaidaprod;
DELETE FROM itemsaidaserv;
DELETE FROM itementradaprod;
DELETE FROM itementradaserv;
DELETE FROM entradas;
DELETE FROM saidas;
DELETE FROM produtoestoque;
DELETE FROM servicoestoque;
DELETE FROM produtos;
DELETE FROM servicos;
DELETE FROM cliforemp;
DELETE FROM clifor;
DELETE FROM empresa;

-- 3. Reinicia todas as sequências para que a contagem seja zerada.
ALTER SEQUENCE seq_clifor_chave RESTART WITH 1;
ALTER SEQUENCE seq_clifor_codigo RESTART WITH 1;
ALTER SEQUENCE seq_cliforemp_chave RESTART WITH 1;
ALTER SEQUENCE seq_empresa_chave RESTART WITH 1;
ALTER SEQUENCE seq_empresa_codigo RESTART WITH 1;
ALTER SEQUENCE seq_entradas_chave RESTART WITH 1;
ALTER SEQUENCE seq_entradas_codigo RESTART WITH 1;
ALTER SEQUENCE seq_itementradaprod_chave RESTART WITH 1;
ALTER SEQUENCE seq_itementradaserv_chave RESTART WITH 1;
ALTER SEQUENCE seq_itemsaidaprod_chave RESTART WITH 1;
ALTER SEQUENCE seq_itemsaidaserv_chave RESTART WITH 1;
ALTER SEQUENCE seq_produtoestoque_chave RESTART WITH 1;
ALTER SEQUENCE seq_produtos_chave RESTART WITH 1;
ALTER SEQUENCE seq_produtos_codigo RESTART WITH 1;
ALTER SEQUENCE seq_saidas_chave RESTART WITH 1;
ALTER SEQUENCE seq_saidas_codigo RESTART WITH 1;
ALTER SEQUENCE seq_servicos_chave RESTART WITH 1;
ALTER SEQUENCE seq_servicos_codigo RESTART WITH 1;
ALTER SEQUENCE servicoestoque_chave_seq RESTART WITH 1;

-- 4. Reabilita os triggers.
ALTER TABLE itemsaidaprod ENABLE TRIGGER ALL;
ALTER TABLE itemsaidaserv ENABLE TRIGGER ALL;
ALTER TABLE itementradaprod ENABLE TRIGGER ALL;
ALTER TABLE itementradaserv ENABLE TRIGGER ALL;