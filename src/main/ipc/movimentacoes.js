// src/main/ipc/movimentacoes.js
const { ipcMain, dialog, BrowserWindow } = require('electron');
const { Pool } = require('pg');
require('dotenv').config();

/* ---------------- DB POOL ---------------- */
function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  const cfg = {
    host: process.env.PGHOST || '127.0.0.1',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE || 'estamparia',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  };
  return cfg;
}
const pool = new Pool(buildPoolConfig());

async function pingOrExplain() {
  try {
    const c = await pool.connect();
    await c.query('SELECT 1');
    c.release();
  } catch (err) {
    const msg =
      'Falha ao conectar no PostgreSQL.\n' +
      'Verifique suas variáveis de ambiente (.env) ou crie a role/usuário apropriado.\n\n' +
      `Detalhe: ${err.message}`;
    console.error('[DB-CONNECT-ERROR]', err);
    try {
      const win = BrowserWindow.getAllWindows()[0];
      dialog.showErrorBox('Banco de Dados', msg);
    } catch {}
    throw err;
  }
}
pingOrExplain().catch(() => {});

/* Aux de transação */
async function withTx(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await work(client);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/* ===========================================================
   ENTRADAS (cabeçalho)
   =========================================================== */
ipcMain.handle('movs:entrada:ensure', async (_e, { chaveclifor, ativo = 1 }) => {
  if (!chaveclifor) throw new Error('chaveclifor obrigatório.');
  return withTx(async (cx) => {
    const pick = await cx.query(
      `SELECT chave FROM entradas WHERE ativo = 1 AND chaveclifor = $1 ORDER BY chave DESC LIMIT 1`,
      [chaveclifor]
    );
    if (pick.rowCount > 0) return { chave: pick.rows[0].chave };

    const ins = await cx.query(
      `INSERT INTO entradas (ativo, chaveclifor, obs, total)
       VALUES (1, $1, NULL, 0)
       RETURNING chave`,
      [chaveclifor]
    );
    return { chave: ins.rows[0].chave };
  });
});

/* ENTRADA – ITENS: PRODUTOS */
ipcMain.handle('movs:entrada:addProd', async (_e, { chaveentrada, chaveproduto, qtde, valorunit }) => {
  if (!chaveentrada) throw new Error('chaveentrada obrigatório.');
  if (!chaveproduto) throw new Error('chaveproduto obrigatório.');
  if (!(qtde > 0)) throw new Error('qtde inválida.');
  if (valorunit == null || valorunit < 0) throw new Error('valorunit inválido.');

  const { rows } = await pool.query(
    `INSERT INTO itementradaprod (ativo, chaveentrada, chaveproduto, qtde, valorunit)
     VALUES (1, $1, $2, $3, $4)
     RETURNING chave, valorunit, valortotal`,
    [chaveentrada, chaveproduto, qtde, valorunit]
  );
  return { chave: rows[0].chave, valorunit: rows[0].valorunit, valortotal: rows[0].valortotal };
});

ipcMain.handle('movs:entrada:remProd', async (_e, { itementradaprod_chave }) => {
  if (!itementradaprod_chave) throw new Error('chave do item obrigatória.');
  await pool.query(`DELETE FROM itementradaprod WHERE chave = $1`, [itementradaprod_chave]);
  return { ok: true };
});

/* ENTRADA – ITENS: SERVIÇOS */
ipcMain.handle('movs:entrada:addServ', async (_e, { chaveentrada, chaveservico, qtde, valorunit }) => {
  if (!chaveentrada) throw new Error('chaveentrada obrigatório.');
  if (!chaveservico) throw new Error('chaveservico obrigatório.');
  if (!(qtde > 0)) throw new Error('qtde inválida.');
  if (valorunit == null || valorunit < 0) throw new Error('valorunit inválido.');

  const { rows } = await pool.query(
    `INSERT INTO itementradaserv (ativo, chaveentrada, chaveservico, qtde, valorunit)
     VALUES (1, $1, $2, $3, $4)
     RETURNING chave, valorunit, valortotal`,
    [chaveentrada, chaveservico, qtde, valorunit]
  );
  return { chave: rows[0].chave, valorunit: rows[0].valorunit, valortotal: rows[0].valortotal };
});

ipcMain.handle('movs:entrada:remServ', async (_e, { itementradaserv_chave }) => {
  if (!itementradaserv_chave) throw new Error('chave do item obrigatória.');
  await pool.query(`DELETE FROM itementradaserv WHERE chave = $1`, [itementradaserv_chave]);
  return { ok: true };
});

/* ENTRADAS – FINALIZAR */
ipcMain.handle('movs:entrada:finalizar', async (_e, { chaveentrada, chaveclifor, obs }) => {
  if (!chaveentrada) throw new Error('chaveentrada obrigatório.');
  if (!chaveclifor) throw new Error('chaveclifor obrigatório.');

  return withTx(async (cx) => {
    const hdr = await cx.query(`SELECT chave, chaveclifor FROM entradas WHERE chave=$1`, [chaveentrada]);
    if (hdr.rowCount === 0) throw new Error('Entrada não encontrada.');
    if (Number(hdr.rows[0].chaveclifor) !== Number(chaveclifor))
      throw new Error('Cabeçalho não pertence ao fornecedor informado.');

    const totProd = await cx.query(
      `SELECT COALESCE(SUM(valortotal), 0) AS total FROM itementradaprod WHERE chaveentrada = $1`,
      [chaveentrada]
    );
    const totServ = await cx.query(
      `SELECT COALESCE(SUM(valortotal), 0) AS total FROM itementradaserv WHERE chaveentrada = $1`,
      [chaveentrada]
    );
    const total = Number(totProd.rows[0].total || 0) + Number(totServ.rows[0].total || 0);

    await cx.query(
      `UPDATE entradas
          SET obs = $2,
              total = $3,
              ativo = 2,
              datahoraalt = NOW()
        WHERE chave = $1`,
      [chaveentrada, obs ?? null, total]
    );

    return { chave: chaveentrada, total, ativo: 2 };
  });
});

/* ===========================================================
   SAÍDAS (cabeçalho + itens)  —  ADIÇÃO
   =========================================================== */
ipcMain.handle('movs:saida:ensure', async (_e, { chaveclifor, ativo = 1 }) => {
  if (!chaveclifor) throw new Error('chaveclifor obrigatório.');
  return withTx(async (cx) => {
    const pick = await cx.query(
      `SELECT chave FROM saidas WHERE ativo = 1 AND chaveclifor = $1 ORDER BY chave DESC LIMIT 1`,
      [chaveclifor]
    );
    if (pick.rowCount > 0) return { chave: pick.rows[0].chave };

    const ins = await cx.query(
      `INSERT INTO saidas (ativo, chaveclifor, obs, total)
       VALUES (1, $1, NULL, 0)
       RETURNING chave`,
      [chaveclifor]
    );
    return { chave: ins.rows[0].chave };
  });
});

ipcMain.handle('movs:saida:addProd', async (_e, { chavesaida, chaveproduto, qtde, valorunit }) => {
  if (!chavesaida) throw new Error('chavesaida obrigatório.');
  if (!chaveproduto) throw new Error('chaveproduto obrigatório.');
  if (!(qtde > 0)) throw new Error('qtde inválida.');
  if (valorunit == null || valorunit < 0) throw new Error('valorunit inválido.');

  const { rows } = await pool.query(
    `INSERT INTO itemsaidaprod (ativo, chavesaida, chaveproduto, qtde, valorunit)
     VALUES (1, $1, $2, $3, $4)
     RETURNING chave, valorunit, valortotal`,
    [chavesaida, chaveproduto, qtde, valorunit]
  );
  return { chave: rows[0].chave, valorunit: rows[0].valorunit, valortotal: rows[0].valortotal };
});

ipcMain.handle('movs:saida:remProd', async (_e, { itemsaidaprod_chave }) => {
  if (!itemsaidaprod_chave) throw new Error('chave do item obrigatória.');
  await pool.query(`DELETE FROM itemsaidaprod WHERE chave = $1`, [itemsaidaprod_chave]);
  return { ok: true };
});

ipcMain.handle('movs:saida:addServ', async (_e, { chavesaida, chaveservico, qtde, valorunit }) => {
  if (!chavesaida) throw new Error('chavesaida obrigatório.');
  if (!chaveservico) throw new Error('chaveservico obrigatório.');
  if (!(qtde > 0)) throw new Error('qtde inválida.');
  if (valorunit == null || valorunit < 0) throw new Error('valorunit inválido.');

  const { rows } = await pool.query(
    `INSERT INTO itemsaidaserv (ativo, chavesaida, chaveservico, qtde, valorunit)
     VALUES (1, $1, $2, $3, $4)
     RETURNING chave, valorunit, valortotal`,
    [chavesaida, chaveservico, qtde, valorunit]
  );
  return { chave: rows[0].chave, valorunit: rows[0].valorunit, valortotal: rows[0].valortotal };
});

ipcMain.handle('movs:saida:remServ', async (_e, { itemsaidaserv_chave }) => {
  if (!itemsaidaserv_chave) throw new Error('chave do item obrigatória.');
  await pool.query(`DELETE FROM itemsaidaserv WHERE chave = $1`, [itemsaidaserv_chave]);
  return { ok: true };
});

ipcMain.handle('movs:saida:finalizar', async (_e, { chavesaida, chaveclifor, obs }) => {
  if (!chavesaida) throw new Error('chavesaida obrigatório.');
  if (!chaveclifor) throw new Error('chaveclifor obrigatório.');

  return withTx(async (cx) => {
    const hdr = await cx.query(`SELECT chave, chaveclifor FROM saidas WHERE chave=$1`, [chavesaida]);
    if (hdr.rowCount === 0) throw new Error('Saída não encontrada.');
    if (Number(hdr.rows[0].chaveclifor) !== Number(chaveclifor))
      throw new Error('Cabeçalho não pertence ao cliente informado.');

    const totProd = await cx.query(
      `SELECT COALESCE(SUM(valortotal), 0) AS total FROM itemsaidaprod WHERE chavesaida = $1`,
      [chavesaida]
    );
    const totServ = await cx.query(
      `SELECT COALESCE(SUM(valortotal), 0) AS total FROM itemsaidaserv WHERE chavesaida = $1`,
      [chavesaida]
    );
    const total = Number(totProd.rows[0].total || 0) + Number(totServ.rows[0].total || 0);

    await cx.query(
      `UPDATE saidas
          SET obs = $2,
              total = $3,
              ativo = 2
        WHERE chave = $1`,
      [chavesaida, obs ?? null, total]
    );

    return { chave: chavesaida, total, ativo: 2 };
  });
});

/* ===========================================================
   RELATÓRIOS — ADIÇÃO
   =========================================================== */

/** 1) Entradas por período / fornecedor (lista + resumo por fornecedor) */
ipcMain.handle('reports:entradasPorFornecedor', async (_e, { dtIni, dtFim, fornecedorId }) => {
  // dtFim exclusivo (add 1 dia no renderer, se preferir)
  const params = [dtIni, dtFim];
  let where = `e.datahoracad >= $1 AND e.datahoracad < $2`;
  if (fornecedorId) {
    params.push(fornecedorId);
    where += ` AND e.chaveclifor = $${params.length}`;
  }

  const rows = await pool.query(
    `
    SELECT e.chave, e.datahoracad::timestamp AS data, c.nome AS fornecedor, e.total
      FROM entradas e
      JOIN clifor c ON c.chave = e.chaveclifor
     WHERE ${where}
     ORDER BY e.datahoracad DESC, e.chave DESC
    `,
    params
  );

  const resumo = await pool.query(
    `
    SELECT c.nome AS fornecedor, SUM(e.total) AS total
      FROM entradas e
      JOIN clifor c ON c.chave = e.chaveclifor
     WHERE ${where}
     GROUP BY c.nome
     ORDER BY c.nome
    `,
    params
  );

  return { rows: rows.rows, resumo: resumo.rows };
});

/** 2) Saídas por período / cliente (lista + resumo por cliente) */
ipcMain.handle('reports:saidasPorCliente', async (_e, { dtIni, dtFim, clienteId }) => {
  const params = [dtIni, dtFim];
  let where = `s.datahoracad >= $1 AND s.datahoracad < $2`;
  if (clienteId) {
    params.push(clienteId);
    where += ` AND s.chaveclifor = $${params.length}`;
  }

  const rows = await pool.query(
    `
    SELECT s.chave, s.datahoracad::timestamp AS data, c.nome AS cliente, s.total
      FROM saidas s
      JOIN clifor c ON c.chave = s.chaveclifor
     WHERE ${where}
     ORDER BY s.datahoracad DESC, s.chave DESC
    `,
    params
  );

  const resumo = await pool.query(
    `
    SELECT c.nome AS cliente, SUM(s.total) AS total
      FROM saidas s
      JOIN clifor c ON c.chave = s.chaveclifor
     WHERE ${where}
     GROUP BY c.nome
     ORDER BY c.nome
    `,
    params
  );

  return { rows: rows.rows, resumo: resumo.rows };
});

/** 3) Movimento de Produtos (entradas x saídas) por período e empresa (opcional) */
ipcMain.handle('reports:movProdutos', async (_e, { dtIni, dtFim, empresaId }) => {
  const paramsBase = [dtIni, dtFim];
  const clausesProd = [];
  if (empresaId) {
    paramsBase.push(empresaId);
    clausesProd.push(`p.chaveemp = $${paramsBase.length}`);
  }

  const sql = `
    WITH en AS (
      SELECT i.chaveproduto, SUM(i.qtde) qt_en, SUM(i.valortotal) vt_en
        FROM itementradaprod i
        JOIN entradas e ON e.chave = i.chaveentrada
       WHERE e.datahoracad >= $1 AND e.datahoracad < $2
       GROUP BY i.chaveproduto
    ),
    sa AS (
      SELECT i.chaveproduto, SUM(i.qtde) qt_sa, SUM(i.valortotal) vt_sa
        FROM itemsaidaprod i
        JOIN saidas s ON s.chave = i.chavesaida
       WHERE s.datahoracad >= $1 AND s.datahoracad < $2
       GROUP BY i.chaveproduto
    )
    SELECT p.chave, p.nome,
           COALESCE(en.qt_en,0) AS qt_entrada,
           COALESCE(sa.qt_sa,0) AS qt_saida,
           COALESCE(en.qt_en,0) - COALESCE(sa.qt_sa,0) AS saldo_qt,
           COALESCE(en.vt_en,0) AS vlr_entradas,
           COALESCE(sa.vt_sa,0) AS vlr_saidas
      FROM produtos p
      LEFT JOIN en ON en.chaveproduto = p.chave
      LEFT JOIN sa ON sa.chaveproduto = p.chave
     WHERE (COALESCE(en.qt_en,0) + COALESCE(sa.qt_sa,0)) > 0
       ${clausesProd.length ? `AND ${clausesProd.join(' AND ')}` : ''}
     ORDER BY p.nome
  `;
  const rows = await pool.query(sql, paramsBase);
  return { rows: rows.rows };
});

/** 4) Faturamento mensal por empresa (Produtos + Serviços) */
ipcMain.handle('reports:faturamentoMensal', async (_e, { dtIni, dtFim, empresaId }) => {
  const params = [dtIni, dtFim];
  let filtroEmp = '';
  if (empresaId) {
    params.push(empresaId);
    filtroEmp = `AND (p.chaveemp = $3 OR sv.chaveemp = $3)`;
  }

  const sql = `
    WITH base AS (
      SELECT s.datahoracad::date AS dia, i.valortotal AS total, p.chaveemp AS emp
        FROM saidas s
        JOIN itemsaidaprod i ON i.chavesaida = s.chave
        JOIN produtos p ON p.chave = i.chaveproduto
       WHERE s.datahoracad >= $1 AND s.datahoracad < $2
      UNION ALL
      SELECT s.datahoracad::date AS dia, i.valortotal AS total, sv.chaveemp AS emp
        FROM saidas s
        JOIN itemsaidaserv i ON i.chavesaida = s.chave
        JOIN servicos sv ON sv.chave = i.chaveservico
       WHERE s.datahoracad >= $1 AND s.datahoracad < $2
    )
    SELECT date_trunc('month', b.dia)::date AS mes,
           e.chave AS chaveemp,
           e.nome  AS empresa,
           SUM(b.total) AS total
      FROM base b
      LEFT JOIN empresa e ON e.chave = b.emp
     WHERE 1=1
       ${empresaId ? 'AND b.emp = $3' : ''}
     GROUP BY 1,2,3
     ORDER BY 1, 3
  `;
  const rows = await pool.query(sql, params);
  return { rows: rows.rows };
});

/* ===================== CONSULTAS: ENTRADAS ===================== */
ipcMain.handle('consulta:entradas:listar', async (_e, { dtIni, dtFim, fornecedorId, ativo }) => {
  const params = [dtIni, dtFim];
  let where = `e.datahoracad >= $1 AND e.datahoracad < $2`;
  if (fornecedorId) { params.push(fornecedorId); where += ` AND e.chaveclifor = $${params.length}`; }
  if (ativo)        { params.push(ativo);        where += ` AND e.ativo = $${params.length}`; }

  const rows = await pool.query(
    `
    SELECT e.chave, e.datahoracad AS data, e.total, e.ativo,
           c.nome AS fornecedor
      FROM entradas e
      JOIN clifor c ON c.chave = e.chaveclifor
     WHERE ${where}
     ORDER BY e.datahoracad DESC, e.chave DESC
    `,
    params
  );
  return { rows: rows.rows };
});

ipcMain.handle('consulta:entradas:itens', async (_e, { chaveentrada }) => {
  if (!chaveentrada) throw new Error('chaveentrada obrigatório.');
  const { rows } = await pool.query(
    `
    SELECT 'PROD' AS tipo, p.nome AS item, i.qtde, i.valorunit, i.valortotal
      FROM itementradaprod i
      JOIN produtos p ON p.chave = i.chaveproduto
     WHERE i.chaveentrada = $1
    UNION ALL
    SELECT 'SERV' AS tipo, s.nome AS item, i.qtde, i.valorunit, i.valortotal
      FROM itementradaserv i
      JOIN servicos s ON s.chave = i.chaveservico
     WHERE i.chaveentrada = $1
     ORDER BY 1, 2
    `,
    [chaveentrada]
  );
  return { rows };
});

/* ===================== CONSULTAS: SAÍDAS ===================== */
ipcMain.handle('consulta:saidas:listar', async (_e, { dtIni, dtFim, clienteId, ativo }) => {
  const params = [dtIni, dtFim];
  let where = `s.datahoracad >= $1 AND s.datahoracad < $2`;
  if (clienteId)  { params.push(clienteId); where += ` AND s.chaveclifor = $${params.length}`; }
  if (ativo)      { params.push(ativo);     where += ` AND s.ativo = $${params.length}`; } // se não tiver col "ativo" em saidas, remova esta linha

  const rows = await pool.query(
    `
    SELECT s.chave, s.datahoracad AS data, s.total, s.ativo,
           c.nome AS cliente
      FROM saidas s
      JOIN clifor c ON c.chave = s.chaveclifor
     WHERE ${where}
     ORDER BY s.datahoracad DESC, s.chave DESC
    `,
    params
  );
  return { rows: rows.rows };
});

ipcMain.handle('consulta:saidas:itens', async (_e, { chavesaida }) => {
  if (!chavesaida) throw new Error('chavesaida obrigatório.');
  const { rows } = await pool.query(
    `
    SELECT 'PROD' AS tipo, p.nome AS item, i.qtde, i.valorunit, i.valortotal
      FROM itemsaidaprod i
      JOIN produtos p ON p.chave = i.chaveproduto
     WHERE i.chavesaida = $1
    UNION ALL
    SELECT 'SERV' AS tipo, s.nome AS item, i.qtde, i.valorunit, i.valortotal
      FROM itemsaidaserv i
      JOIN servicos s ON s.chave = i.chaveservico
     WHERE i.chavesaida = $1
     ORDER BY 1, 2
    `,
    [chavesaida]
  );
  return { rows };
});

// ===================== RELATÓRIOS (apenas adições) =====================
/**
 * Filtros esperados (todos opcionais):
 * {
 *   dtini: '2025-01-01', dtfim: '2025-01-31',
 *   cliforId: 123,           // cliente ou fornecedor, conforme o relatório
 *   produtoId: 45,           // filtra itens de produto
 *   servicoId: 9,            // filtra itens de serviço
 *   limit: 20                // ranking
 * }
 *
 * Observação: usamos datahoraalt do cabeçalho (entradas/saidas) para o período.
 */

const fmtDate = (d) => (d ? new Date(d) : null);

/** LUCRO MENSAL: vendas(saídas) - compras(entradas), agrupado por AAAA-MM */
ipcMain.handle('reports:lucroMensal', async (_e, raw) => {
  const p = Object.assign(
    { dtini: null, dtfim: null, cliforId: null, produtoId: null, servicoId: null },
    raw || {}
  );

  const dtini = fmtDate(p.dtini) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dtfim = fmtDate(p.dtfim) || new Date();

  const params = [
    dtini, dtfim,
    p.cliforId || null,
    p.produtoId || null,
    p.servicoId || null
  ];

  const qEntradas = `
    WITH p AS (
      SELECT to_char(e.datahoraalt::date,'YYYY-MM') ym, SUM(ep.valortotal) total
      FROM entradas e
      JOIN itementradaprod ep ON ep.chaveentrada = e.chave
      WHERE e.ativo = 2
        AND e.datahoraalt BETWEEN $1 AND $2
        AND ($3::int IS NULL OR e.chaveclifor = $3)
        AND ($4::int IS NULL OR ep.chaveproduto = $4)
      GROUP BY 1
    ),
    s AS (
      SELECT to_char(e.datahoraalt::date,'YYYY-MM') ym, SUM(es.valortotal) total
      FROM entradas e
      JOIN itementradaserv es ON es.chaveentrada = e.chave
      WHERE e.ativo = 2
        AND e.datahoraalt BETWEEN $1 AND $2
        AND ($3::int IS NULL OR e.chaveclifor = $3)
        AND ($5::int IS NULL OR es.chaveservico = $5)
      GROUP BY 1
    )
    SELECT m.ym,
           COALESCE(p.total,0)::numeric(14,2) AS total_prod,
           COALESCE(s.total,0)::numeric(14,2) AS total_serv,
           (COALESCE(p.total,0)+COALESCE(s.total,0))::numeric(14,2) AS compras
    FROM (SELECT COALESCE(p.ym,s.ym) ym FROM p FULL OUTER JOIN s USING (ym)) m
    LEFT JOIN p USING (ym)
    LEFT JOIN s USING (ym)
    ORDER BY m.ym;
  `;

  const qSaidas = `
    WITH p AS (
      SELECT to_char(s.datahoraalt::date,'YYYY-MM') ym, SUM(sp.valortotal) total
      FROM saidas s
      JOIN itemsaidaprod sp ON sp.chavesaida = s.chave
      WHERE s.ativo = 2
        AND s.datahoraalt BETWEEN $1 AND $2
        AND ($3::int IS NULL OR s.chaveclifor = $3)
        AND ($4::int IS NULL OR sp.chaveproduto = $4)
      GROUP BY 1
    ),
    s2 AS (
      SELECT to_char(s.datahoraalt::date,'YYYY-MM') ym, SUM(ss.valortotal) total
      FROM saidas s
      JOIN itemsaidaserv ss ON ss.chavesaida = s.chave
      WHERE s.ativo = 2
        AND s.datahoraalt BETWEEN $1 AND $2
        AND ($3::int IS NULL OR s.chaveclifor = $3)
        AND ($5::int IS NULL OR ss.chaveservico = $5)
      GROUP BY 1
    )
    SELECT m.ym,
           COALESCE(p.total,0)::numeric(14,2) AS total_prod,
           COALESCE(s2.total,0)::numeric(14,2) AS total_serv,
           (COALESCE(p.total,0)+COALESCE(s2.total,0))::numeric(14,2) AS vendas
    FROM (SELECT COALESCE(p.ym,s2.ym) ym FROM p FULL OUTER JOIN s2 USING (ym)) m
    LEFT JOIN p USING (ym)
    LEFT JOIN s2 USING (ym)
    ORDER BY m.ym;
  `;

  const { rows: rowsEntr } = await pool.query(qEntradas, params);
  const { rows: rowsSaid } = await pool.query(qSaidas, params);

  // Merge por ym
  const map = new Map();
  rowsEntr.forEach(r => {
    map.set(r.ym, { ym: r.ym, compras: Number(r.compras || 0), vendas: 0 });
  });
  rowsSaid.forEach(r => {
    const ex = map.get(r.ym) || { ym: r.ym, compras: 0, vendas: 0 };
    ex.vendas = Number(r.vendas || 0);
    map.set(r.ym, ex);
  });

  const data = Array.from(map.values())
    .sort((a,b)=>a.ym.localeCompare(b.ym))
    .map(r => ({
      ym: r.ym,
      compras: Number(r.compras.toFixed(2)),
      vendas: Number(r.vendas.toFixed(2)),
      lucro: Number((r.vendas - r.compras).toFixed(2))
    }));

  const totais = data.reduce((acc, r) => {
    acc.compras += r.compras;
    acc.vendas  += r.vendas;
    acc.lucro   += r.lucro;
    return acc;
  }, { compras:0, vendas:0, lucro:0 });

  return { rows: data, totais };
});


/** ENTRADAS DETALHADAS (prod + serv) */
ipcMain.handle('reports:entradasDetalhe', async (_e, raw) => {
  const p = Object.assign({ dtini:null, dtfim:null, cliforId:null, produtoId:null, servicoId:null }, raw || {});
  const dtini = fmtDate(p.dtini) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dtfim = fmtDate(p.dtfim) || new Date();
  const params = [dtini, dtfim, p.cliforId || null, p.produtoId || null, p.servicoId || null];

  const sql = `
    SELECT e.chave AS mov, e.datahoraalt::date AS data, e.chaveclifor AS clifor,
           'PROD' AS tipo, ep.chaveproduto AS item_id,
           ep.qtde, ep.valorunit, ep.valortotal
    FROM entradas e
    JOIN itementradaprod ep ON ep.chaveentrada = e.chave
    WHERE e.ativo = 2 AND e.datahoraalt BETWEEN $1 AND $2
      AND ($3::int IS NULL OR e.chaveclifor = $3)
      AND ($4::int IS NULL OR ep.chaveproduto = $4)

    UNION ALL

    SELECT e.chave AS mov, e.datahoraalt::date AS data, e.chaveclifor AS clifor,
           'SERV' AS tipo, es.chaveservico AS item_id,
           es.qtde, es.valorunit, es.valortotal
    FROM entradas e
    JOIN itementradaserv es ON es.chaveentrada = e.chave
    WHERE e.ativo = 2 AND e.datahoraalt BETWEEN $1 AND $2
      AND ($3::int IS NULL OR e.chaveclifor = $3)
      AND ($5::int IS NULL OR es.chaveservico = $5)

    ORDER BY data, mov;
  `;
  const { rows } = await pool.query(sql, params);
  return { rows };
});


/** SAÍDAS DETALHADAS (prod + serv) */
ipcMain.handle('reports:saidasDetalhe', async (_e, raw) => {
  const p = Object.assign({ dtini:null, dtfim:null, cliforId:null, produtoId:null, servicoId:null }, raw || {});
  const dtini = fmtDate(p.dtini) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dtfim = fmtDate(p.dtfim) || new Date();
  const params = [dtini, dtfim, p.cliforId || null, p.produtoId || null, p.servicoId || null];

  const sql = `
    SELECT s.chave AS mov, s.datahoraalt::date AS data, s.chaveclifor AS clifor,
           'PROD' AS tipo, sp.chaveproduto AS item_id,
           sp.qtde, sp.valorunit, sp.valortotal
    FROM saidas s
    JOIN itemsaidaprod sp ON sp.chavesaida = s.chave
    WHERE s.ativo = 2 AND s.datahoraalt BETWEEN $1 AND $2
      AND ($3::int IS NULL OR s.chaveclifor = $3)
      AND ($4::int IS NULL OR sp.chaveproduto = $4)

    UNION ALL

    SELECT s.chave AS mov, s.datahoraalt::date AS data, s.chaveclifor AS clifor,
           'SERV' AS tipo, ss.chaveservico AS item_id,
           ss.qtde, ss.valorunit, ss.valortotal
    FROM saidas s
    JOIN itemsaidaserv ss ON ss.chavesaida = s.chave
    WHERE s.ativo = 2 AND s.datahoraalt BETWEEN $1 AND $2
      AND ($3::int IS NULL OR s.chaveclifor = $3)
      AND ($5::int IS NULL OR ss.chaveservico = $5)

    ORDER BY data, mov;
  `;
  const { rows } = await pool.query(sql, params);
  return { rows };
});


/** RANKING (top N) por produto/serviço em ENTRADAS ou SAÍDAS */
ipcMain.handle('reports:ranking', async (_e, raw) => {
  const p = Object.assign(
    { dtini:null, dtfim:null, cliforId:null, tipo:'produto', movimento:'saidas', limit:20 },
    raw || {}
  );
  const dtini = fmtDate(p.dtini) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dtfim = fmtDate(p.dtfim) || new Date();

  const limit = Number(p.limit || 20);
  const params = [dtini, dtfim, p.cliforId || null, limit];

  let sql;
  if (p.movimento === 'entradas') {
    if (p.tipo === 'servico') {
      sql = `
        SELECT es.chaveservico AS item_id,
               SUM(es.qtde) AS qtde,
               SUM(es.valortotal)::numeric(14,2) AS total
        FROM entradas e
        JOIN itementradaserv es ON es.chaveentrada = e.chave
        WHERE e.ativo = 2 AND e.datahoraalt BETWEEN $1 AND $2
          AND ($3::int IS NULL OR e.chaveclifor = $3)
        GROUP BY 1
        ORDER BY total DESC
        LIMIT $4;
      `;
    } else {
      sql = `
        SELECT ep.chaveproduto AS item_id,
               SUM(ep.qtde) AS qtde,
               SUM(ep.valortotal)::numeric(14,2) AS total
        FROM entradas e
        JOIN itementradaprod ep ON ep.chaveentrada = e.chave
        WHERE e.ativo = 2 AND e.datahoraalt BETWEEN $1 AND $2
          AND ($3::int IS NULL OR e.chaveclifor = $3)
        GROUP BY 1
        ORDER BY total DESC
        LIMIT $4;
      `;
    }
  } else {
    if (p.tipo === 'servico') {
      sql = `
        SELECT ss.chaveservico AS item_id,
               SUM(ss.qtde) AS qtde,
               SUM(ss.valortotal)::numeric(14,2) AS total
        FROM saidas s
        JOIN itemsaidaserv ss ON ss.chavesaida = s.chave
        WHERE s.ativo = 2 AND s.datahoraalt BETWEEN $1 AND $2
          AND ($3::int IS NULL OR s.chaveclifor = $3)
        GROUP BY 1
        ORDER BY total DESC
        LIMIT $4;
      `;
    } else {
      sql = `
        SELECT sp.chaveproduto AS item_id,
               SUM(sp.qtde) AS qtde,
               SUM(sp.valortotal)::numeric(14,2) AS total
        FROM saidas s
        JOIN itemsaidaprod sp ON sp.chavesaida = s.chave
        WHERE s.ativo = 2 AND s.datahoraalt BETWEEN $1 AND $2
          AND ($3::int IS NULL OR s.chaveclifor = $3)
        GROUP BY 1
        ORDER BY total DESC
        LIMIT $4;
      `;
    }
  }

  const { rows } = await pool.query(sql, params);
  return { rows };
});

module.exports = {};
