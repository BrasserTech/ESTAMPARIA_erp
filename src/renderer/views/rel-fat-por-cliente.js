// src/renderer/views/rel-fat-por-cliente.js
window.renderRelFatPorCliente = function () {
  const html = `
    <style>
      .rep-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
      .filters{display:grid;gap:12px;grid-template-columns:repeat(6,1fr);align-items:end}
      @media (max-width:1200px){ .filters{grid-template-columns:1fr 1fr 1fr} }
      @media (max-width:800px){ .filters{grid-template-columns:1fr 1fr} }
      .label{font-weight:600;color:#0f172a;font-size:13px}
      .row-lookup{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}
      .section{margin-top:16px}
      .card{border:1px solid #e5eaf0;border-radius:12px;background:#fbfdff;overflow:hidden}
      .card-head{padding:10px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
      .card-body{padding:14px}
      .tbl{width:100%;border-collapse:separate;border-spacing:0}
      .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;font-size:13px;text-align:left}
      .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
      .txt-right{text-align:right}
      .actions{display:flex;gap:8px;align-items:center}
      .muted{color:#64748b}
    </style>

    <div class="rep-shell">
      <div class="card">
        <div class="card-head">Filtros</div>
        <div class="card-body">
          <div class="filters">
            <div>
              <label class="label">De</label>
              <input type="date" id="rc-de" class="input"/>
            </div>
            <div>
              <label class="label">Até</label>
              <input type="date" id="rc-ate" class="input"/>
            </div>

            <div>
              <label class="label">Cliente (opcional)</label>
              <div class="row-lookup">
                <input id="rc-cli" class="input" placeholder="F8 para pesquisar" />
                <button id="rc-cli-lupa" class="button outline" type="button">🔎</button>
              </div>
              <input type="hidden" id="rc-cli-id"/>
            </div>

            <div>
              <label class="label">Movimento</label>
              <select id="rc-mov" class="select">
                <option value="saidas">Saídas (vendas)</option>
                <option value="entradas">Entradas (compras)</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>

            <div class="actions" style="grid-column: span 2; justify-content:flex-start">
              <button id="rc-aplicar" class="button">Aplicar</button>
              <button id="rc-limpar" class="button outline">Limpar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="section card">
        <div class="card-head">Totais por Cliente</div>
        <div class="card-body">
          <table class="tbl" id="rc-tbl-resumo">
            <thead>
              <tr>
                <th>Cliente / Fornecedor</th>
                <th class="txt-right">Total (R$)</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody><tr><td colspan="3" class="muted">Aguardando…</td></tr></tbody>
          </table>
        </div>
      </div>

      <div class="section card">
        <div class="card-head">Documentos</div>
        <div class="card-body">
          <table class="tbl" id="rc-tbl-docs">
            <thead>
              <tr>
                <th>Código</th>
                <th>Data</th>
                <th>Cliente / Fornecedor</th>
                <th class="txt-right">Total (R$)</th>
                <th>Mov</th>
              </tr>
            </thead>
            <tbody><tr><td colspan="5" class="muted">Aguardando…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  function afterRender() {
    const { ipcRenderer } = require('electron');
    const $ = (sel) => document.querySelector(sel);

    const todayISO = () => new Date().toISOString().slice(0, 10);
    const firstDayMonth = () => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    };
    const money = (n) =>
      Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const fmtDate = (v) => {
      if (!v) return '';
      const s = String(v);
      const m1 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m1) return `${m1[3]}/${m1[2]}/${m1[1]}`;
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
      }
      return s;
    };

    // defaults
    $('#rc-de').value = firstDayMonth();
    $('#rc-ate').value = todayISO();

    // lookup de CLIENTES (F8/lupa)
    const wireLookupClientes = () => {
      const open = () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        // importante: chave "clientes" (mapeia para clifor)
        openLookup('clientes', ({ id, label }) => {
          $('#rc-cli-id').value = String(id);
          $('#rc-cli').value = label;
        });
      };
      $('#rc-cli-lupa').onclick = open;
      // F8 no input
      $('#rc-cli').addEventListener('keydown', (e) => {
        if (e.key === 'F8') { e.preventDefault(); open(); }
      });
    };
    wireLookupClientes();

    $('#rc-limpar').onclick = () => {
      $('#rc-de').value = firstDayMonth();
      $('#rc-ate').value = todayISO();
      $('#rc-cli').value = '';
      $('#rc-cli-id').value = '';
      $('#rc-mov').value = 'saidas';
      $('#rc-tbl-resumo tbody').innerHTML = `<tr><td colspan="3" class="muted">Aguardando…</td></tr>`;
      $('#rc-tbl-docs tbody').innerHTML   = `<tr><td colspan="5" class="muted">Aguardando…</td></tr>`;
    };

    $('#rc-aplicar').onclick = load;
    load().catch(console.error);

    async function load() {
      try {
        const filtros = {
          dtini: $('#rc-de').value || null,
          dtfim: $('#rc-ate').value || null,
          clienteId: Number($('#rc-cli-id').value || '') || null, // <<< agora filtra por cliente
          movimento: $('#rc-mov').value || 'saidas',
        };

        // handler do backend (alias também funciona: 'rel:fat:porcliente:listar')
        const resp = await ipcRenderer.invoke('rel:porcliente:listar', filtros);
        const resumo = Array.isArray(resp?.resumo) ? resp.resumo : [];
        const docs   = Array.isArray(resp?.docs)   ? resp.docs   : [];

        // Totais
        $('#rc-tbl-resumo tbody').innerHTML =
          (resumo.length
            ? resumo.map(r => `
                <tr>
                  <td>${r.cliente ?? ''}</td>
                  <td class="txt-right">${money(r.total)}</td>
                  <td>${(filtros.movimento === 'ambos' ? (r.origem || '-') : (filtros.movimento === 'saidas' ? 'Saídas' : 'Entradas'))}</td>
                </tr>
              `).join('')
            : `<tr><td colspan="3" class="muted">Sem dados para os filtros informados.</td></tr>`
          );

        // Documentos
        $('#rc-tbl-docs tbody').innerHTML =
          (docs.length
            ? docs.map(d => `
                <tr>
                  <td>${d.codigo}</td>
                  <td>${fmtDate(d.data)}</td>
                  <td>${d.cliente ?? ''}</td>
                  <td class="txt-right">${money(d.total)}</td>
                  <td>${(d.mov || '').toString().charAt(0).toUpperCase() + (d.mov || '').toString().slice(1)}</td>
                </tr>
              `).join('')
            : `<tr><td colspan="5" class="muted">Sem documentos no período.</td></tr>`
          );
      } catch (err) {
        console.error(err);
        toast('Erro ao consultar: ' + err.message, true);
      }
    }
  }

  return { title: 'Relatório: Faturamento por Cliente', html, afterRender };
};
