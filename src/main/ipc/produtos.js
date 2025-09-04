// src/main/ipc/produtos.js
const { ipcMain } = require('electron');
const { query } = require('../../database');

/**
 * Lista produtos com filtro opcional (por nome ou código).
 * Retorna colunas já adequadas às telas de consulta.
 */
ipcMain.handle('produtos:listar', async (_evt, filtroRaw) => {
  const filtro = (filtroRaw || '').trim();
  const cond = [];
  const params = [];

  if (filtro) {
    params.push(`%${filtro}%`);
    cond.push(`(p.nome ILIKE $${params.length} OR CAST(p.codigo AS TEXT) ILIKE $${params.length})`);
  }

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  const sql = `
    SELECT
      p.chave,
      p.codigo,
      p.ativo,
      p.nome,
      p.chaveemp,
      p.valorcompra,
      p.valorvenda,
      p.obs,
      p.categoria,
      p.validade,
      p.datahoracad,
      p.datahoraalt
    FROM produtos p
    ${where}
    ORDER BY p.nome ASC
  `;
  const { rows } = await query(sql, params);
  return rows;
});

/**
 * Cria produto no novo schema.
 * Regras:
 *  - valorvenda: se não informado, trigger define = valorcompra
 *  - chaveemp é opcional
 */
ipcMain.handle('produtos:criar', async (_evt, payload = {}) => {
  const {
    nome,
    chaveemp = null,
    valorcompra,
    valorvenda = null,
    obs = null,
    categoria = 1,
    validade = null,
    ativo = 1,
  } = payload;

  if (!nome) throw new Error('Nome é obrigatório.');
  if (valorcompra == null || Number.isNaN(Number(valorcompra))) {
    throw new Error('Valor de compra é obrigatório e deve ser numérico.');
  }

  const sql = `
    INSERT INTO produtos
      (ativo, nome, chaveemp, valorcompra, valorvenda, obs, categoria, validade)
    VALUES
      ($1,    $2,   $3,       $4,          $5,         $6,  $7,        $8)
    RETURNING chave, codigo
  `;
  const params = [
    Number(ativo) || 1,
    nome,
    chaveemp ? Number(chaveemp) : null,
    Number(valorcompra),
    (valorvenda == null ? null : Number(valorvenda)),
    obs,
    Number(categoria) || 1,
    validade || null,
  ];

  const { rows } = await query(sql, params);
  return rows[0]; // { chave, codigo }
});
