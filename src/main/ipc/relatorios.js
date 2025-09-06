// src/main/ipc/relatorios.js
// IPC de Relatórios
// Tabelas esperadas no schema: entradas, saidas, clifor,
// itementradaprod, itementradaserv, itemsaidaprod, itemsaidaserv,
// produtos, servicos (e opcionalmente campo chaveemp em entradas/saidas)

const { ipcMain } = require('electron');
const db = require('../../database');

// ---------------------------- helpers ----------------------------
function buildWhere(alias, f) {
  const w = [];
  const p = [];

  if (f?.dtini) {
    p.push(`${f.dtini} 00:00:00`);
    w.push(`${alias}.datahoracad >= $${p.length}`);
  }
  if (f?.dtfim) {
    p.push(`${f.dtfim} 23:59:59`);
    w.push(`${alias}.datahoracad <= $${p.length}`);
  }

  // aceita cliforId OU clienteId
  const cli = f?.cliforId ?? f?.clienteId;
  if (cli) {
    p.push(Number(cli));
    w.push(`${alias}.chaveclifor = $${p.length}`);
  }

  // Se suas tabelas 'entradas/saidas' NÃO tiverem chaveemp, remova este bloco
  if (f?.empresaId) {
    p.push(Number(f.empresaId));
    w.push(`${alias}.chaveemp = $${p.length}`);
  }

  return { clause: w.length ? `WHERE ${w.join(' AND ')}` : '', params: p };
}

function sum(arr, pick = (x) => x) {
  return (arr || []).reduce((a, b) => a + Number(pick(b) || 0), 0);
}

function normRows(r) {
  return Array.isArray(r) ? r : [];
}

// ---------------------------- Faturamento Diário ----------------------------
ipcMain.handle('rel:fatdiario:listar', async (_e, f = {}) => {
  const mov = (f.movimento || 'saidas').toLowerCase();

  async function querySaidas() {
    const { clause, params } = buildWhere('s', f);

    const { rows: porDia } = await db.query(
      `SELECT DATE(s.datahoracad) AS dia, SUM(COALESCE(s.total,0)) AS total
         FROM saidas s
        ${clause}
     GROUP BY 1
     ORDER BY 1`,
      params
    );

    const { rows: docs } = await db.query(
      `SELECT s.chave AS codigo,
              s.datahoracad AS data,
              COALESCE(c.nome,'') AS cliente,
              COALESCE(s.total,0) AS total,
              'saída'::text AS mov
         FROM saidas s
    LEFT JOIN clifor c ON c.chave = s.chaveclifor
        ${clause}
     ORDER BY s.datahoracad`,
      params
    );

    return { porDia: normRows(porDia), docs: normRows(docs), total: sum(porDia, r => r.total) };
  }

  async function queryEntradas() {
    const { clause, params } = buildWhere('e', f);

    const { rows: porDia } = await db.query(
      `SELECT DATE(e.datahoracad) AS dia, SUM(COALESCE(e.total,0)) AS total
         FROM entradas e
        ${clause}
     GROUP BY 1
     ORDER BY 1`,
      params
    );

    const { rows: docs } = await db.query(
      `SELECT e.chave AS codigo,
              e.datahoracad AS data,
              COALESCE(c.nome,'') AS cliente,
              COALESCE(e.total,0) AS total,
              'entrada'::text AS mov
         FROM entradas e
    LEFT JOIN clifor c ON c.chave = e.chaveclifor
        ${clause}
     ORDER BY e.datahoracad`,
      params
    );

    return { porDia: normRows(porDia), docs: normRows(docs), total: sum(porDia, r => r.total) };
  }

  if (mov === 'saidas') return await querySaidas();
  if (mov === 'entradas') return await queryEntradas();

  // Ambos
  const S = await querySaidas();
  const E = await queryEntradas();

  // mescla por dia
  const map = new Map();
  for (const r of S.porDia) {
    const k = String(r.dia).slice(0, 10);
    map.set(k, (map.get(k) || 0) + Number(r.total || 0));
  }
  for (const r of E.porDia) {
    const k = String(r.dia).slice(0, 10);
    map.set(k, (map.get(k) || 0) + Number(r.total || 0));
  }
  const porDia = Array.from(map.entries())
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  const docs = [...S.docs, ...E.docs].sort((a, b) => new Date(a.data) - new Date(b.data));
  const totalPeriodo = S.total + E.total;

  return { porDia, docs, totalPeriodo };
});

// (alias opcional para compatibilidade)
ipcMain.handle('rel:fat:diario:listar', async (_e, f = {}) => ipcMain.emit('rel:fatdiario:listar', _e, f));

// ---------------------------- Faturamento por Cliente ----------------------------
async function _porClienteCore(f = {}) {
  const mov = (f.movimento || 'saidas').toLowerCase();

  async function porClienteSaidas() {
    const { clause, params } = buildWhere('s', f);

    const { rows: resumo } = await db.query(
      `SELECT COALESCE(c.nome,'(Sem cliente)') AS cliente,
              SUM(COALESCE(s.total,0)) AS total
         FROM saidas s
    LEFT JOIN clifor c ON c.chave = s.chaveclifor
        ${clause}
     GROUP BY 1
     ORDER BY total DESC NULLS LAST, 1`,
      params
    );

    const { rows: docs } = await db.query(
      `SELECT s.chave AS codigo,
              s.datahoracad AS data,
              COALESCE(c.nome,'') AS cliente,
              COALESCE(s.total,0) AS total,
              'saída'::text AS mov
         FROM saidas s
    LEFT JOIN clifor c ON c.chave = s.chaveclifor
        ${clause}
     ORDER BY s.datahoracad`,
      params
    );

    return { resumo: normRows(resumo), docs: normRows(docs) };
  }

  async function porClienteEntradas() {
    const { clause, params } = buildWhere('e', f);

    const { rows: resumo } = await db.query(
      `SELECT COALESCE(c.nome,'(Sem fornecedor)') AS cliente,
              SUM(COALESCE(e.total,0)) AS total
         FROM entradas e
    LEFT JOIN clifor c ON c.chave = e.chaveclifor
        ${clause}
     GROUP BY 1
     ORDER BY total DESC NULLS LAST, 1`,
      params
    );

    const { rows: docs } = await db.query(
      `SELECT e.chave AS codigo,
              e.datahoracad AS data,
              COALESCE(c.nome,'') AS cliente,
              COALESCE(e.total,0) AS total,
              'entrada'::text AS mov
         FROM entradas e
    LEFT JOIN clifor c ON c.chave = e.chaveclifor
        ${clause}
     ORDER BY e.datahoracad`,
      params
    );

    return { resumo: normRows(resumo), docs: normRows(docs) };
  }

  if (mov === 'saidas') return await porClienteSaidas();
  if (mov === 'entradas') return await porClienteEntradas();

  // Ambos
  const S = await porClienteSaidas();
  const E = await porClienteEntradas();

  const map = new Map();
  for (const r of S.resumo) map.set(r.cliente, (map.get(r.cliente) || 0) + Number(r.total || 0));
  for (const r of E.resumo) map.set(r.cliente, (map.get(r.cliente) || 0) + Number(r.total || 0));

  const resumo = Array.from(map.entries())
    .map(([cliente, total]) => ({ cliente, total }))
    .sort((a, b) => Number(b.total) - Number(a.total));

  const docs = [...S.docs, ...E.docs].sort((a, b) => new Date(a.data) - new Date(b.data));
  return { resumo, docs };
}

// Handler “oficial”
ipcMain.handle('rel:porcliente:listar', async (_e, f) => _porClienteCore(f));
// ✅ Alias para compat: algumas telas chamam "rel:fat:porcliente:listar"
ipcMain.handle('rel:fat:porcliente:listar', async (_e, f) => _porClienteCore(f));

// ---------------------------- Histórico Comercial ----------------------------
ipcMain.handle('rel:historicocomercial:listar', async (_e, f = {}) => {
  const mov = (f.movimento || 'saidas').toLowerCase();     // 'saidas' | 'entradas' | 'ambos'
  const tipo = (f.tipoItem || 'produto').toLowerCase();    // 'produto' | 'servico' | 'ambos'

  async function saidaProdutos() {
    const { clause, params } = buildWhere('s', f);
    const { rows } = await db.query(
      `SELECT COALESCE(c.nome,'') AS cliente,
              COALESCE(p.nome, CONCAT('Produto #', ip.chaveproduto)) AS descricao,
              ip.qtde, ip.valorunit, ip.valortotal,
              'saída'::text AS mov,
              s.datahoracad AS data
         FROM itemsaidaprod ip
         JOIN saidas s  ON s.chave = ip.chavesaida
    LEFT JOIN clifor c ON c.chave = s.chaveclifor
    LEFT JOIN produtos p ON p.chave = ip.chaveproduto
        ${clause}
     ORDER BY s.datahoracad`,
      params
    );
    return rows;
  }

  async function saidaServicos() {
    const { clause, params } = buildWhere('s', f);
    const { rows } = await db.query(
      `SELECT COALESCE(c.nome,'') AS cliente,
              COALESCE(sv.nome, CONCAT('Serviço #', isv.chaveservico)) AS descricao,
              isv.qtde, isv.valorunit, isv.valortotal,
              'saída'::text AS mov,
              s.datahoracad AS data
         FROM itemsaidaserv isv
         JOIN saidas s  ON s.chave = isv.chavesaida
    LEFT JOIN clifor c ON c.chave = s.chaveclifor
    LEFT JOIN servicos sv ON sv.chave = isv.chaveservico
        ${clause}
     ORDER BY s.datahoracad`,
      params
    );
    return rows;
  }

  async function entradaProdutos() {
    const { clause, params } = buildWhere('e', f);
    const { rows } = await db.query(
      `SELECT COALESCE(c.nome,'') AS cliente,
              COALESCE(p.nome, CONCAT('Produto #', iep.chaveproduto)) AS descricao,
              iep.qtde, iep.valorunit, iep.valortotal,
              'entrada'::text AS mov,
              e.datahoracad AS data
         FROM itementradaprod iep
         JOIN entradas e ON e.chave = iep.chaveentrada
    LEFT JOIN clifor c ON c.chave = e.chaveclifor
    LEFT JOIN produtos p ON p.chave = iep.chaveproduto
        ${clause}
     ORDER BY e.datahoracad`,
      params
    );
    return rows;
  }

  async function entradaServicos() {
    const { clause, params } = buildWhere('e', f);
    const { rows } = await db.query(
      `SELECT COALESCE(c.nome,'') AS cliente,
              COALESCE(sv.nome, CONCAT('Serviço #', ies.chaveservico)) AS descricao,
              ies.qtde, ies.valorunit, ies.valortotal,
              'entrada'::text AS mov,
              e.datahoracad AS data
         FROM itementradaserv ies
         JOIN entradas e ON e.chave = ies.chaveentrada
    LEFT JOIN clifor c ON c.chave = e.chaveclifor
    LEFT JOIN servicos sv ON sv.chave = ies.chaveservico
        ${clause}
     ORDER BY e.datahoracad`,
      params
    );
    return rows;
  }

  let itens = [];

  if (mov === 'saidas' || mov === 'ambos') {
    if (tipo === 'produto' || tipo === 'ambos') itens = itens.concat(await saidaProdutos());
    if (tipo === 'servico' || tipo === 'ambos') itens = itens.concat(await saidaServicos());
  }
  if (mov === 'entradas' || mov === 'ambos') {
    if (tipo === 'produto' || tipo === 'ambos') itens = itens.concat(await entradaProdutos());
    if (tipo === 'servico' || tipo === 'ambos') itens = itens.concat(await entradaServicos());
  }

  itens = normRows(itens).sort((a, b) => new Date(a.data) - new Date(b.data));
  return { itens };
});
