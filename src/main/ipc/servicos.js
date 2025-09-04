// src/main/ipc/servicos.js
const { ipcMain } = require('electron');
const { query } = require('../../database');

/**
 * Lista serviços com filtro opcional (por nome ou código).
 * Agora inclui a coluna prazoentrega (date).
 */
ipcMain.handle('servicos:listar', async (_evt, filtroRaw) => {
  const filtro = (filtroRaw || '').trim();
  const cond = [];
  const params = [];

  if (filtro) {
    params.push(`%${filtro}%`);
    cond.push(`(s.nome ILIKE $${params.length} OR CAST(s.codigo AS TEXT) ILIKE $${params.length})`);
  }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const sql = `
    SELECT
      s.chave,
      s.codigo,
      s.ativo,
      s.nome,
      s.chaveemp,
      s.valorvenda,
      s.obs,
      s.categoria,
      s.validade,
      s.prazoentrega,
      s.datahoracad,
      s.datahoraalt
    FROM servicos s
    ${where}
    ORDER BY s.nome ASC
  `;
  const { rows } = await query(sql, params);
  return rows;
});

/**
 * Cria serviço no novo schema, incluindo prazoentrega (date).
 */
ipcMain.handle('servicos:criar', async (_evt, payload = {}) => {
  const {
    nome,
    chaveemp = null,
    valorvenda,
    obs = null,
    categoria = 1,
    validade = null,
    prazoentrega = null, // NOVO
    ativo = 1,
  } = payload;

  if (!nome) throw new Error('Nome é obrigatório.');
  if (valorvenda == null || Number.isNaN(Number(valorvenda))) {
    throw new Error('Valor de venda é obrigatório e deve ser numérico.');
  }

  const sql = `
    INSERT INTO servicos
      (ativo, nome, chaveemp, valorvenda, obs, categoria, validade, prazoentrega)
    VALUES
      ($1,    $2,   $3,       $4,         $5,  $6,        $7,       $8)
    RETURNING chave, codigo
  `;
  const params = [
    Number(ativo) || 1,
    nome,
    chaveemp ? Number(chaveemp) : null,
    Number(valorvenda),
    obs,
    Number(categoria) || 1,
    validade || null,
    prazoentrega || null,
  ];

  const { rows } = await query(sql, params);
  return rows[0]; // { chave, codigo }
});
