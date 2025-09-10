// src/main/main.js

const path = require('path');
const fs   = require('fs');

// 1) Carrega .env ANTES de qualquer require que use DB.
(function loadEnvEarly() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.execPath, '..', '.env'),
    path.join(process.resourcesPath || '', '.env'),
  ];
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        require('dotenv').config({ path: p });
        return;
      }
    } catch { /* ignore */ }
  }
  try { require('dotenv').config(); } catch { /* ignore */ }
})();

const { app, BrowserWindow, ipcMain } = require('electron');
const db = require('../database'); // usa o módulo único acima

// >>> Mantido: relatórios explícitos
require('./ipc/relatorios');

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

app.on('ready', async () => {
  // 2) (Opcional, mas recomendado) Valida conexão antes de abrir a UI.
  try {
    await db.query('SELECT 1');
  } catch (e) {
    console.error('[APP] Falha ao validar conexão inicial:', e);
    // A UI de Configurações ainda pode permitir correção; seguimos abrindo.
  }
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (mainWindow === null) createWindow(); });

// Tratadores de erros globais para log útil
process.on('unhandledRejection', (r) => console.error('[UnhandledRejection]', r));
process.on('uncaughtException', (e) => console.error('[UncaughtException]', e));

/* ====== Info do app/usuário ====== */
ipcMain.handle('app:info', async () => {
  const user  = process.env.APP_USER || 'Operador';
  const email = process.env.APP_USER_EMAIL || '';
  return { version: app.getVersion(), user, user_email: email };
});

/* ====== DB utils ====== */
ipcMain.handle('db:info', async () => {
  const cfg = db.getConfig();
  return { ...cfg }; // host, port, user, database
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
    (validade ? validade : null),
    (prazoentrega ? prazoentrega : null)
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

  const fisjurRaw = (fisjur === undefined || fisjur === null) ? 1 : fisjur;
  const fisjurDB = String(fisjurRaw) === '2' ? 'J' : 'F';
  const tipoNum = Number(tipo) || 1;

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
   LOOKUP / PESQUISA GENÉRICA
   =================================================================== */
ipcMain.handle('lookup:search', async (_e, payload = {}) => {
  const termRaw  = (payload.term ?? '');
  const limitRaw = (payload.limit ?? 50);
  const lim = Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200);

  const rawSource = (payload.source ?? '')
    .toString().trim().toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  const alias = {
    empresa: 'empresa', empresas: 'empresa', emp: 'empresa',
    produto: 'produtos', produtos: 'produtos', prod: 'produtos',
    servico: 'servicos', servicos: 'servicos', svc: 'servicos',
    clifor: 'clifor', cliente: 'clifor', clientes: 'clifor',
    fornecedor: 'clifor', fornecedores: 'clifor', pessoa: 'clifor', pessoas: 'clifor'
  };

  let source = alias[rawSource];
  if (!source && rawSource) {
    if (rawSource.includes('emp')) source = 'empresa';
    else if (rawSource.includes('prod')) source = 'produtos';
    else if (rawSource.includes('serv')) source = 'servicos';
    else if (rawSource.includes('cli') || rawSource.includes('for') || rawSource.includes('pess')) source = 'clifor';
  }
  const fallbackDefault = 'produtos';
  if (!source) source = fallbackDefault;

  const term  = termRaw.toString().trim();
  const qLike = `%${term}%`;
  const params = [term, qLike, lim];

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
  } else {
    sql = `
      SELECT chave, codigo, nome
        FROM clifor
       WHERE ($1 = '' OR nome ILIKE $2 OR CAST(codigo AS TEXT) ILIKE $2)
       ORDER BY nome
       LIMIT $3
    `;
  }

  try {
    const { rows } = await db.query(sql, params);
    return rows;
  } catch (err) {
    const got = rawSource || '(vazio)';
    throw new Error(`Falha ao pesquisar (${source}; recebido="${got}"): ${err.message}`);
  }
});

/* ===========================================================
   AUTOLOAD de módulos IPC adicionais
   =========================================================== */
const ipcDir = path.join(__dirname, 'ipc');
if (fs.existsSync(ipcDir)) {
  const skip = new Set([
    'clientes.js',
    'produtos.js',
    'servicos.js',
    'relatorios.js',
  ]);
  fs.readdirSync(ipcDir)
    .filter(f => f.endsWith('.js') && !skip.has(f))
    .forEach(f => {
      try { require(path.join(ipcDir, f)); }
      catch (e) { console.error('[IPC]', f, e); }
    });
}
