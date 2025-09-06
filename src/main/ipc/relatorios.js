// src/main/ipc/relatorios.js
const { ipcMain } = require('electron');
const { Pool } = require('pg');
require('dotenv').config();

function buildPoolConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE || 'estamparia',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  };
}
const pool = new Pool(buildPoolConfig());

// util para WHERE condicional
function whereAnd(condList) {
  const list = condList.filter(Boolean);
  return list.length ? ' WHERE ' + list.join(' AND ') : '';
}

/**
 * REL 1 — Faturamento diário (somatório de SAÍDAS por dia).
 * params: { de:'YYYY-MM-DD', ate:'YYYY-MM-DD', chaveclifor?:number|null }
 */
ipcMain.handle('rel:fatdiario', async (_e, p = {}) => {
  const vals = [];
  const conds = ['s.ativo = 2'];

  if (p.de) { vals.push(p.de); conds.push(`s.datahoraalt::date >= $${vals.length}`); }
  if (p.ate){ vals.push(p.ate); conds.push(`s.datahoraalt::date <= $${vals.length}`); }
  if (p.chaveclifor){ vals.push(p.chaveclifor); conds.push(`s.chaveclifor = $${vals.length}`); }

  const sql = `
    SELECT s.datahoraalt::date AS dia, SUM(s.total) AS valor
      FROM saidas s
      ${whereAnd(conds)}
     GROUP BY 1
     ORDER BY 1
  `;
  const { rows } = await pool.query(sql, vals);
  return rows; // [{dia, valor}]
});

/**
 * REL 2 — Faturamento por cliente (somatório de SAÍDAS por cliente)
 * params: { de, ate }
 */
ipcMain.handle('rel:fatporcliente', async (_e, p = {}) => {
  const vals = [];
  const conds = ['s.ativo = 2'];

  if (p.de) { vals.push(p.de); conds.push(`s.datahoraalt::date >= $${vals.length}`); }
  if (p.ate){ vals.push(p.ate); conds.push(`s.datahoraalt::date <= $${vals.length}`); }

  const sql = `
    SELECT c.chave AS id, COALESCE(c.nome,'(sem nome)') AS cliente, SUM(s.total) AS valor
      FROM saidas s
      JOIN clientes c ON c.chave = s.chaveclifor
      ${whereAnd(conds)}
     GROUP BY c.chave, c.nome
     ORDER BY valor DESC, cliente ASC
  `;
  const { rows } = await pool.query(sql, vals);
  return rows; // [{id, cliente, valor}]
});

/**
 * REL 3 — Histórico comercial (itens vendidos no período)
 * Traz PRODUTOS + (se existir) SERVIÇOS.
 * params: { de, ate, chaveclifor?:number|null }
 */
ipcMain.handle('rel:historico', async (_e, p = {}) => {
  const vals = [];
  const conds = ['s.ativo = 2'];

  if (p.de) { vals.push(p.de); conds.push(`s.datahoraalt::date >= $${vals.length}`); }
  if (p.ate){ vals.push(p.ate); conds.push(`s.datahoraalt::date <= $${vals.length}`); }
  if (p.chaveclifor){ vals.push(p.chaveclifor); conds.push(`s.chaveclifor = $${vals.length}`); }

  const baseProd = `
    SELECT s.datahoraalt::date AS data,
           COALESCE(c.nome,'')   AS cliente,
           p.nome                AS descricao,
           ip.qtde               AS qtde,
           ip.valorunit          AS valorunit,
           ip.valortotal         AS valortotal
      FROM itemsaidaprod ip
      JOIN saidas s   ON s.chave = ip.chavesaida
      JOIN produtos p ON p.chave = ip.chaveproduto
      JOIN clientes c ON c.chave = s.chaveclifor
      ${whereAnd(conds)}
  `;
  const baseServ = `
    SELECT s.datahoraalt::date AS data,
           COALESCE(c.nome,'')   AS cliente,
           sv.nome               AS descricao,
           isv.qtde              AS qtde,
           isv.valorunit         AS valorunit,
           isv.valortotal        AS valortotal
      FROM itemsaidaserv isv
      JOIN saidas s    ON s.chave = isv.chavesaida
      JOIN servicos sv ON sv.chave = isv.chaveservico
      JOIN clientes c  ON c.chave = s.chaveclifor
      ${whereAnd(conds)}
  `;

  try {
    const { rows } = await pool.query(`${baseProd} UNION ALL ${baseServ} ORDER BY 1,2,3`, []);
    return rows;
  } catch {
    const { rows } = await pool.query(`${baseProd} ORDER BY 1,2,3`, []);
    return rows;
  }
});

/**
 * >>> NOVOS: Listagem de NOTAS (cabeçalhos) <<<
 * Usados para exibir os registros de Entrada/Saída nas telas de relatório.
 */

// Notas de SAÍDA (fechadas)
ipcMain.handle('rel:notas_saida', async (_e, p = {}) => {
  const vals = [];
  const conds = ['s.ativo = 2']; // somente finalizadas

  if (p.de) { vals.push(p.de); conds.push(`s.datahoraalt::date >= $${vals.length}`); }
  if (p.ate){ vals.push(p.ate); conds.push(`s.datahoraalt::date <= $${vals.length}`); }
  if (p.chaveclifor){ vals.push(p.chaveclifor); conds.push(`s.chaveclifor = $${vals.length}`); }

  const sql = `
    SELECT s.chave,
           s.datahoraalt,
           COALESCE(c.nome,'') AS cliente,
           COALESCE(s.obs,'')  AS obs,
           s.total
      FROM saidas s
      JOIN clientes c ON c.chave = s.chaveclifor
      ${whereAnd(conds)}
     ORDER BY s.datahoraalt ASC, s.chave ASC
  `;
  const { rows } = await pool.query(sql, vals);
  return rows; // [{chave, datahoraalt, cliente, obs, total}]
});

// Notas de ENTRADA (fechadas)
ipcMain.handle('rel:notas_entrada', async (_e, p = {}) => {
  const vals = [];
  const conds = ['e.ativo = 2']; // somente finalizadas

  if (p.de) { vals.push(p.de); conds.push(`e.datahoraalt::date >= $${vals.length}`); }
  if (p.ate){ vals.push(p.ate); conds.push(`e.datahoraalt::date <= $${vals.length}`); }
  if (p.chaveclifor){ vals.push(p.chaveclifor); conds.push(`e.chaveclifor = $${vals.length}`); }

  const sql = `
    SELECT e.chave,
           e.datahoraalt,
           COALESCE(c.nome,'') AS fornecedor,
           COALESCE(e.obs,'')  AS obs,
           e.total
      FROM entradas e
      JOIN clientes c ON c.chave = e.chaveclifor
      ${whereAnd(conds)}
     ORDER BY e.datahoraalt ASC, e.chave ASC
  `;
  const { rows } = await pool.query(sql, vals);
  return rows; // [{chave, datahoraalt, fornecedor, obs, total}]
});

