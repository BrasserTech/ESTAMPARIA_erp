// src/main/main.js
require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('../database/index.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ERP Estamparia',
    webPreferences: {
      nodeIntegration: true,   // MVP. Em produção: preload + contextIsolation.
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

/* ====== Info do app/usuário (para topbar/footer/perfil) ====== */
ipcMain.handle('app:info', async () => {
  // Você pode definir APP_USER e APP_USER_EMAIL no .env se quiser
  const user = process.env.APP_USER || 'Operador';
  const email = process.env.APP_USER_EMAIL || '';
  return { version: app.getVersion(), user, user_email: email };
});

/* ================== DB utils ================== */
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

/* ============== IPC exemplos já existentes (opcional) ============== */
/* Produtos */
ipcMain.handle('produtos:listar', async (_e, filtro) => {
  const where = filtro ? `WHERE nome ILIKE $1 OR sku ILIKE $1` : '';
  const params = filtro ? [`%${filtro}%`] : [];
  const { rows } = await db.query(`SELECT * FROM produtos ${where} ORDER BY created_at DESC`, params);
  return rows;
});

ipcMain.handle('produtos:criar', async (_e, p) => {
  const { sku, nome, descricao, categoria, unidade, validade, preco_custo, preco_venda, estoque_minimo } = p;
  await db.query(
    `INSERT INTO produtos (sku, nome, descricao, categoria, unidade, validade, preco_custo, preco_venda, estoque_minimo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [sku, nome, descricao || null, categoria || null, unidade || 'UN', validade || null,
     preco_custo ?? 0, preco_venda ?? 0, estoque_minimo ?? 0]
  );
  return { ok: true };
});

/* Clientes */
ipcMain.handle('clientes:listar', async (_e, filtro) => {
  const where = filtro ? `WHERE nome ILIKE $1 OR documento ILIKE $1` : '';
  const params = filtro ? [`%${filtro}%`] : [];
  const { rows } = await db.query(`SELECT * FROM clientes ${where} ORDER BY created_at DESC`, params);
  return rows;
});

ipcMain.handle('clientes:criar', async (_e, c) => {
  const { nome, documento, email, telefone, endereco } = c;
  await db.query(
    `INSERT INTO clientes (nome, documento, email, telefone, endereco)
     VALUES ($1,$2,$3,$4,$5)`,
    [nome, documento || null, email || null, telefone || null, endereco || null]
  );
  return { ok: true };
});

/* Serviços */
ipcMain.handle('servicos:listar', async (_e, filtro) => {
  const where = filtro ? `WHERE descricao ILIKE $1 OR codigo ILIKE $1` : '';
  const params = filtro ? [`%${filtro}%`] : [];
  const { rows } = await db.query(`SELECT * FROM servicos ${where} ORDER BY created_at DESC`, params);
  return rows;
});

ipcMain.handle('servicos:criar', async (_e, s) => {
  const { codigo, tipo, descricao, valor, quantidade_padrao, prazo_dias } = s;
  await db.query(
    `INSERT INTO servicos (codigo, tipo, descricao, valor, quantidade_padrao, prazo_dias)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [codigo, tipo || null, descricao, valor ?? 0, quantidade_padrao ?? 1, prazo_dias || null]
  );
  return { ok: true };
});

/* Saídas (vendas) — cabeçalho + itens */
ipcMain.handle('saidas:criar', async (_e, saida) => {
  const { cliente_id, observacao, itens } = saida; // itens: [{produto_id?, servico_id?, qtde, preco_unit}]
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO saidas (cliente_id, observacao) VALUES ($1,$2) RETURNING id, numero`,
      [cliente_id || null, observacao || null]
    );
    const saidaId = rows[0].id;

    for (const it of itens || []) {
      await client.query(
        `INSERT INTO saida_itens (saida_id, produto_id, servico_id, qtde, preco_unit)
         VALUES ($1,$2,$3,$4,$5)`,
        [saidaId, it.produto_id || null, it.servico_id || null, it.qtde || 1, it.preco_unit || 0]
      );
    }

    await client.query('COMMIT');
    return { ok: true, id: saidaId, numero: rows[0].numero };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

ipcMain.handle('saidas:listar', async (_e, { de, ate, cliente }) => {
  const params = [];
  const conds = [];
  if (de)      { params.push(de);      conds.push(`s.data_venda::date >= $${params.length}`); }
  if (ate)     { params.push(ate);     conds.push(`s.data_venda::date <= $${params.length}`); }
  if (cliente) { params.push(`%${cliente}%`); conds.push(`c.nome ILIKE $${params.length}`); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT s.id, s.numero, s.data_venda, s.status, s.total, c.nome AS cliente
       FROM saidas s
       LEFT JOIN clientes c ON c.id = s.cliente_id
     ${where}
     ORDER BY s.data_venda DESC`,
    params
  );
  return rows;
});

/* Entradas — cabeçalho + itens */
ipcMain.handle('entradas:criar', async (_e, entrada) => {
  const { fornecedor_id, tipo, observacao, itens } = entrada; // itens: [{produto_id?, servico_id?, qtde, preco_unit}]
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO entradas (fornecedor_id, tipo, observacao) VALUES ($1,$2,$3) RETURNING id, numero`,
      [fornecedor_id || null, tipo || 'COMPRA', observacao || null]
    );
    const entradaId = rows[0].id;

    for (const it of itens || []) {
      await client.query(
        `INSERT INTO entrada_itens (entrada_id, produto_id, servico_id, qtde, preco_unit)
         VALUES ($1,$2,$3,$4,$5)`,
        [entradaId, it.produto_id || null, it.servico_id || null, it.qtde || 1, it.preco_unit || 0]
      );
    }

    await client.query('COMMIT');
    return { ok: true, id: entradaId, numero: rows[0].numero };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

ipcMain.handle('entradas:listar', async (_e, { de, ate, fornecedor }) => {
  const params = [];
  const conds = [];
  if (de)         { params.push(de);         conds.push(`e.data_doc >= $${params.length}`); }
  if (ate)        { params.push(ate);        conds.push(`e.data_doc <= $${params.length}`); }
  if (fornecedor) { params.push(`%${fornecedor}%`); conds.push(`f.razao_social ILIKE $${params.length}`); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT e.id, e.numero, e.data_doc, e.tipo, e.total, f.razao_social AS fornecedor
       FROM entradas e
       LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
     ${where}
     ORDER BY e.data_doc DESC`,
    params
  );
  return rows;
});
