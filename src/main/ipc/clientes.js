// src/main/ipc/clientes.js
const { ipcMain } = require('electron');
const { query } = require('../../database');

/**
 * Lista clientes com filtro opcional (por nome, cpf, email).
 * Retorna colunas compatíveis com a tela de consulta.
 */
ipcMain.handle('clientes:listar', async (_evt, filtroRaw) => {
  const filtro = (filtroRaw || '').trim();
  const where = filtro
    ? `WHERE (nome ILIKE $1 OR COALESCE(cpf,'') ILIKE $1 OR COALESCE(email,'') ILIKE $1)`
    : '';
  const params = filtro ? [`%${filtro}%`] : [];

  const sql = `
    SELECT
      chave,
      codigo,
      ativo,
      nome,
      fisjur,       -- 'F' ou 'J'
      tipo,         -- 1=cliente, 2=fornecedor, 3=representante
      cpf,
      email,
      telefone,
      endereco,
      datahoracad,
      datahoraalt
    FROM clifor
    ${where}
    ORDER BY nome ASC
  `;
  const { rows } = await query(sql, params);
  return rows;
});

/**
 * Cria um cliente na tabela clifor.
 * Campos do novo schema: nome*, fisjur*, tipo*, pertenceemp(opc), email, cpf(opc), telefone(opc), endereco(opc)
 * 'codigo' e 'chave' são automáticos (sequências). 'ativo' default 1.
 */
ipcMain.handle('clientes:criar', async (_evt, payload = {}) => {
  const {
    nome,
    fisjur,         // 'F' ou 'J'
    tipo,           // 1|2|3
    pertenceemp,    // integer | null
    email = null,
    cpf = null,
    telefone = null,
    endereco = null,
    ativo = 1,
  } = payload;

  if (!nome) throw new Error('Nome é obrigatório.');
  if (!fisjur || !['F', 'J'].includes(String(fisjur).toUpperCase())) {
    throw new Error("Campo 'Fis/Jur' inválido (use 'F' ou 'J').");
  }
  const ntipo = Number(tipo);
  if (![1, 2, 3].includes(ntipo)) {
    throw new Error("Campo 'Tipo' inválido (1=cliente, 2=fornecedor, 3=representante).");
  }

  const insertSql = `
    INSERT INTO clifor
      (ativo, nome, fisjur, tipo, pertenceemp, email, cpf, telefone, endereco)
    VALUES
      ($1,    $2,   $3,    $4,   $5,          $6,    $7,  $8,       $9)
    RETURNING chave, codigo
  `;
  const params = [
    Number(ativo) || 1,
    nome,
    String(fisjur).toUpperCase(),
    ntipo,
    pertenceemp ? Number(pertenceemp) : null,
    email || null,
    cpf || null,
    telefone || null,
    endereco || null,
  ];

  const { rows } = await query(insertSql, params);
  return rows[0]; // { chave, codigo }
});
