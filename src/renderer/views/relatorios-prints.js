// src/renderer/views/relatorios-prints.js
window.renderRelFatDiario = function () {
  const { ipcRenderer } = require('electron');
  const $id = (x) => document.getElementById(x);
  const fmt2 = (n)=> (Number(n||0)).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
  const toYMD = (d)=> d.toISOString().slice(0,10);

  // período padrão = mês atual
  const now = new Date();
  const de  = new Date(now.getFullYear(), now.getMonth(), 1);
  const ate = new Date(now.getFullYear(), now.getMonth()+1, 0);

  const html = `
    <style>
      .rel-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
      .filters{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;align-items:end}
      .filters .row-lookup{display:grid;grid-template-columns:1fr auto;gap:6px}
      @media (max-width:1000px){ .filters{grid-template-columns:1fr 1fr} }
      .tbl{width:100%;border-collapse:separate;border-spacing:0}
      .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;text-align:left;font-size:13px}
      .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
      .right{text-align:right}
      .sum{margin-top:8px;font-weight:700}
      .actions{display:flex;gap:8px;justify-content:flex-start;margin-top:8px}
      .btn{padding:8px 12px;border:1px solid #dbe2ea;background:#fff;border-radius:8px;cursor:pointer}
      .btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
    </style>

    <div class="rel-shell">
      <h3>Faturamento Diário</h3>

      <div class="filters">
        <div><label>Período (de)</label><input type="date" id="rfd-de" class="input"></div>
        <div><label>Período (até)</label><input type="date" id="rfd-ate" class="input"></div>
        <div class="row-lookup">
          <div><label>Cliente (opcional)</label><input id="rfd-cli" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="rfd-cli-id"></div>
          <button id="rfd-lupa" class="btn">🔎</button>
        </div>
        <input type="hidden" id="rfd-cli-id">
        <div class="actions">
          <button class="btn primary" id="rfd-aplicar">Aplicar</button>
          <button class="btn" id="rfd-print">Imprimir</button>
          <button class="btn" id="rfd-csv">Exportar CSV</button>
        </div>
      </div>

      <div style="margin-top:12px">
        <table class="tbl" id="rfd-tbl">
          <thead><tr><th style="width:160px">Dia</th><th class="right">Valor</th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="sum" id="rfd-total"></div>
      </div>
    </div>
  `;

  async function load() {
    const params = {
      de:  $id('rfd-de').value || null,
      ate: $id('rfd-ate').value || null,
      chaveclifor: Number($id('rfd-cli-id').value || '') || null,
    };
    const rows = await ipcRenderer.invoke('rel:fatdiario', params);
    const tb = $id('rfd-tbl').querySelector('tbody');
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#64748b">Sem dados no período.</td></tr>`;
      $id('rfd-total').textContent = '';
      return;
    }
    tb.innerHTML = rows.map(r =>
      `<tr><td>${new Date(r.dia).toLocaleDateString('pt-BR')}</td><td class="right">R$ ${fmt2(r.valor)}</td></tr>`
    ).join('');
    const tot = rows.reduce((a,b)=>a+Number(b.valor||0),0);
    $id('rfd-total').textContent = `Total: R$ ${fmt2(tot)}`;
  }

  function wire() {
    // datas padrão
    $id('rfd-de').value  = toYMD(de);
    $id('rfd-ate').value = toYMD(ate);

    // lookup
    $id('rfd-lupa').onclick = () => {
      if (typeof openLookup!=='function') return toast?.('Lookup não carregado', true);
      openLookup('clientes', ({id,label}) => { $id('rfd-cli-id').value=id; $id('rfd-cli').value=label; });
    };

    $id('rfd-aplicar').onclick = load;

    // imprimir
    $id('rfd-print').onclick = () => {
      const area = document.querySelector('.rel-shell').innerHTML;
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Faturamento Diário</title>
        <style>body{font-family:system-ui,Segoe UI,Arial; padding:20px} .tbl{width:100%;border-collapse:collapse} .tbl th,.tbl td{border:1px solid #ddd;padding:8px} .right{text-align:right}</style>
      </head><body>${area}</body></html>`);
      w.document.close(); w.focus(); w.print(); w.close();
    };

    // CSV
    $id('rfd-csv').onclick = () => {
      const rows = [...$id('rfd-tbl').querySelectorAll('tbody tr')].map(tr =>
        [...tr.children].map(td => td.textContent.replace(/[R$\s]/g,'').replace('.', '').replace(',', '.'))
      );
      const csv = ['Dia,Valor', ...rows.map(r => `${r[0]},${r[1]}`)].join('\n');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'faturamento-diario.csv'; a.click(); URL.revokeObjectURL(url);
    };
  }

  return {
    title: 'Relatório – Faturamento Diário',
    html,
    afterRender(){ wire(); load(); }
  };
};


window.renderRelFatPorCliente = function () {
  const { ipcRenderer } = require('electron');
  const $ = (x)=>document.getElementById(x);
  const fmt2=(n)=> (Number(n||0)).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
  const toYMD = (d)=> d.toISOString().slice(0,10);
  const now = new Date();
  const de  = new Date(now.getFullYear(), now.getMonth(), 1);
  const ate = new Date(now.getFullYear(), now.getMonth()+1, 0);

  const html = `
    <style>
      .rel-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
      .filters{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;align-items:end}
      @media (max-width:1000px){ .filters{grid-template-columns:1fr 1fr} }
      .tbl{width:100%;border-collapse:separate;border-spacing:0}
      .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;text-align:left;font-size:13px}
      .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
      .right{text-align:right}
      .actions{display:flex;gap:8px;justify-content:flex-start;margin-top:8px}
      .btn{padding:8px 12px;border:1px solid #dbe2ea;background:#fff;border-radius:8px;cursor:pointer}
      .btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
    </style>

    <div class="rel-shell">
      <h3>Faturamento por Cliente</h3>

      <div class="filters">
        <div><label>Período (de)</label><input type="date" id="rpc-de" class="input"></div>
        <div><label>Período (até)</label><input type="date" id="rpc-ate" class="input"></div>
        <div class="actions">
          <button class="btn primary" id="rpc-aplicar">Aplicar</button>
          <button class="btn" id="rpc-print">Imprimir</button>
          <button class="btn" id="rpc-csv">Exportar CSV</button>
        </div>
      </div>

      <div style="margin-top:12px">
        <table class="tbl" id="rpc-tbl">
          <thead><tr><th>Cliente</th><th class="right">Valor</th></tr></thead>
          <tbody></tbody>
        </table>
        <div class="sum" id="rpc-total" style="margin-top:8px;font-weight:700"></div>
      </div>
    </div>
  `;

  async function load(){
    const rows = await ipcRenderer.invoke('rel:fatporcliente', { de:$('#rpc-de').value || null, ate:$('#rpc-ate').value || null });
    const tb = $('#rpc-tbl').querySelector('tbody');
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#64748b">Sem dados.</td></tr>`;
      $('#rpc-total').textContent = '';
      return;
    }
    tb.innerHTML = rows.map(r=> `<tr><td>${r.cliente}</td><td class="right">R$ ${fmt2(r.valor)}</td></tr>`).join('');
    const tot = rows.reduce((a,b)=>a+Number(b.valor||0),0);
    $('#rpc-total').textContent = `Total: R$ ${fmt2(tot)}`;
  }

  function wire(){
    $('#rpc-de').value=toYMD(de);
    $('#rpc-ate').value=toYMD(ate);
    $('#rpc-aplicar').onclick = load;
    $('#rpc-print').onclick = ()=>{ const html=document.querySelector('.rel-shell').innerHTML; const w=window.open('', '_blank'); w.document.write(`<html><head><title>Faturamento por Cliente</title><style>body{font-family:system-ui; padding:20px}.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{border:1px solid #ddd;padding:8px}.right{text-align:right}</style></head><body>${html}</body></html>`); w.document.close(); w.focus(); w.print(); w.close(); };
    $('#rpc-csv').onclick = ()=>{
      const rows=[...$('#rpc-tbl').querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td=>td.textContent));
      const csv=['Cliente,Valor', ...rows.map(r=>`${r[0]},${r[1].replace(/[R$\s]/g,'').replace('.', '').replace(',', '.')}`)].join('\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='faturamento-por-cliente.csv'; a.click(); URL.revokeObjectURL(url);
    };
  }

  return { title:'Relatório – Faturamento por Cliente', html, afterRender(){ wire(); load(); } };
};


window.renderRelHistoricoComercial = function () {
  const { ipcRenderer } = require('electron');
  const $ = (x)=>document.getElementById(x);
  const fmt2=(n)=> (Number(n||0)).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
  const toYMD = (d)=> d.toISOString().slice(0,10);
  const now = new Date();
  const de  = new Date(now.getFullYear(), now.getMonth(), 1);
  const ate = new Date(now.getFullYear(), now.getMonth()+1, 0);

  const html = `
    <style>
      .rel-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
      .filters{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;align-items:end}
      .filters .row-lookup{display:grid;grid-template-columns:1fr auto;gap:6px}
      @media (max-width:1000px){ .filters{grid-template-columns:1fr 1fr} }
      .tbl{width:100%;border-collapse:separate;border-spacing:0}
      .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;text-align:left;font-size:13px}
      .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
      .right{text-align:right}
      .actions{display:flex;gap:8px;justify-content:flex-start;margin-top:8px}
      .btn{padding:8px 12px;border:1px solid #dbe2ea;background:#fff;border-radius:8px;cursor:pointer}
      .btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
    </style>

    <div class="rel-shell">
      <h3>Histórico Comercial</h3>

      <div class="filters">
        <div><label>Período (de)</label><input type="date" id="rhc-de" class="input"></div>
        <div><label>Período (até)</label><input type="date" id="rhc-ate" class="input"></div>
        <div class="row-lookup">
          <div><label>Cliente (opcional)</label><input id="rhc-cli" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="rhc-cli-id"></div>
          <button id="rhc-lupa" class="btn">🔎</button>
        </div>
        <input type="hidden" id="rhc-cli-id">
        <div class="actions">
          <button class="btn primary" id="rhc-aplicar">Aplicar</button>
          <button class="btn" id="rhc-print">Imprimir</button>
          <button class="btn" id="rhc-csv">Exportar CSV</button>
        </div>
      </div>

      <div style="margin-top:12px">
        <table class="tbl" id="rhc-tbl">
          <thead>
            <tr>
              <th style="width:110px">Data</th>
              <th>Pedido (Cliente)</th>
              <th>Descrição</th>
              <th class="right" style="width:90px">Qtde</th>
              <th class="right" style="width:120px">Vlr Unit</th>
              <th class="right" style="width:120px">Vlr Total</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="sum" id="rhc-total" style="margin-top:8px;font-weight:700"></div>
      </div>
    </div>
  `;

  async function load(){
    const params = {
      de: $('#rhc-de').value || null,
      ate: $('#rhc-ate').value || null,
      chaveclifor: Number($('#rhc-cli-id').value || '') || null,
    };
    const rows = await ipcRenderer.invoke('rel:historico', params);
    const tb = $('#rhc-tbl').querySelector('tbody');
    if (!rows.length){
      tb.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b">Sem dados.</td></tr>`;
      $('#rhc-total').textContent = '';
      return;
    }
    tb.innerHTML = rows.map(r => `
      <tr>
        <td>${new Date(r.data).toLocaleDateString('pt-BR')}</td>
        <td>${r.cliente}</td>
        <td>${r.descricao}</td>
        <td class="right">${Number(r.qtde||0).toLocaleString('pt-BR',{minimumFractionDigits:3, maximumFractionDigits:3})}</td>
        <td class="right">R$ ${fmt2(r.valorunit)}</td>
        <td class="right">R$ ${fmt2(r.valortotal)}</td>
      </tr>
    `).join('');
    const tot = rows.reduce((a,b)=>a+Number(b.valortotal||0),0);
    $('#rhc-total').textContent = `Total do período: R$ ${fmt2(tot)}`;
  }

  function wire(){
    $('#rhc-de').value = toYMD(de);
    $('#rhc-ate').value = toYMD(ate);

    $('#rhc-lupa').onclick = ()=>{
      if (typeof openLookup!=='function') return toast?.('Lookup não carregado',true);
      openLookup('clientes', ({id,label})=>{ $('#rhc-cli-id').value=id; $('#rhc-cli').value=label; });
    };
    $('#rhc-aplicar').onclick = load;

    $('#rhc-print').onclick = ()=>{
      const html = document.querySelector('.rel-shell').innerHTML;
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>Histórico Comercial</title>
        <style>body{font-family:system-ui; padding:20px}.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{border:1px solid #ddd;padding:6px}.right{text-align:right}</style>
      </head><body>${html}</body></html>`);
      w.document.close(); w.focus(); w.print(); w.close();
    };

    $('#rhc-csv').onclick = ()=>{
      const rows=[...$('#rhc-tbl').querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td=>td.textContent));
      const head='Data,Cliente,Descricao,Qtde,ValorUnit,ValorTotal';
      const csv=[head, ...rows.map(r=>{
        const qt = r[3].replace(/\./g,'').replace(',','.');
        const vu = r[4].replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.');
        const vt = r[5].replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.');
        return `${r[0]},${r[1]},${r[2]},${qt},${vu},${vt}`;
      })].join('\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='historico-comercial.csv'; a.click(); URL.revokeObjectURL(url);
    };
  }

  return { title:'Relatório – Histórico Comercial', html, afterRender(){ wire(); load(); } };
};
