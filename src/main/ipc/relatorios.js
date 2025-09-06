// src/main/ipc/relatorios.js
const { ipcMain } = require('electron');
const db = require('../../database');

// helper para montar WHERE sem “AND solto”
function addCond(where, params, cond, value) {
  if (value === null || value === undefined || value === '') return;
  where.push(cond);
  params.push(value);
}

// --------------------------------------------------------------
// FATURAMENTO DIÁRIO
// --------------------------------------------------------------
ipcMain.handle('rel:fat:diario:listar', async (_e, payload = {}) => {
  const {
    dtini = null,
    dtfim = null,
    cliforId = null,
    empresaId = null,
    movimento = 'saidas' // 'saidas' | 'entradas' | 'ambos'
  } = payload;

  // ---------- WHERE SAIDAS ----------
  const wS = ['1=1'];
  const pS = [];
  if (dtini) addCond(wS, pS, `s.datahoracad::date >= $${pS.length + 1}`, dtini);
  if (dtfim) addCond(wS, pS, `s.datahoracad::date <= $${pS.length + 1}`, dtfim);
  if (cliforId) addCond(wS, pS, `s.chaveclifor = $${pS.length + 1}`, cliforId);

  // empresa via itens (produto/serviço) — EXISTE pelo menos um item da empresa
  if (empresaId) {
    addCond(
      wS,
      pS,
      `(
        EXISTS (
          SELECT 1
            FROM itemsaidaprod ip
            JOIN produtos p ON p.chave = ip.chaveproduto
           WHERE ip.chavesaida = s.chave
             AND p.chaveemp = $${pS.length + 1}
        )
        OR EXISTS (
          SELECT 1
            FROM itemsaidaserv isv
            JOIN servicos sv ON sv.chave = isv.chaveservico
           WHERE isv.chavesaida = s.chave
             AND sv.chaveemp = $${pS.length + 1}
        )
      )`,
      empresaId
    );
  }

  // ---------- WHERE ENTRADAS ----------
  const wE = ['1=1'];
  const pE = [];
  if (dtini) addCond(wE, pE, `e.datahoracad::date >= $${pE.length + 1}`, dtini);
  if (dtfim) addCond(wE, pE, `e.datahoracad::date <= $${pE.length + 1}`, dtfim);
  if (cliforId) addCond(wE, pE, `e.chaveclifor = $${pE.length + 1}`, cliforId);

  if (empresaId) {
    addCond(
      wE,
      pE,
      `(
        EXISTS (
          SELECT 1
            FROM itementradaprod iep
            JOIN produtos p  ON p.chave = iep.chaveproduto
           WHERE iep.chaveentrada = e.chave
             AND p.chaveemp = $${pE.length + 1}
        )
        OR EXISTS (
          SELECT 1
            FROM itementradaserv ies
            JOIN servicos sv ON sv.chave = ies.chaveservico
           WHERE ies.chaveentrada = e.chave
             AND sv.chaveemp = $${pE.length + 1}
        )
      )`,
      empresaId
    );
  }

  // --------- POR DIA ---------
  let porDia = [];
  let totalPeriodo = 0;

  if (movimento === 'saidas' || movimento === 'ambos') {
    const { rows } = await db.query(
      `SELECT date_trunc('day', s.datahoracad)::date AS dia,
              SUM(COALESCE(s.total,0))::numeric AS total
         FROM saidas s
        WHERE ${wS.join(' AND ')}
     GROUP BY 1
     ORDER BY 1`,
      pS
    );
    porDia = rows.map(r => ({ dia: r.dia, total: Number(r.total || 0) }));
    totalPeriodo += porDia.reduce((a, b) => a + (b.total || 0), 0);
  }

  if (movimento === 'entradas' || movimento === 'ambos') {
    const { rows } = await db.query(
      `SELECT date_trunc('day', e.datahoracad)::date AS dia,
              SUM(COALESCE(e.total,0))::numeric AS total
         FROM entradas e
        WHERE ${wE.join(' AND ')}
     GROUP BY 1
     ORDER BY 1`,
      pE
    );
    const arr = rows.map(r => ({ dia: r.dia, total: Number(r.total || 0) }));

    if (movimento === 'ambos') {
      // soma por dia
      const map = new Map(porDia.map(x => [String(x.dia), x.total]));
      for (const r of arr) {
        const k = String(r.dia);
        map.set(k, (map.get(k) || 0) + r.total);
      }
      porDia = [...map.entries()]
        .map(([dia, total]) => ({ dia, total }))
        .sort((a, b) => new Date(a.dia) - new Date(b.dia));
      totalPeriodo = porDia.reduce((a, b) => a + (b.total || 0), 0);
    } else {
      porDia = arr;
      totalPeriodo = porDia.reduce((a, b) => a + (b.total || 0), 0);
    }
  }

  // --------- DOCUMENTOS (lista) ---------
  let documentos = [];
  if (movimento === 'saidas' || movimento === 'ambos') {
    const rows = (
      await db.query(
        `SELECT s.chave AS codigo,
                s.datahoracad::date AS data,
                COALESCE(c.nome,'') AS clifor,
                COALESCE(s.total,0)::numeric AS total
           FROM saidas s
      LEFT JOIN clifor c ON c.chave = s.chaveclifor
          WHERE ${wS.join(' AND ')}
       ORDER BY s.datahoracad`,
        pS
      )
    ).rows.map(r => ({ ...r, total: Number(r.total || 0), mov: 'Saída' }));
    documentos = documentos.concat(rows);
  }

  if (movimento === 'entradas' || movimento === 'ambos') {
    const rows = (
      await db.query(
        `SELECT e.chave AS codigo,
                e.datahoracad::date AS data,
                COALESCE(c.nome,'') AS clifor,
                COALESCE(e.total,0)::numeric AS total
           FROM entradas e
      LEFT JOIN clifor c ON c.chave = e.chaveclifor
          WHERE ${wE.join(' AND ')}
       ORDER BY e.datahoracad`,
        pE
      )
    ).rows.map(r => ({ ...r, total: Number(r.total || 0), mov: 'Entrada' }));
    documentos = documentos.concat(rows);
  }

  // ordena por data quando for “ambos”
  documentos.sort((a, b) => new Date(a.data) - new Date(b.data));

  return { totalPeriodo, porDia, documentos };
});

// --------------------------------------------------------------
// FATURAMENTO POR CLIENTE
// --------------------------------------------------------------
ipcMain.handle('rel:fat:porcliente:listar', async (_e, payload = {}) => {
  const {
    dtini = null,
    dtfim = null,
    empresaId = null,
    movimento = 'saidas' // 'saidas' | 'entradas' | 'ambos'
  } = payload;

  const out = [];

  // SAÍDAS
  if (movimento === 'saidas' || movimento === 'ambos') {
    const w = ['1=1'];
    const p = [];
    if (dtini) addCond(w, p, `s.datahoracad::date >= $${p.length + 1}`, dtini);
    if (dtfim) addCond(w, p, `s.datahoracad::date <= $${p.length + 1}`, dtfim);

    if (empresaId) {
      addCond(
        w,
        p,
        `(
          EXISTS (
            SELECT 1
              FROM itemsaidaprod ip
              JOIN produtos p2 ON p2.chave = ip.chaveproduto
             WHERE ip.chavesaida = s.chave
               AND p2.chaveemp = $${p.length + 1}
          )
          OR EXISTS (
            SELECT 1
              FROM itemsaidaserv isv
              JOIN servicos sv ON sv.chave = isv.chaveservico
             WHERE isv.chavesaida = s.chave
               AND sv.chaveemp = $${p.length + 1}
          )
        )`,
        empresaId
      );
    }

    const { rows } = await db.query(
      `SELECT COALESCE(c.nome,'(Sem cliente)') AS nome,
              SUM(COALESCE(s.total,0))::numeric AS total
         FROM saidas s
    LEFT JOIN clifor c ON c.chave = s.chaveclifor
        WHERE ${w.join(' AND ')}
     GROUP BY 1
     ORDER BY total DESC NULLS LAST, nome`,
      p
    );

    out.push(...rows.map(r => ({ tipo: 'Saídas', nome: r.nome, total: Number(r.total || 0) })));
  }

  // ENTRADAS
  if (movimento === 'entradas' || movimento === 'ambos') {
    const w = ['1=1'];
    const p = [];
    if (dtini) addCond(w, p, `e.datahoracad::date >= $${p.length + 1}`, dtini);
    if (dtfim) addCond(w, p, `e.datahoracad::date <= $${p.length + 1}`, dtfim);

    if (empresaId) {
      addCond(
        w,
        p,
        `(
          EXISTS (
            SELECT 1
              FROM itementradaprod iep
              JOIN produtos p2 ON p2.chave = iep.chaveproduto
             WHERE iep.chaveentrada = e.chave
               AND p2.chaveemp = $${p.length + 1}
          )
          OR EXISTS (
            SELECT 1
              FROM itementradaserv ies
              JOIN servicos sv ON sv.chave = ies.chaveservico
             WHERE ies.chaveentrada = e.chave
               AND sv.chaveemp = $${p.length + 1}
          )
        )`,
        empresaId
      );
    }

    const { rows } = await db.query(
      `SELECT COALESCE(c.nome,'(Sem fornecedor)') AS nome,
              SUM(COALESCE(e.total,0))::numeric AS total
         FROM entradas e
    LEFT JOIN clifor c ON c.chave = e.chaveclifor
        WHERE ${w.join(' AND ')}
     GROUP BY 1
     ORDER BY total DESC NULLS LAST, nome`,
      p
    );

    out.push(...rows.map(r => ({ tipo: 'Entradas', nome: r.nome, total: Number(r.total || 0) })));
  }

  return out;
});

// --------------------------------------------------------------
// HISTÓRICO COMERCIAL (itens)
// --------------------------------------------------------------
ipcMain.handle('rel:hist:comercial:listar', async (_e, payload = {}) => {
  const {
    dtini = null,
    dtfim = null,
    cliforId = null,
    empresaId = null,
    movimento = 'saidas' // 'saidas' | 'entradas' | 'ambos'
  } = payload;

  const rowsOut = [];

  // SAÍDAS -> itens de produto + serviço
  if (movimento === 'saidas' || movimento === 'ambos') {
    const w = ['1=1'];
    const p = [];
    if (dtini) addCond(w, p, `s.datahoracad::date >= $${p.length + 1}`, dtini);
    if (dtfim) addCond(w, p, `s.datahoracad::date <= $${p.length + 1}`, dtfim);
    if (cliforId) addCond(w, p, `s.chaveclifor = $${p.length + 1}`, cliforId);

    // PRODUTOS
    const { rows: rp } = await db.query(
      `SELECT s.chave AS codigo,
              s.datahoracad::date AS data,
              COALESCE(c.nome,'') AS cliente,
              p.nome AS descricao,
              ip.qtde,
              ip.valorunit,
              ip.valortotal
         FROM itemsaidaprod ip
         JOIN saidas s   ON s.chave = ip.chavesaida
    LEFT JOIN clifor c   ON c.chave = s.chaveclifor
         JOIN produtos p ON p.chave = ip.chaveproduto
        WHERE ${w.join(' AND ')}
          ${empresaId ? `AND p.chaveemp = $${p.length + 1}` : ''}
     ORDER BY s.datahoracad`,
      empresaId ? [...p, empresaId] : p
    );
    rowsOut.push(...rp.map(r => ({ mov: 'Saída', ...r })));

    // SERVIÇOS
    const { rows: rs } = await db.query(
      `SELECT s.chave AS codigo,
              s.datahoracad::date AS data,
              COALESCE(c.nome,'') AS cliente,
              sv.nome AS descricao,
              isv.qtde,
              isv.valorunit,
              isv.valortotal
         FROM itemsaidaserv isv
         JOIN saidas s    ON s.chave = isv.chavesaida
    LEFT JOIN clifor c    ON c.chave = s.chaveclifor
         JOIN servicos sv ON sv.chave = isv.chaveservico
        WHERE ${w.join(' AND ')}
          ${empresaId ? `AND sv.chaveemp = $${p.length + (empresaId ? 1 : 0) + 1}` : ''}
     ORDER BY s.datahoracad`,
      empresaId ? [...p, empresaId] : p
    );
    rowsOut.push(...rs.map(r => ({ mov: 'Saída', ...r })));
  }

  // ENTRADAS -> itens de produto + serviço
  if (movimento === 'entradas' || movimento === 'ambos') {
    const w = ['1=1'];
    const p = [];
    if (dtini) addCond(w, p, `e.datahoracad::date >= $${p.length + 1}`, dtini);
    if (dtfim) addCond(w, p, `e.datahoracad::date <= $${p.length + 1}`, dtfim);
    if (cliforId) addCond(w, p, `e.chaveclifor = $${p.length + 1}`, cliforId);

    const { rows: rp } = await db.query(
      `SELECT e.chave AS codigo,
              e.datahoracad::date AS data,
              COALESCE(c.nome,'') AS cliente,
              p.nome AS descricao,
              ip.qtde,
              ip.valorunit,
              ip.valortotal
         FROM itementradaprod ip
         JOIN entradas e  ON e.chave = ip.chaveentrada
    LEFT JOIN clifor c    ON c.chave = e.chaveclifor
         JOIN produtos p  ON p.chave = ip.chaveproduto
        WHERE ${w.join(' AND ')}
          ${empresaId ? `AND p.chaveemp = $${p.length + 1}` : ''}
     ORDER BY e.datahoracad`,
      empresaId ? [...p, empresaId] : p
    );
    rowsOut.push(...rp.map(r => ({ mov: 'Entrada', ...r })));

    const { rows: rs } = await db.query(
      `SELECT e.chave AS codigo,
              e.datahoracad::date AS data,
              COALESCE(c.nome,'') AS cliente,
              sv.nome AS descricao,
              isv.qtde,
              isv.valorunit,
              isv.valortotal
         FROM itementradaserv isv
         JOIN entradas e  ON e.chave = isv.chaveentrada
    LEFT JOIN clifor c    ON c.chave = e.chaveclifor
         JOIN servicos sv ON sv.chave = isv.chaveservico
        WHERE ${w.join(' AND ')}
          ${empresaId ? `AND sv.chaveemp = $${p.length + (empresaId ? 1 : 0) + 1}` : ''}
     ORDER BY e.datahoracad`,
      empresaId ? [...p, empresaId] : p
    );
    rowsOut.push(...rs.map(r => ({ mov: 'Entrada', ...r })));
  }

  // ordena por data / codigo
  rowsOut.sort((a, b) => {
    const dd = new Date(a.data) - new Date(b.data);
    return dd || (a.codigo - b.codigo);
  });

  return rowsOut.map(r => ({
    ...r,
    qtde: Number(r.qtde || 0),
    valorunit: Number(r.valorunit || 0),
    valortotal: Number(r.valortotal || 0)
  }));
});
