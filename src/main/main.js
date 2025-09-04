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
   PRODUTOS (novo schema: produtos)
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

/* ===================================================================
   SERVIÇOS (novo schema: servicos)
   =================================================================== */
ipcMain.handle('servicos:listar', async (_e, filtro) => {
  const params = [];
  let where = '';
  if (filtro) {
    params.push(`%${filtro}%`);
    where = `WHERE (s.nome ILIKE $1 OR CAST(s.codigo AS TEXT) ILIKE $1)`;
  }
  const { rows } = await db.query(
    `SELECT s.chave, s.codigo, s.nome, s.valorvenda, s.chaveemp, s.obs, s.categoria, s.validade, s.prazoentrega,
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
   CLIENTES (novo schema: clifor)
   =================================================================== */

/** Lista (filtra por nome, código ou CPF/CNPJ) */
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

/** Cria registro em clifor (ativo default 1, codigo auto) */
ipcMain.handle('clientes:criar', async (_e, c) => {
  const { nome, fisjur, tipo, pertenceemp, email, cpf, telefone, endereco } = c || {};
  if (!nome || String(nome).trim() === '') throw new Error('Nome é obrigatório.');

  const sql = `
    INSERT INTO clifor (ativo, nome, fisjur, tipo, pertenceemp, email, cpf, telefone, endereco)
    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING chave, codigo
  `;
  const params = [
    String(nome).trim(),
    Number(fisjur) || 1,
    Number(tipo) || 1,
    (pertenceemp ? Number(pertenceemp) : null),
    (email ? String(email).trim() : null),
    (cpf ? String(cpf).trim() : null),
    (telefone ? String(telefone).trim() : null),
    (endereco ? String(endereco).trim() : null)
  ];

  const { rows } = await db.query(sql, params);
  return rows[0];
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
