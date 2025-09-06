// src/renderer/views/rel-historico-comercial.js
window.renderRelHistoricoComercial = function () {
  const { ipcRenderer, shell } = require('electron');

  const html = `
    <style>
      .filters{display:grid; gap:12px; grid-template-columns:repeat(6,1fr)}
      @media (max-width:1200px){ .filters{grid-template-columns:1fr 1fr 1fr} }
      @media (max-width:800px){ .filters{grid-template-columns:1fr 1fr} }
      .row-lookup{display:grid; grid-template-columns:1fr auto; gap:6px; align-items:end}
      .btns{display:flex; gap:8px; align-items:end}
      .tbl{width:100%; border-collapse:separate; border-spacing:0}
      .tbl thead th{background:#f6f8fc; border-bottom:1px solid #e7edf7; padding:10px; font-size:13px; text-align:left; color:#0f2544}
      .tbl tbody td{border-bottom:1px solid #eef2f7; padding:10px}
      .txt-right{text-align:right}
      .muted{color:#6b7c93}
    </style>

    <div class="card">
      <h3 style="margin-top:0">Relatório: Histórico Comercial</h3>

      <div class="filters">
        <div>
          <label class="label">De</label>
          <input type="date" id="hc-dtini" class="input"/>
        </div>
        <div>
          <label class="label">Até</label>
          <input type="date" id="hc-dtfim" class="input"/>
        </div>

        <div>
          <label class="label">Cliente (opcional)</label>
          <div class="row-lookup">
            <input id="hc-cli" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="hc-cli-id"/>
            <button id="hc-cli-lupa" class="button outline" type="button">🔎</button>
          </div>
          <input type="hidden" id="hc-cli-id"/>
        </div>

        <div>
          <label class="label">Movimento</label>
          <select id="hc-mov" class="select">
            <option value="saidas">Saídas</option>
            <option value="entradas">Entradas</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>

        <div>
          <label class="label">Tipo de Item</label>
          <select id="hc-tipo" class="select">
            <option value="produto">Produto</option>
            <option value="servico">Serviço</option>
            <option value="ambos">Ambos</option>
          </select>
        </div>

        <div class="btns">
          <button id="hc-aplicar" class="button">Aplicar</button>
          <button id="hc-limpar" class="button outline">Limpar</button>
          <button id="hc-pdf" class="button outline">Baixar PDF</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Itens</h3>
      <table class="tbl" id="hc-itens">
        <thead><tr>
          <th>Data</th><th>Mov</th><th>Cliente/Fornec</th><th>Descrição</th>
          <th class="txt-right">Qtde</th><th class="txt-right">Vlr Unit</th><th class="txt-right">Total</th>
        </tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  function afterRender(){
    const $ = (s)=>document.querySelector(s);
    const todayISO = () => new Date().toISOString().slice(0,10);
    const firstDayMonth = () => { const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); };
    const fmtMoney = (v)=> Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    const fmtDateBR = (iso)=>{ if(!iso) return ''; const d=new Date(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };

    $('#hc-dtini').value = firstDayMonth();
    $('#hc-dtfim').value = todayISO();

    const wireLookup = (btnSel, inputId, key) => {
      $(btnSel).onclick = () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup(key, ({ id, label }) => {
          $(`#${inputId}-id`).value = String(id);
          $(`#${inputId}`).value = label;
        });
      };
    };
    wireLookup('#hc-cli-lupa', 'hc-cli', 'clientes');

    let last = { filtros:null, itens:[] };

    $('#hc-limpar').onclick = () => {
      $('#hc-dtini').value = firstDayMonth();
      $('#hc-dtfim').value = todayISO();
      $('#hc-cli').value = ''; $('#hc-cli-id').value = '';
      $('#hc-mov').value = 'saidas';
      $('#hc-tipo').value = 'produto';
      renderItens([]); last = { filtros:null, itens:[] };
    };

    $('#hc-aplicar').onclick = load;
    $('#hc-pdf').onclick = async ()=>{ if(!last.filtros) await load(); await exportPDF(); };

    async function load(){
      const filtros = {
        dtini: $('#hc-dtini').value || null,
        dtfim: $('#hc-dtfim').value || null,
        cliforId: Number($('#hc-cli-id').value || '') || null,
        movimento: $('#hc-mov').value || 'saidas',
        tipoItem:  $('#hc-tipo').value || 'produto'
      };
      try{
        const res = await ipcRenderer.invoke('rel:historicocomercial:listar', filtros);
        last = { filtros, itens: res.itens || [] };
        renderItens(last.itens);
      }catch(e){
        toast('Erro ao consultar: '+e.message, true);
      }
    }

    function renderItens(rows){
      const tb = $('#hc-itens tbody');
      if(!rows.length){ tb.innerHTML = `<tr><td colspan="7" class="muted">Sem dados</td></tr>`; return; }
      tb.innerHTML = rows.map(r=>`
        <tr>
          <td>${fmtDateBR(r.data)}</td>
          <td>${r.mov || ''}</td>
          <td>${r.cliente || ''}</td>
          <td>${r.descricao || ''}</td>
          <td class="txt-right">${Number(r.qtde||0).toFixed(3)}</td>
          <td class="txt-right">${fmtMoney(r.valorunit)}</td>
          <td class="txt-right">${fmtMoney(r.valortotal)}</td>
        </tr>`).join('');
    }

    function buildPdfHtml(){
      const f = last.filtros || {};
      const fmt = (v)=> (v? new Date(v).toLocaleDateString('pt-BR') : '');
      const header = [
        f.dtini ? `De: <b>${fmt(f.dtini)}</b>` : '',
        f.dtfim ? `Até: <b>${fmt(f.dtfim)}</b>` : '',
        f.movimento ? `Movimento: <b>${f.movimento}</b>` : '',
        f.tipoItem ? `Tipo: <b>${f.tipoItem}</b>` : '',
        (document.getElementById('hc-cli').value||'') ? `Cliente: <b>${document.getElementById('hc-cli').value}</b>` : '',
      ].filter(Boolean).join(' &nbsp;•&nbsp; ');

      const itensHtml = (last.itens||[]).map(r=>`
        <tr>
          <td>${fmtDateBR(r.data)}</td>
          <td>${r.mov || ''}</td>
          <td>${r.cliente || ''}</td>
          <td>${r.descricao || ''}</td>
          <td class="num">${Number(r.qtde||0).toFixed(3)}</td>
          <td class="num">${fmtMoney(r.valorunit)}</td>
          <td class="num">${fmtMoney(r.valortotal)}</td>
        </tr>`).join('') || `<tr><td colspan="7" class="muted">Sem dados</td></tr>`;

      return `
<!doctype html><html lang="pt-br"><head><meta charset="utf-8"/>
<title>Histórico Comercial</title>
<style>
  @page{ size:A4; margin:18mm 14mm; }
  *{ box-sizing:border-box; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Arial; color:#0f2544 }
  h1{ margin:0 0 4px 0; font-size:20px } p.sub{ margin:0 0 12px 0; color:#6b7c93; font-size:12px }
  .card{ border:1px solid #e7edf7; border-radius:10px; padding:12px; margin:10px 0 }
  table{ width:100%; border-collapse:separate; border-spacing:0 }
  thead th{ background:#f6f8fc; border-bottom:1px solid #e7edf7; padding:8px; font-size:12px; text-align:left }
  tbody td{ border-bottom:1px solid #eef2f7; padding:8px; font-size:12px }
  .num{ text-align:right } .muted{ color:#6b7c93; text-align:center; padding:12px }
</style></head><body>
  <h1>Relatório: Histórico Comercial</h1>
  <p class="sub">${header}</p>

  <div class="card">
    <table>
      <thead><tr>
        <th>Data</th><th>Mov</th><th>Cliente/Fornec</th><th>Descrição</th>
        <th style="text-align:right">Qtde</th><th style="text-align:right">Vlr Unit</th><th style="text-align:right">Total</th>
      </tr></thead>
      <tbody>${itensHtml}</tbody>
    </table>
  </div>
</body></html>`;
    }

    async function exportPDF(){
      try{
        const html = buildPdfHtml();
        const { path: outPath } = await ipcRenderer.invoke('report:pdf', { html, title:'relatorio-historico-comercial' });
        toast('PDF gerado em: ' + outPath);
        shell.openPath(outPath);
      }catch(e){
        toast('Falha ao gerar PDF: '+e.message, true);
      }
    }

    load(); // inicial
  }

  return { title: 'Relatório: Histórico Comercial', html, afterRender };
};
