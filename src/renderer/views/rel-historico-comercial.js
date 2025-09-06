// src/renderer/views/rel-historico-comercial.js
window.renderRelHistoricoComercial = function () {
  return {
    title: 'Relatório: Histórico Comercial',
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
              <div><label class="label">De</label><input id="rhc-de" type="date" class="input"></div>
              <div><label class="label">Até</label><input id="rhc-ate" type="date" class="input"></div>

              <div>
                <label class="label">Cliente / Fornecedor</label>
                <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                  <input id="rhc-cli" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="rhc-cli-id">
                  <button id="rhc-cli-lupa" class="button outline" type="button">🔎</button>
                </div>
                <input type="hidden" id="rhc-cli-id">
              </div>

              <div>
                <label class="label">Empresa (opcional)</label>
                <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                  <input id="rhc-emp" class="input" placeholder="F8 para pesquisar" data-lookup="empresa" data-target-id="rhc-emp-id">
                  <button id="rhc-emp-lupa" class="button outline" type="button">🔎</button>
                </div>
                <input type="hidden" id="rhc-emp-id">
              </div>

              <div>
                <label class="label">Movimento</label>
                <select id="rhc-mov" class="select">
                  <option value="saidas" selected>Saídas (vendas)</option>
                  <option value="entradas">Entradas (compras)</option>
                  <option value="ambos">Entradas + Saídas</option>
                </select>
              </div>

              <div style="display:flex;gap:8px;align-items:flex-end">
                <button id="rhc-aplicar" class="button">Aplicar</button>
                <button id="rhc-limpar" class="button outline">Limpar</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">Itens</div>
          <div class="card-body">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Código</th><th>Data</th><th>Cliente / Fornecedor</th>
                  <th>Descrição</th>
                  <th class="txt-right">Qtde</th>
                  <th class="txt-right">Vlr Unit</th>
                  <th class="txt-right">Total</th>
                  <th>Mov</th>
                </tr>
              </thead>
              <tbody id="rhc-tbl"></tbody>
            </table>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = id => document.getElementById(id);
      const f2 = n => Number(n || 0).toFixed(2);
      const f3 = n => Number(n || 0).toFixed(3);
      const today = () => new Date().toISOString().slice(0,10);
      const first = () => { const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); };

      $('rhc-de').value = first();
      $('rhc-ate').value = today();

      const wire = (btn, inp, src)=>{
        $(btn).onclick = ()=>{
          if (typeof openLookup!=='function') return toast('Lookup não carregado', true);
          openLookup(src, ({id,label})=>{
            $(inp+'-id').value = String(id);
            $(inp).value = label;
          });
        };
      };
      wire('rhc-cli-lupa','rhc-cli','clientes');
      wire('rhc-emp-lupa','rhc-emp','empresa');

      $('rhc-limpar').onclick = ()=>{ $('rhc-cli').value=''; $('rhc-cli-id').value=''; $('rhc-emp').value=''; $('rhc-emp-id').value=''; };

      async function load(){
        try{
          const payload = {
            dtini: $('rhc-de').value || null,
            dtfim: $('rhc-ate').value || null,
            cliforId: Number($('rhc-cli-id').value||'') || null,
            empresaId: Number($('rhc-emp-id').value||'') || null,
            movimento: $('rhc-mov').value
          };
          const rows = await ipcRenderer.invoke('rel:hist:comercial:listar', payload);
          $('rhc-tbl').innerHTML = (rows||[]).map(r=>`
            <tr>
              <td>${r.codigo}</td>
              <td>${r.data}</td>
              <td>${r.cliente||''}</td>
              <td>${r.descricao||''}</td>
              <td class="txt-right">${f3(r.qtde)}</td>
              <td class="txt-right">${f2(r.valorunit)}</td>
              <td class="txt-right">${f2(r.valortotal)}</td>
              <td>${r.mov||''}</td>
            </tr>
          `).join('') || `<tr><td colspan="8" class="muted">Sem dados.</td></tr>`;
        }catch(err){
          console.error(err);
          toast('Erro ao consultar: '+err.message, true);
          $('rhc-tbl').innerHTML = `<tr><td colspan="8">Erro.</td></tr>`;
        }
      }

      $('rhc-aplicar').onclick = load;
    }
  };
};
