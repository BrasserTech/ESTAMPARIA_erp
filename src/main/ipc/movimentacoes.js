// src/main/ipc/movimentacoes.js
const { ipcMain } = require('electron');
const { query } = require('../../database');

/* ===========================================================
   LOOKUPS ESPECÍFICOS (retrocompatibilidade)
   (O lookup genérico 'lookup:search' já está registrado no main.js)
   =========================================================== */

ipcMain.handle('movs:lookupClifor', async (_evt, { search = '', tipo = null, limit = 20 } = {}) => {
  const terms = [];
  const params = [];
  if (tipo != null) {
    params.push(Number(tipo));
    terms.push(`c.tipo = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    terms.push(`(c.nome ILIKE $${params.length} OR CAST(c.codigo AS TEXT) ILIKE $${params.length})`);
  }
  const where = terms.length ? `WHERE ${terms.join(' AND ')}` : '';
  const sql = `
    SELECT c.chave, c.codigo, c.nome, c.tipo, c.fisjur
      FROM clifor c
    ${where}
    ORDER BY c.nome ASC
    LIMIT ${Math.max(1, Math.min(100, Number(limit) || 20))}
  `;
  const { rows } = await query(sql, params);
  return rows;
});

ipcMain.handle('movs:lookupProdutos', async (_evt, { search = '', limit = 20 } = {}) => {
  const params = [];
  const where = search
    ? (params.push(`%${search}%`), `WHERE (p.nome ILIKE $${params.length} OR CAST(p.codigo AS TEXT) ILIKE $${params.length})`)
    : '';
  const sql = `
    SELECT p.chave, p.codigo, p.nome, p.valorcompra, p.valorvenda
      FROM produtos p
    ${where}
    ORDER BY p.nome ASC
    LIMIT ${Math.max(1, Math.min(100, Number(limit) || 20))}
  `;
  const { rows } = await query(sql, params);
  return rows;
});

ipcMain.handle('movs:lookupServicos', async (_evt, { search = '', limit = 20 } = {}) => {
  const params = [];
  const where = search
    ? (params.push(`%${search}%`), `WHERE (s.nome ILIKE $${params.length} OR CAST(s.codigo AS TEXT) ILIKE $${params.length})`)
    : '';
  const sql = `
    SELECT s.chave, s.codigo, s.nome, s.valorvenda
      FROM servicos s
    ${where}
    ORDER BY s.nome ASC
    LIMIT ${Math.max(1, Math.min(100, Number(limit) || 20))}
  `;
  const { rows } = await query(sql, params);
  return rows;
});

ipcMain.handle('movs:lookupEmpresas', async (_evt, { search = '', limit = 20 } = {}) => {
  const params = [];
  const where = search
    ? (params.push(`%${search}%`), `WHERE (e.nome ILIKE $${params.length} OR CAST(e.codigo AS TEXT) ILIKE $${params.length})`)
    : '';
  const sql = `
    SELECT e.chave, e.codigo, e.nome
      FROM empresa e
    ${where}
    ORDER BY e.nome ASC
    LIMIT ${Math.max(1, Math.min(100, Number(limit) || 20))}
  `;
  const { rows } = await query(sql, params);
  return rows;
});

/* ===========================================================
   ENTRADAS — fluxo rascunho
   =========================================================== */
ipcMain.handle('movs:entrada:ensure', async (_evt, { chaveclifor, ativo = 1 } = {}) => {
  if (!chaveclifor) throw new Error('Fornecedor (clifor) é obrigatório.');
  const sql = `
    INSERT INTO entradas (ativo, chaveclifor, total, obs)
    VALUES ($1, $2, 0, NULL)
    RETURNING chave, codigo
  `;
  const { rows } = await query(sql, [Number(ativo) || 1, Number(chaveclifor)]);
  return rows[0];
});

ipcMain.handle('movs:entrada:addProd', async (_evt, { chaveentrada, chaveproduto } = {}) => {
  if (!chaveentrada || !chaveproduto) throw new Error('Parâmetros inválidos.');
  const sql = `
    INSERT INTO itementradaprod (ativo, chaveentrada, chaveproduto)
    VALUES (1, $1, $2)
    RETURNING chave
  `;
  const { rows } = await query(sql, [Number(chaveentrada), Number(chaveproduto)]);
  return rows[0];
});

ipcMain.handle('movs:entrada:addServ', async (_evt, { chaveentrada, chaveservico } = {}) => {
  if (!chaveentrada || !chaveservico) throw new Error('Parâmetros inválidos.');
  const sql = `
    INSERT INTO itementradaserv (ativo, chaveentrada, chaveservico)
    VALUES (1, $1, $2)
    RETURNING chave
  `;
  const { rows } = await query(sql, [Number(chaveentrada), Number(chaveservico)]);
  return rows[0];
});

ipcMain.handle('movs:entrada:remProd', async (_evt, { itementradaprod_chave } = {}) => {
  if (!itementradaprod_chave) throw new Error('Parâmetro inválido.');
  await query(`DELETE FROM itementradaprod WHERE chave = $1`, [Number(itementradaprod_chave)]);
  return { ok: true };
});

ipcMain.handle('movs:entrada:remServ', async (_evt, { itementradaserv_chave } = {}) => {
  if (!itementradaserv_chave) throw new Error('Parâmetro inválido.');
  await query(`DELETE FROM itementradaserv WHERE chave = $1`, [Number(itementradaserv_chave)]);
  return { ok: true };
});

ipcMain.handle('movs:entrada:finalizar', async (_evt, { chaveentrada, chaveclifor, total = 0, obs = null } = {}) => {
  if (!chaveentrada || !chaveclifor) throw new Error('Parâmetros obrigatórios ausentes.');
  const sql = `
    UPDATE entradas
       SET chaveclifor = $1,
           total = $2,
           obs = $3,
           datahoraalt = NOW()
     WHERE chave = $4
  `;
  await query(sql, [Number(chaveclifor), Number(total) || 0, obs, Number(chaveentrada)]);
  return { ok: true };
});

/* ===========================================================
   SAÍDAS — fluxo rascunho
   =========================================================== */
ipcMain.handle('movs:saida:ensure', async (_evt, { chaveclifor, ativo = 1 } = {}) => {
  if (!chaveclifor) throw new Error('Cliente (clifor) é obrigatório.');
  const sql = `
    INSERT INTO saidas (ativo, chaveclifor, total, obs)
    VALUES ($1, $2, 0, NULL)
    RETURNING chave, codigo
  `;
  const { rows } = await query(sql, [Number(ativo) || 1, Number(chaveclifor)]);
  return rows[0];
});

ipcMain.handle('movs:saida:addProd', async (_evt, { chavesaida, chaveproduto, qtde = 1, valorunit = 0 } = {}) => {
  if (!chavesaida || !chaveproduto) throw new Error('Parâmetros inválidos.');
  const sql = `
    INSERT INTO itemsaidaprod (ativo, chavesaida, chaveproduto, qtde, valorunit)
    VALUES (1, $1, $2, $3, $4)
    RETURNING chave
  `;
  const { rows } = await query(sql, [Number(chavesaida), Number(chaveproduto), Number(qtde) || 1, Number(valorunit) || 0]);
  return rows[0];
});

ipcMain.handle('movs:saida:finalizar', async (_evt, { chavesaida, chaveclifor, obs = null } = {}) => {
  if (!chavesaida || !chaveclifor) throw new Error('Parâmetros obrigatórios ausentes.');

  // total calculado pelos itens (valortotal é trigger de qtde*valorunit)
  const { rows: rTot } = await query(
    `SELECT COALESCE(SUM(valortotal),0) AS tot FROM itemsaidaprod WHERE chavesaida = $1`,
    [Number(chavesaida)]
  );
  const tot = Number(rTot[0]?.tot || 0);

  const sql = `
    UPDATE saidas
       SET chaveclifor = $1,
           total = $2,
           obs = $3
     WHERE chave = $4
  `;
  await query(sql, [Number(chaveclifor), tot, obs, Number(chavesaida)]);
  return { ok: true, total: tot };
});

ipcMain.handle('movs:saida:addServ', async (_evt, { chavesaida, chaveservico } = {}) => {
  if (!chavesaida || !chaveservico) throw new Error('Parâmetros inválidos.');
  const sql = `
    INSERT INTO itemsaidaserv (ativo, chavesaida, chaveservico)
    VALUES (1, $1, $2)
    RETURNING chave
  `;
  const { rows } = await query(sql, [Number(chavesaida), Number(chaveservico)]);
  return rows[0];
});

ipcMain.handle('movs:saida:remProd', async (_evt, { itemsaidaprod_chave } = {}) => {
  if (!itemsaidaprod_chave) throw new Error('Parâmetro inválido.');
  await query(`DELETE FROM itemsaidaprod WHERE chave = $1`, [Number(itemsaidaprod_chave)]);
  return { ok: true };
});

ipcMain.handle('movs:saida:remServ', async (_evt, { itemsaidaserv_chave } = {}) => {
  if (!itemsaidaserv_chave) throw new Error('Parâmetro inválido.');
  await query(`DELETE FROM itemsaidaserv WHERE chave = $1`, [Number(itemsaidaserv_chave)]);
  return { ok: true };
});

ipcMain.handle('movs:saida:finalizar', async (_evt, { chavesaida, chaveclifor, total = 0, obs = null } = {}) => {
  if (!chavesaida || !chaveclifor) throw new Error('Parâmetros obrigatórios ausentes.');
  const sql = `
    UPDATE saidas
       SET chaveclifor = $1,
           total = $2,
           obs = $3
     WHERE chave = $4
  `;
  await query(sql, [Number(chaveclifor), Number(total) || 0, obs, Number(chavesaida)]);
  return { ok: true };
});

ipcMain.handle('estoque:produto:get', async (_e, { chaveproduto }) => {
  const { rows } = await query(
    `SELECT qtentrada, qtdesaida, qtdtotal
       FROM produtoestoque
      WHERE chaveproduto = $1
      LIMIT 1`, [Number(chaveproduto)]
  );
  return rows[0] || { qtentrada: 0, qtdesaida: 0, qtdtotal: 0 };
});
