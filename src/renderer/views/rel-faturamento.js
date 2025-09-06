// src/renderer/views/rel-faturamento.js
window.renderRelFaturamento = function () {
  const { ipcRenderer } = require('electron');

  const html = `
    <style>
      .total-card{
        display:flex; align-items:center; justify-content:center;
        min-height:92px;
      }
      .big-total{
        font-size: 38px;
        font-weight: 800;
        color:#1d2a44;
        letter-spacing:.3px;
        text-align:center;
      }
      .big-total small{
        display:block;
        font-size:12px;
        font-weight:700;
        color:#6b7c93;
        letter-spacing:.4px;
        margin-bottom:2px;
        text-transform:uppercase;
      }
      .tbl{width:100%; border-collapse:separate; border-spacing:0}
      .tbl thead th{background:#f6f8fc; border-bottom:1px solid #e7edf7; padding:10px; font-size:13px; text-align:left; color:#0f2544}
      .tbl tbody td{border-bottom:1px solid #eef2f7; padding:10px}
      .txt-right{text-align:right}
      .filters{display:grid; gap:12px; grid-template-columns:repeat(6,1fr)}
      @media (max-width:1200px){ .filters{grid-template-columns:1fr 1fr 1fr} }
      @media (max-width:800px){ .filters{grid-template-columns:1fr 1fr} }
      .row-lookup{display:grid; grid-template-columns:1fr auto; gap:6px; align-items:end}
    </style>

    <div class="card">
      <h3 style="margin-top:0">Relatório: Faturamento</h3>

      <div class="filters">
        <div>
          <label class="label">De</label>
          <input type="date" id="fat-dtini" class="input"/>
        </div>
        <div>
          <label class="label">Até</label>
          <input type="date" id="fat-dtfim" class="input"/>
        </div>

        <div>
          <label class="label">Cliente (opcional)</label>
          <div class="row-lookup">
            <input id="fat-cli" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="fat-cli-id"/>
            <button id="fat-cli-lupa" class="button outline" type="button">🔎</button>
          </div>
          <input type="hidden" id="fat-cli-id"/>
        </div>

        <div>
          <label class="label">Empresa (opcional)</label>
          <div class="row-lookup">
            <input id="fat-emp" class="input" placeholder="F8 para pesquisar" data-lookup="empresas" data-target-id="fat-emp-id"/>
            <button id="fat-emp-lupa" class="button outline" type="button">🔎</button>
          </div>
          <input type="hidden" id="fat-emp-id"/>
        </div>

        <div>
          <label class="label">Movimento</label>
          <select id="fat-mov" class="select">
            <option value="saidas">Saídas (vendas)</option>
            <option value="entradas">Entradas (compras)</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>

        <div style="display:flex; gap:8px; align-items:end">
          <button id="fat-aplicar" class="button">Aplicar</button>
          <button id="fat-limpar" class="button outline">Limpar</button>
        </div>
      </div>
    </div>

    <div class="card total-card">
      <div class="big-total" id="fat-total">
        <small>Total do Período</small>
        R$ 0,00
      </div>
    </div>

    <div class="card">
      <h3>Totais por Dia</h3>
      <table class="tbl" id="fat-dia-tbl">
        <thead>
          <tr>
            <th>Dia</th>
            <th class="txt-right">Total (R$)</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="card">
      <h3>Documentos (Saídas/Entradas)</h3>
      <table class="tbl" id="fat-docs-tbl">
        <thead>
          <tr>
            <th>Código</th>
            <th>Data</th>
            <th>Cliente / Fornecedor</th>
            <th class="txt-right">Total (R$)</th>
            <th>Mov</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  function afterRender () {
    const $ = (sel) => document.querySelector(sel);

    // helpers
    const todayISO = () => new Date().toISOString().slice(0,10);
    const firstDayMonth = () => {
      const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
    };
    const fmtMoney = (v) => Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const fmtDateBR = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    };

    // defaults
    $('#fat-dtini').value = firstDayMonth();
    $('#fat-dtfim').value = todayISO();

    // lookup buttons (mantém F8 funcionando)
    const wireLookup = (btnId, inputId, key) => {
      $(btnId).onclick = () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup(key, ({ id, label }) => {
          $(`#${inputId}-id`).value = String(id);
          $(`#${inputId}`).value = label;
        });
      };
    };
    wireLookup('#fat-cli-lupa', 'fat-cli', 'clientes');
    wireLookup('#fat-emp-lupa', 'fat-emp', 'empresas');

    // limpar
    $('#fat-limpar').onclick = () => {
      $('#fat-dtini').value = firstDayMonth();
      $('#fat-dtfim').value = todayISO();
      $('#fat-cli').value = ''; $('#fat-cli-id').value = '';
      $('#fat-emp').value = ''; $('#fat-emp-id').value = '';
      $('#fat-mov').value = 'saidas';
      renderTotal(0);
      renderPorDia([]);
      renderDocs([]);
    };

    // aplicar
    $('#fat-aplicar').onclick = load;

    async function load() {
      const filtros = {
        dtini: $('#fat-dtini').value || null,
        dtfim: $('#fat-dtfim').value || null,
        cliforId: Number($('#fat-cli-id').value || '') || null,
        empresaId: Number($('#fat-emp-id').value || '') || null,
        movimento: $('#fat-mov').value || 'saidas'
      };

      try{
        const res = await ipcRenderer.invoke('rel:fatdiario:listar', filtros);
        const porDia = res.porDia || [];
        const docs  = res.docs  || [];

        // total pode vir como totalPeriodo OU total; se nenhum, soma porDia
        let total = 0;
        if (typeof res.totalPeriodo === 'number') total = res.totalPeriodo;
        else if (typeof res.total === 'number')     total = res.total;
        else total = porDia.reduce((s, r) => s + Number(r.total || 0), 0);

        renderTotal(total);
        renderPorDia(porDia);
        renderDocs(docs);
      }catch(err){
        toast('Erro ao consultar: ' + err.message, true);
        console.error(err);
      }
    }

    function renderTotal(total){
      const el = document.getElementById('fat-total');
      el.innerHTML = `<small>Total do Período</small>R$ ${fmtMoney(total)}`;
    }

    function renderPorDia(rows){
      const tb = $('#fat-dia-tbl tbody');
      if(!rows.length){
        tb.innerHTML = `<tr><td colspan="2" class="muted">Sem dados</td></tr>`;
        return;
      }
      tb.innerHTML = rows.map(r => `
        <tr>
          <td>${fmtDateBR(r.dia)}</td>
          <td class="txt-right">R$ ${fmtMoney(r.total)}</td>
        </tr>
      `).join('');
    }

    function renderDocs(rows){
      const tb = $('#fat-docs-tbl tbody');
      if(!rows.length){
        tb.innerHTML = `<tr><td colspan="5" class="muted">Sem dados</td></tr>`;
        return;
      }
      tb.innerHTML = rows.map(r => `
        <tr>
          <td>${r.codigo}</td>
          <td>${fmtDateBR(r.data)}</td>
          <td>${r.cliente || ''}</td>
          <td class="txt-right">R$ ${fmtMoney(r.total)}</td>
          <td>${(r.mov || '').charAt(0).toUpperCase() + (r.mov || '').slice(1)}</td>
        </tr>
      `).join('');
    }

    // carrega ao abrir
    load();
  };

  return { title: 'Relatório: Faturamento', html, afterRender };
};
