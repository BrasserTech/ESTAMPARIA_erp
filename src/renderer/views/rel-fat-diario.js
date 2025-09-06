// src/renderer/views/rel-fat-diario.js
window.renderRelFatDiario = function () {
  return {
    title: 'Relatório: Faturamento Diário',
    html: `
      <style>
        .shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .grid{display:grid;gap:12px;grid-template-columns:repeat(6,1fr);align-items:end}
        @media (max-width:1200px){.grid{grid-template-columns:1fr 1fr 1fr}}
        @media (max-width:800px){.grid{grid-template-columns:1fr 1fr}}
        .label{font-weight:600;color:#0f172a;font-size:13px}
        .input,.select,.button{width:100%}
        .card{border:1px solid #e5eaf0;border-radius:12px;background:#fbfdff;overflow:hidden;margin-top:12px}
        .card-head{padding:10px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .card-body{padding:14px}
        .tbl{width:100%;border-collapse:separate;border-spacing:0}
        .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;font-size:13px;text-align:left}
        .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
        .txt-right{text-align:right}
        .muted{color:#64748b}
      </style>

      <div class="shell">
        <div class="card">
          <div class="card-head">Filtros</div>
          <div class="card-body">
            <div class="grid">
              <div><label class="label">De</label><input id="rfd-de" type="date" class="input"></div>
              <div><label class="label">Até</label><input id="rfd-ate" type="date" class="input"></div>

              <div>
                <label class="label">Cliente (opcional)</label>
                <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                  <input id="rfd-cli" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="rfd-cli-id">
                  <button id="rfd-cli-lupa" class="button outline" type="button">🔎</button>
                </div>
                <input type="hidden" id="rfd-cli-id">
              </div>

              <div>
                <label class="label">Empresa (opcional)</label>
                <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                  <input id="rfd-emp" class="input" placeholder="F8 para pesquisar" data-lookup="empresa" data-target-id="rfd-emp-id">
                  <button id="rfd-emp-lupa" class="button outline" type="button">🔎</button>
                </div>
                <input type="hidden" id="rfd-emp-id">
              </div>

              <div>
                <label class="label">Movimento</label>
                <select id="rfd-mov" class="select">
                  <option value="saidas" selected>Saídas (vendas)</option>
                  <option value="entradas">Entradas (compras)</option>
                  <option value="ambos">Entradas + Saídas</option>
                </select>
              </div>

              <div style="display:flex;gap:8px;align-items:flex-end">
                <button id="rfd-aplicar" class="button">Aplicar</button>
                <button id="rfd-limpar" class="button outline">Limpar</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">Total do Período</div>
          <div class="card-body"><h2 id="rfd-total" style="margin:0">R$ 0,00</h2></div>
        </div>

        <div class="card">
          <div class="card-head">Totais por Dia</div>
          <div class="card-body">
            <table class="tbl">
              <thead><tr><th>Dia</th><th class="txt-right">Total (R$)</th></tr></thead>
              <tbody id="rfd-dia"></tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><span id="rfd-doc-title">Documentos</span></div>
          <div class="card-body">
            <table class="tbl">
              <thead><tr><th>Código</th><th>Data</th><th>Cliente / Fornecedor</th><th class="txt-right">Total (R$)</th><th>Mov</th></tr></thead>
              <tbody id="rfd-docs"></tbody>
            </table>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = id => document.getElementById(id);
      const f2 = n => Number(n || 0).toFixed(2);
      const today = () => new Date().toISOString().slice(0,10);
      const first = () => { const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); };

      $('rfd-de').value = first();
      $('rfd-ate').value = today();

      // lookups
      const wire = (btn, inp, src)=> {
        $(btn).onclick = ()=>{
          if (typeof openLookup!=='function') return toast('Lookup não carregado', true);
          openLookup(src, ({id,label})=>{
            $(inp+'-id').value = String(id);
            $(inp).value = label;
          });
        };
      };
      wire('rfd-cli-lupa','rfd-cli','clientes');
      wire('rfd-emp-lupa','rfd-emp','empresa');

      $('rfd-limpar').onclick = ()=>{
        $('rfd-cli').value=''; $('rfd-cli-id').value='';
        $('rfd-emp').value=''; $('rfd-emp-id').value='';
      };

      async function load(){
        try{
          const payload = {
            dtini: $('rfd-de').value || null,
            dtfim: $('rfd-ate').value || null,
            cliforId: Number($('rfd-cli-id').value||'') || null,
            empresaId: Number($('rfd-emp-id').value||'') || null,
            movimento: $('rfd-mov').value
          };
          const res = await ipcRenderer.invoke('rel:fat:diario:listar', payload);

          $('rfd-total').textContent = 'R$ ' + f2(res.totalPeriodo);

          $('rfd-dia').innerHTML = (res.porDia||[]).map(r=>`
            <tr><td>${r.dia}</td><td class="txt-right">${f2(r.total)}</td></tr>
          `).join('') || `<tr><td colspan="2" class="muted">Sem dados.</td></tr>`;

          const title =
            payload.movimento==='saidas' ? 'Documentos (Saídas)' :
            payload.movimento==='entradas' ? 'Documentos (Entradas)' :
            'Documentos (Entradas + Saídas)';
          $('rfd-doc-title').textContent = title;

          $('rfd-docs').innerHTML = (res.documentos||[]).map(r=>`
            <tr>
              <td>${r.codigo}</td>
              <td>${r.data}</td>
              <td>${r.clifor||''}</td>
              <td class="txt-right">${f2(r.total)}</td>
              <td>${r.mov||''}</td>
            </tr>
          `).join('') || `<tr><td colspan="5" class="muted">Sem documentos.</td></tr>`;
        }catch(err){
          console.error(err);
          toast('Erro ao consultar: '+err.message, true);
          $('rfd-dia').innerHTML = `<tr><td colspan="2">Erro.</td></tr>`;
          $('rfd-docs').innerHTML = `<tr><td colspan="5">Erro.</td></tr>`;
        }
      }

      $('rfd-aplicar').onclick = load;
    }
  };
};
