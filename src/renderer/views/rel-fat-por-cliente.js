// Relatório: Faturamento por Cliente (sem gráficos) + PDF limpo
window.renderRelFatPorCliente = function () {
  return {
    title: 'Relatório: Faturamento por Cliente',
    html: `
      <style>
        .rep-shell{background:#fff;border:1px solid #e8eef7;border-radius:14px;box-shadow:0 8px 18px rgba(21,78,210,.06)}
        .rep-head{padding:16px 16px 6px 16px}
        .rep-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        @media (max-width:1100px){ .rep-grid{grid-template-columns:repeat(3,1fr)} }
        @media (max-width:700px){ .rep-grid{grid-template-columns:repeat(2,1fr)} }
        .rep-actions{display:flex;gap:8px;align-items:center;margin-top:8px}
        .card{border-top:1px solid #eef2f7;padding:16px}
        .tbl{width:100%;border-collapse:separate;border-spacing:0}
        .tbl thead th{background:#f7f9ff;border-bottom:1px solid #e8eef7;padding:10px;text-align:left;color:#10253f}
        .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
        .txt-right{text-align:right}
      </style>

      <div class="rep-shell">
        <div class="rep-head">
          <div class="rep-grid">
            <div>
              <label class="label">De</label>
              <input id="fpc-dtini" type="date" class="input"/>
            </div>
            <div>
              <label class="label">Até</label>
              <input id="fpc-dtfim" type="date" class="input"/>
            </div>

            <div style="grid-column: span 2">
              <label class="label">Cliente (opcional)</label>
              <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                <input id="fpc-cli" class="input" placeholder="F8 para pesquisar"
                       data-lookup="clientes" data-target-id="fpc-cli-id"/>
                <button id="fpc-cli-lupa" class="button outline">🔎</button>
              </div>
              <input id="fpc-cli-id" type="hidden"/>
            </div>

            <div>
              <label class="label">Movimento</label>
              <select id="fpc-mov" class="select">
                <option value="saidas">Saídas (vendas)</option>
                <option value="entradas">Entradas (compras)</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>

          <div class="rep-actions">
            <button id="fpc-aplicar" class="button">Aplicar</button>
            <button id="fpc-limpar" class="button outline">Limpar</button>
            <button id="fpc-pdf" class="button outline">Baixar PDF</button>
          </div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px 0">Totais por Cliente</h3>
          <table class="tbl">
            <thead>
              <tr>
                <th>Cliente / Fornecedor</th>
                <th class="txt-right">Total (R$)</th>
                <th style="width:120px">Origem</th>
              </tr>
            </thead>
            <tbody id="fpc-resumo"></tbody>
          </table>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px 0">Documentos</h3>
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:110px">Código</th>
                <th style="width:160px">Data</th>
                <th>Cliente / Fornecedor</th>
                <th class="txt-right" style="width:140px">Total (R$)</th>
                <th style="width:90px">Mov</th>
              </tr>
            </thead>
            <tbody id="fpc-docs"></tbody>
          </table>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (id)=>document.getElementById(id);
      const todayISO = () => new Date().toISOString().slice(0,10);
      const firstOfMonth = () => { const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); };
      const moeda = (n)=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

      // Formatação de data robusta
      function toBrDate(val){
        if (!val && val !== 0) return '';
        const s = String(val);

        // 1) ISO YYYY-MM-DD...
        const iso = s.match(/\d{4}-\d{2}-\d{2}/);
        if (iso) {
          const [y,m,d] = iso[0].split('-');
          return `${d}/${m}/${y}`;
        }

        // 2) Já em DD/MM/AAAA
        const dmy = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
        if (dmy) return dmy[0];

        // 3) Date-like (ex.: "Sat Sep 06 2025 ...")
        const ms = Date.parse(s);
        if (!Number.isNaN(ms)) {
          const d = new Date(ms);
          const dd = String(d.getDate()).padStart(2,'0');
          const mm = String(d.getMonth()+1).padStart(2,'0');
          const yy = d.getFullYear();
          return `${dd}/${mm}/${yy}`;
        }

        // 4) Não conseguiu inferir
        return '';
      }

      $('fpc-dtini').value = firstOfMonth();
      $('fpc-dtfim').value  = todayISO();

      const wireLookup = (btn,input,entity)=>{
        $(btn).onclick = ()=>{
          if(typeof openLookup!=='function') return toast('Lookup não disponível', true);
          openLookup(entity, ({id,label})=>{
            $(input).value = label;
            const hid = $( $(input).getAttribute('data-target-id') );
            if (hid) hid.value = String(id);
          });
        };
      };
      wireLookup('fpc-cli-lupa','fpc-cli','clientes');

      let last = { resumo: [], docs: [], filters: {} };

      async function load(){
        const filters = {
          dtini: $('fpc-dtini').value || null,
          dtfim: $('fpc-dtfim').value || null,
          cliforId: Number($('fpc-cli-id').value || '') || null,
          movimento: $('fpc-mov').value
        };
        const resp = await ipcRenderer.invoke('rel:porcliente:listar', filters);
        const resumo = Array.isArray(resp.resumo) ? resp.resumo : [];
        const docs   = Array.isArray(resp.docs) ? resp.docs : [];

        last = { resumo, docs, filters };

        $('fpc-resumo').innerHTML =
          resumo.length
            ? resumo.map(r=>`
                <tr>
                  <td>${r.cliente}</td>
                  <td class="txt-right">${moeda(r.total)}</td>
                  <td>${(filters.movimento||'').toLowerCase()}</td>
                </tr>`).join('')
            : `<tr><td colspan="3" class="muted">Sem dados</td></tr>`;

        $('fpc-docs').innerHTML =
          docs.length
            ? docs.map(r=>`
                <tr>
                  <td>${r.codigo}</td>
                  <td>${toBrDate(r.data)}</td>
                  <td>${r.cliente||''}</td>
                  <td class="txt-right">${moeda(r.total)}</td>
                  <td>${(r.mov||'').toLowerCase()}</td>
                </tr>`).join('')
            : `<tr><td colspan="5" class="muted">Sem documentos</td></tr>`;
      }

      $('fpc-aplicar').onclick = load;
      $('fpc-limpar').onclick = ()=>{
        $('fpc-dtini').value = firstOfMonth();
        $('fpc-dtfim').value  = todayISO();
        $('fpc-cli').value = ''; $('fpc-cli-id').value = '';
        $('fpc-mov').value = 'saidas';
        load();
      };

      $('fpc-pdf').onclick = ()=>{
        const { resumo, docs, filters } = last;
        const fmtMov = {saidas:'saídas',entradas:'entradas',ambos:'ambos'}[filters?.movimento||'saidas'];
        const html = `
          <html>
          <head>
            <meta charset="utf-8"/>
            <title>Relatório: Faturamento por Cliente</title>
            <style>
              @page { size: A4; margin: 18mm 14mm; }
              body{font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f2544}
              h1{font-size:20px;margin:0 0 4px 0}
              .muted{color:#6b7a90}
              .cap{font-size:12px;margin:2px 0 12px 0}
              .sec{border:1px solid #e8eef7;border-radius:10px;padding:10px 12px;margin-top:14px}
              table{width:100%;border-collapse:separate;border-spacing:0}
              thead th{background:#f7f9ff;border-bottom:1px solid #e8eef7;padding:8px;text-align:left}
              td{border-bottom:1px solid #eef2f7;padding:8px}
              .right{text-align:right}
            </style>
          </head>
          <body>
            <h1>Relatório: Faturamento por Cliente</h1>
            <div class="cap muted">
              De: <b>${toBrDate(filters?.dtini)}</b>
              • Até: <b>${toBrDate(filters?.dtfim)}</b>
              • Movimento: <b>${fmtMov}</b>
              ${filters?.cliforId ? ' • Cliente: <b>Filtrado</b>' : ''}
            </div>

            <div class="sec">
              <h3 style="margin:0 0 6px 0">Totais por Cliente</h3>
              <table>
                <thead><tr><th>Cliente / Fornecedor</th><th class="right">Total (R$)</th><th style="width:90px">Origem</th></tr></thead>
                <tbody>
                  ${
                    (resumo&&resumo.length)
                      ? resumo.map(r=>`
                        <tr>
                          <td>${r.cliente}</td>
                          <td class="right">${Number(r.total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                          <td>${(filters.movimento||'').toLowerCase()}</td>
                        </tr>`).join('')
                      : `<tr><td colspan="3" class="muted">Sem dados</td></tr>`
                  }
                </tbody>
              </table>
            </div>

            <div class="sec">
              <h3 style="margin:0 0 6px 0">Documentos</h3>
              <table>
                <thead>
                  <tr>
                    <th style="width:90px">Código</th>
                    <th style="width:120px">Data</th>
                    <th>Cliente / Fornecedor</th>
                    <th class="right" style="width:130px">Total (R$)</th>
                    <th style="width:80px">Mov</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    (docs&&docs.length)
                      ? docs.map(r=>`
                        <tr>
                          <td>${r.codigo}</td>
                          <td>${toBrDate(r.data)}</td>
                          <td>${r.cliente||''}</td>
                          <td class="right">${Number(r.total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                          <td>${(r.mov||'').toLowerCase()}</td>
                        </tr>`).join('')
                      : `<tr><td colspan="5" class="muted">Sem documentos</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </body>
          </html>
        `;
        const w = window.open('', '_blank');
        w.document.write(html); w.document.close();
        setTimeout(()=>{ w.focus(); w.print(); w.close(); }, 300);
      };

      load();
    }
  };
};
