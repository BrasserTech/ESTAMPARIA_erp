// src/renderer/views/rel-fat-por-cliente.js
window.renderRelFatPorCliente = function () {
  return {
    title: 'Relatório: Faturamento por Cliente',
    html: `
      <style>
        .shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .grid{display:grid;gap:12px;grid-template-columns:repeat(5,1fr);align-items:end}
        @media (max-width:1100px){.grid{grid-template-columns:1fr 1fr 1fr}}
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
              <div><label class="label">De</label><input id="rfc-de" type="date" class="input"></div>
              <div><label class="label">Até</label><input id="rfc-ate" type="date" class="input"></div>

              <div>
                <label class="label">Empresa (opcional)</label>
                <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                  <input id="rfc-emp" class="input" placeholder="F8 para pesquisar" data-lookup="empresa" data-target-id="rfc-emp-id">
                  <button id="rfc-emp-lupa" class="button outline" type="button">🔎</button>
                </div>
                <input type="hidden" id="rfc-emp-id">
              </div>

              <div>
                <label class="label">Movimento</label>
                <select id="rfc-mov" class="select">
                  <option value="saidas" selected>Saídas (vendas)</option>
                  <option value="entradas">Entradas (compras)</option>
                  <option value="ambos">Entradas + Saídas</option>
                </select>
              </div>

              <div style="display:flex;gap:8px;align-items:flex-end">
                <button id="rfc-aplicar" class="button">Aplicar</button>
                <button id="rfc-limpar" class="button outline">Limpar</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">Totais por Cliente</div>
          <div class="card-body">
            <table class="tbl">
              <thead><tr><th>Cliente / Fornecedor</th><th class="txt-right">Total (R$)</th><th>Origem</th></tr></thead>
              <tbody id="rfc-body"></tbody>
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

      $('rfc-de').value = first();
      $('rfc-ate').value = today();

      const wire = (btn, inp, src)=>{
        $(btn).onclick = ()=>{
          if (typeof openLookup!=='function') return toast('Lookup não carregado', true);
          openLookup(src, ({id,label})=>{
            $(inp+'-id').value = String(id);
            $(inp).value = label;
          });
        };
      };
      wire('rfc-emp-lupa','rfc-emp','empresa');

      $('rfc-limpar').onclick = ()=>{ $('rfc-emp').value=''; $('rfc-emp-id').value=''; };

      async function load(){
        try{
          const payload = {
            dtini: $('rfc-de').value || null,
            dtfim: $('rfc-ate').value || null,
            empresaId: Number($('rfc-emp-id').value||'') || null,
            movimento: $('rfc-mov').value
          };
          const rows = await ipcRenderer.invoke('rel:fat:porcliente:listar', payload);
          $('rfc-body').innerHTML = (rows||[]).map(r=>`
            <tr><td>${r.nome}</td><td class="txt-right">${f2(r.total)}</td><td>${r.tipo}</td></tr>
          `).join('') || `<tr><td colspan="3" class="muted">Sem dados.</td></tr>`;
        }catch(err){
          console.error(err);
          toast('Erro ao consultar: '+err.message, true);
          $('rfc-body').innerHTML = `<tr><td colspan="3">Erro.</td></tr>`;
        }
      }

      $('rfc-aplicar').onclick = load;
    }
  };
};
