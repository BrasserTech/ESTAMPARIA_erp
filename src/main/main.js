// src/main/main.js
require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('../database'); // ../database/index.js

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ERP Estamparia',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  // mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });

/* ====== Info do app/usuário ====== */
ipcMain.handle('app:info', async () => {
  const user = process.env.APP_USER || 'Operador';
  const email = process.env.APP_USER_EMAIL || '';
  return { version: app.getVersion(), user, user_email: email };
});

/* ====== DB utils ====== */
ipcMain.handle('db:info', async () => {
  const {
    DB_HOST = '127.0.0.1',
    DB_PORT = '5432',
    DB_USER = 'postgres',
    DB_NAME = 'estamparia'
  } = process.env;
  return { host: DB_HOST, port: Number(DB_PORT), user: DB_USER, database: DB_NAME };
});

ipcMain.handle('db:ping', async () => {
  const { rows } = await db.query('SELECT current_database() AS db, NOW() AS ts');
  return rows[0];
});

ipcMain.handle('db:init', async () => {
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await db.query(sql);
  return { ok: true };
});

/* ===================================================================
   PRODUTOS
   =================================================================== */
ipcMain.handle('produtos:listar', async (_e, filtro) => {
  const params = [];
  let where = '';
  if (filtro) {
    params.push(`%${filtro}%`);
    where = `WHERE (p.nome ILIKE $1 OR CAST(p.codigo AS TEXT) ILIKE $1)`;
  }
  const { rows } = await db.query(
    `SELECT p.chave, p.codigo, p.nome, p.valorcompra, p.valorvenda,
            p.categoria, p.validade, p.chaveemp, p.obs,
            p.datahoracad, p.datahoraalt
       FROM produtos p
     ${where}
     ORDER BY p.datahoracad DESC`,
    params
  );
  return rows;
});

ipcMain.handle('produtos:criar', async (_e, p) => {
  const { nome, valorcompra, valorvenda, chaveemp, validade, obs, categoria } = p || {};
  if (!nome || String(nome).trim() === '') throw new Error('Nome é obrigatório.');

  const vcomp = Number(valorcompra) || 0;
  const vv = (valorvenda === null || valorvenda === undefined || isNaN(Number(valorvenda)))
    ? vcomp
    : Number(valorvenda);

  const sql = `
    INSERT INTO produtos (ativo, nome, valorcompra, valorvenda, chaveemp, obs, categoria, validade)
    VALUES (1, $1, $2, $3, $4, $5, COALESCE($6, 1), $7)
    RETURNING chave, codigo
  `;
  const params = [
    String(nome).trim(),
    vcomp,
    vv,
    (chaveemp ? Number(chaveemp) : null),
    (obs ? String(obs).trim() : null),
    (categoria ? Number(categoria) : 1),
    (validade || null)
  ];

  const { rows } = await db.query(sql, params);
  return rows[0];
});

// Exclusão de produtos (usado na consulta)
ipcMain.handle('produtos:excluir', async (_e, where) => {
  if (where?.chave)         await db.query('DELETE FROM produtos WHERE chave = $1', [where.chave]);
  else if (where?.codigo)   await db.query('DELETE FROM produtos WHERE codigo = $1', [where.codigo]);
  else throw new Error('Parâmetro de exclusão ausente');
  return { ok: true };
});

/* ===================================================================
   SERVIÇOS
   =================================================================== */
ipcMain.handle('servicos:listar', async (_e, filtro) => {
  const params = [];
  let where = '';
  if (filtro) {
    params.push(`%${filtro}%`);
    where = `WHERE (s.nome ILIKE $1 OR CAST(s.codigo AS TEXT) ILIKE $1)`;
  }
  const { rows } = await db.query(
    `SELECT s.chave, s.codigo, s.nome, s.valorvenda, s.chaveemp, s.obs,
            s.categoria, s.validade, s.prazoentrega,
            s.datahoracad, s.datahoraalt
       FROM servicos s
     ${where}
     ORDER BY s.datahoracad DESC`,
    params
  );
  return rows;
});

ipcMain.handle('servicos:criar', async (_e, s) => {
  const { nome, valorvenda, chaveemp, obs, categoria, validade, prazoentrega } = s || {};
  if (!nome || String(nome).trim() === '') throw new Error('Nome é obrigatório.');

  const sql = `
    INSERT INTO servicos (ativo, nome, valorvenda, chaveemp, obs, categoria, validade, prazoentrega)
    VALUES (1, $1, $2, $3, $4, COALESCE($5,1), $6, $7)
    RETURNING chave, codigo
  `;
  const params = [
    String(nome).trim(),
    Number(valorvenda) || 0,
    (chaveemp ? Number(chaveemp) : null),
    (obs ? String(obs).trim() : null),
    (categoria ? Number(categoria) : 1),
    (validade || null),
    (prazoentrega || null)
  ];

  const { rows } = await db.query(sql, params);
  return rows[0];
});

/* ===================================================================
   CLIENTES (CLIFOR)
   =================================================================== */
ipcMain.handle('clientes:listar', async (_e, filtro) => {
  const params = [];
  let where = '';
  if (filtro) {
    params.push(`%${filtro}%`);
    where = `WHERE (c.nome ILIKE $1 OR CAST(c.codigo AS TEXT) ILIKE $1 OR COALESCE(c.cpf,'') ILIKE $1)`;
  }
  const { rows } = await db.query(
    `SELECT c.chave, c.codigo, c.nome, c.fisjur, c.tipo, c.cpf, c.email, c.telefone, c.endereco,
            c.pertenceemp, c.datahoracad, c.datahoraalt
       FROM clifor c
     ${where}
     ORDER BY c.datahoracad DESC`,
    params
  );
  return rows;
});

ipcMain.handle('clientes:criar', async (_e, c) => {
  const { nome, fisjur, tipo, pertenceemp, email, cpf, telefone, endereco } = c || {};
  if (!nome || String(nome).trim() === '') throw new Error('Nome é obrigatório.');

  // --- Normalizações ---
  // A UI manda 1 (Física) ou 2 (Jurídica). O banco exige 'F' ou 'J'.
  const fisjurRaw = (fisjur === undefined || fisjur === null) ? 1 : fisjur;
  const fisjurDB = String(fisjurRaw) === '2' ? 'J' : 'F';

  // Tipo permanece numérico (1=cliente, 2=fornecedor, 3=representante)
  const tipoNum = Number(tipo) || 1;

  // Enviar CPF/telefone apenas com dígitos (mantém compatibilidade com possíveis constraints)
  const digits = (s) => (s || '').toString().replace(/\D+/g, '') || null;
  const cpfDigits = digits(cpf);
  const telDigits = digits(telefone);

  const sql = `
    INSERT INTO clifor (ativo, nome, fisjur, tipo, pertenceemp, email, cpf, telefone, endereco)
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING chave, codigo
  `;
  const params = [
    String(nome).trim(),
    fisjurDB,
    tipoNum,
    (pertenceemp ? Number(pertenceemp) : null),
    (email ? String(email).trim() : null),
    cpfDigits,
    telDigits,
    (endereco ? String(endereco).trim() : null)
  ];

  const { rows } = await db.query(sql, params);
  return rows[0];
});

/* ===================================================================
   LOOKUP / PESQUISA GENÉRICA (F8 / Lupa) — versão robusta
   =================================================================== */
ipcMain.handle('lookup:search', async (_e, payload = {}) => {
  // 1) Sanitização básica
  const termRaw  = (payload.term ?? '');
  const limitRaw = (payload.limit ?? 50);
  const lim = Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200);

  // 2) Normalização do source (lower + remoção de acentos)
  const rawSource = (payload.source ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, ''); // requer Node com ICU completo

  // 3) Mapeamento de sinônimos (pt/en; singular/plural)
  const alias = {
    // EMPRESA
    empresa: 'empresa', empresas: 'empresa', emp: 'empresa', company: 'empresa', companies: 'empresa',
    // PRODUTOS
    produto: 'produtos', produtos: 'produtos', prod: 'produtos', product: 'produtos', products: 'produtos',
    // SERVIÇOS
    servico: 'servicos', servicos: 'servicos', svc: 'servicos', service: 'servicos', services: 'servicos',
    // CLIFOR (clientes/fornecedores/pessoas)
    clifor: 'clifor',
    cliente: 'clifor', clientes: 'clifor',
    fornecedor: 'clifor', fornecedores: 'clifor',
    pessoa: 'clifor', pessoas: 'clifor'
  };

  // 4) Resolve a fonte
  let source = alias[rawSource];

  // Heurística por substring (ex.: "prod-list", "services-page", "empresas  ", etc.)
  if (!source && rawSource) {
    if (rawSource.includes('emp')) source = 'empresa';
    else if (rawSource.includes('prod')) source = 'produtos';
    else if (rawSource.includes('serv')) source = 'servicos';
    else if (rawSource.includes('cli') || rawSource.includes('for') || rawSource.includes('pess')) source = 'clifor';
  }

  // 5) Fallback quando vier vazio/inesperado
  // Ajuste este valor conforme a tela chamadora: 'produtos' | 'servicos' | 'empresa' | 'clifor'
  const fallbackDefault = 'produtos';
  if (!source) {
    source = fallbackDefault;
    // Se preferir comportamento estrito (sem fallback), comente a linha acima
    // e descomente o bloco abaixo:
    /*
    const allowed = Object.keys(alias).sort().join(', ');
    const got = rawSource || '(vazio)';
    throw new Error(`Fonte de pesquisa não permitida. Recebido: "${got}". Use uma destas: ${allowed}`);
    */
  }

  // 6) Parâmetros de busca
  const term  = termRaw.toString().trim();
  const qLike = `%${term}%`;
  const params = [term, qLike, lim];

  // 7) SQL por fonte (conforme seu schema.sql)
  let sql;
  if (source === 'empresa') {
    sql = `
      SELECT chave, codigo, nome
        FROM empresa
       WHERE ($1 = '' OR nome ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2)
       ORDER BY nome
       LIMIT $3
    `;
  } else if (source === 'produtos') {
    sql = `
      SELECT chave, codigo, nome, valorvenda
        FROM produtos
       WHERE ($1 = '' OR nome ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2)
       ORDER BY nome
       LIMIT $3
    `;
  } else if (source === 'servicos') {
    sql = `
      SELECT chave, codigo, nome, valorvenda
        FROM servicos
       WHERE ($1 = '' OR nome ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2)
       ORDER BY nome
       LIMIT $3
    `;
  } else { // 'clifor'
    sql = `
      SELECT chave, codigo, nome
        FROM clifor
       WHERE ($1 = '' OR nome ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2)
       ORDER BY nome
       LIMIT $3
    `;
  }

  // 8) Execução e tratamento
  try {
    const { rows } = await db.query(sql, params);
    return rows;
  } catch (err) {
    const got = rawSource || '(vazio)';
    throw new Error(`Falha ao pesquisar (${source}; recebido="${got}"): ${err.message}`);
  }
});

/* ===================================================================
   DASHBOARD  (ajustado ao seu schema)
   =================================================================== */

// Entradas × Saídas por mês + totais do período
ipcMain.handle('dashboard:kpis', async (_e, { meses = 6 } = {}) => {
  const months = Math.max(1, parseInt(meses, 10) || 6);

  const { rows: rNow } = await db.query('SELECT NOW() AS now');
  const now = new Date(rNow[0].now);
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // ENTRADAS: usa datahoracad e total
  const { rows: ent } = await db.query(
    `SELECT to_char(date_trunc('month', e.datahoracad), 'YYYY-MM') AS ym,
            SUM(COALESCE(e.total,0)) AS total
       FROM entradas e
      WHERE e.datahoracad >= $1
   GROUP BY 1
   ORDER BY 1`,
    [start]
  );

  // SAIDAS: usa datahoracad e total
  const { rows: sai } = await db.query(
    `SELECT to_char(date_trunc('month', s.datahoracad), 'YYYY-MM') AS ym,
            SUM(COALESCE(s.total,0)) AS total
       FROM saidas s
      WHERE s.datahoracad >= $1
   GROUP BY 1
   ORDER BY 1`,
    [start]
  );

  const labels = [];
  {
    const m = new Date(start);
    for (let i = 0; i < months; i++) {
      labels.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
      m.setMonth(m.getMonth() + 1);
    }
  }

  const mapEnt = Object.fromEntries(ent.map(r => [r.ym, Number(r.total)]));
  const mapSai = Object.fromEntries(sai.map(r => [r.ym, Number(r.total)]));
  const entradas = labels.map(l => mapEnt[l] || 0);
  const saidas   = labels.map(l => mapSai[l] || 0);

  return {
    labels,
    entradas,
    saidas,
    totalEntradas: entradas.reduce((a,b)=>a+b,0),
    totalSaidas:   saidas.reduce((a,b)=>a+b,0),
  };
});

// Top 5 clientes por faturamento (SAIDAS.x CLIFOR)
ipcMain.handle('dashboard:topclientes', async (_e, { meses = 6 } = {}) => {
  const months = Math.max(1, parseInt(meses, 10) || 6);

  const { rows: rNow } = await db.query('SELECT NOW() AS now');
  const now = new Date(rNow[0].now);
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const { rows } = await db.query(
    `SELECT COALESCE(c.nome,'(Sem cliente)') AS nome,
            SUM(COALESCE(s.total,0)) AS total
       FROM saidas s
  LEFT JOIN clifor c ON c.chave = s.chaveclifor
      WHERE s.datahoracad >= $1
   GROUP BY 1
   ORDER BY total DESC NULLS LAST
      LIMIT 5`,
    [start]
  );

  return {
    labels: rows.map(r => r.nome),
    values: rows.map(r => Number(r.total || 0)),
  };
});

// Mix Produtos × Serviços (por quantidade de itens, pois os itens não têm preço/qtde no schema atual)
ipcMain.handle('dashboard:mix', async (_e, { meses = 6 } = {}) => {
  const months = Math.max(1, parseInt(meses, 10) || 6);

  const { rows: rNow } = await db.query('SELECT NOW() AS now');
  const now = new Date(rNow[0].now);
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  // Produtos: conta itens de saída de produto no período
  const { rows: rp } = await db.query(
    `SELECT COUNT(*)::int AS qtd
       FROM itemsaidaprod ip
       JOIN saidas s ON s.chave = ip.chavesaida
      WHERE s.datahoracad >= $1`,
    [start]
  );

  // Serviços: conta itens de saída de serviço no período
  const { rows: rs } = await db.query(
    `SELECT COUNT(*)::int AS qtd
       FROM itemsaidaserv isv
       JOIN saidas s ON s.chave = isv.chavesaida
      WHERE s.datahoracad >= $1`,
    [start]
  );

  return {
    produtos: Number(rp[0]?.qtd || 0),
    servicos: Number(rs[0]?.qtd || 0),
  };
});

/* ===========================================================
   AUTOLOAD de módulos IPC adicionais (ex.: movimentacoes.js)
   =========================================================== */
const ipcDir = path.join(__dirname, 'ipc');
if (fs.existsSync(ipcDir)) {
  fs.readdirSync(ipcDir)
    .filter(f => f.endsWith('.js'))
    .forEach(f => { try { require(path.join(ipcDir, f)); } catch (e) { console.error('[IPC]', f, e); } });
}
