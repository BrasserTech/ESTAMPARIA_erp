// src/main/ipc/dashboard.js
const { ipcMain } = require('electron');
const { query } = require('../../database');

// KPIs (total de entradas, total de saídas, saldo) nos últimos N meses (padrão: 6)
ipcMain.handle('dashboard:kpis', async (_evt, { months = 6 } = {}) => {
  const n = Math.max(1, Math.min(24, Number(months) || 6));
  const sql = `
    WITH periodo AS (
      SELECT date_trunc('month', NOW()) - ($1::int - 1) * interval '1 month' AS inicio,
             (date_trunc('month', NOW()) + interval '1 month')::date AS fim
    )
    SELECT
      (SELECT COALESCE(SUM(total),0) FROM entradas  e, periodo p WHERE e.datahoracad >= p.inicio AND e.datahoracad < p.fim) AS total_entradas,
      (SELECT COALESCE(SUM(total),0) FROM saidas    s, periodo p WHERE s.datahoracad >= p.inicio AND s.datahoracad < p.fim) AS total_saidas
  `;
  const { rows } = await query(sql, [n]);
  const { total_entradas, total_saidas } = rows[0];
  const saldo = Number(total_saidas) - Number(total_entradas);
  return { total_entradas, total_saidas, saldo };
});

// Série mensal: Entradas x Saídas (últimos N meses)
ipcMain.handle('dashboard:fin-mensal', async (_evt, { months = 6 } = {}) => {
  const n = Math.max(1, Math.min(24, Number(months) || 6));
  const sql = `
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', NOW()) - ($1::int - 1) * interval '1 month',
        date_trunc('month', NOW()),
        interval '1 month'
      ) AS mes
    ),
    e AS (
      SELECT date_trunc('month', datahoracad) m, SUM(total) total
        FROM entradas
       GROUP BY 1
    ),
    s AS (
      SELECT date_trunc('month', datahoracad) m, SUM(total) total
        FROM saidas
       GROUP BY 1
    )
    SELECT
      to_char(m.mes, 'YYYY-MM') AS ym,
      COALESCE(e.total, 0) AS entradas,
      COALESCE(s.total, 0) AS saidas
    FROM meses m
    LEFT JOIN e ON e.m = m.mes
    LEFT JOIN s ON s.m = m.mes
    ORDER BY m.mes;
  `;
  const { rows } = await query(sql, [n]);
  return rows; // [{ym, entradas, saidas}]
});

// Top N clientes por faturamento no período
ipcMain.handle('dashboard:top-clientes', async (_evt, { limit = 5, months = 6 } = {}) => {
  const lim = Math.max(1, Math.min(20, Number(limit) || 5));
  const n = Math.max(1, Math.min(36, Number(months) || 6));
  const sql = `
    WITH periodo AS (
      SELECT date_trunc('month', NOW()) - ($1::int - 1) * interval '1 month' AS inicio,
             (date_trunc('month', NOW()) + interval '1 month')::date AS fim
    )
    SELECT c.nome, COALESCE(SUM(s.total),0) AS faturamento
      FROM saidas s
      JOIN clifor c ON c.chave = s.chaveclifor
      JOIN periodo p ON s.datahoracad >= p.inicio AND s.datahoracad < p.fim
     GROUP BY c.nome
     ORDER BY faturamento DESC, c.nome
     LIMIT $2
  `;
  const { rows } = await query(sql, [n, lim]);
  return rows; // [{nome, faturamento}]
});
