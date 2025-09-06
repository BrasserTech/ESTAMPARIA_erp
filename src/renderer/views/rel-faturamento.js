// Relatório: Faturamento (sem gráficos) + PDF limpo
window.renderRelFaturamento = function () {
  return {
    title: 'Relatório: Faturamento',
    html: `
      <style>
        .rep-shell{background:#fff;border:1px solid #e8eef7;border-radius:14px;box-shadow:0 8px 18px rgba(21,78,210,.06)}
        .rep-head{padding:16px 16px 6px 16px}
        .rep-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        @media (max-width:1100px){ .rep-grid{grid-template-columns:repeat(3,1fr)} }
        @media (max-width:700px){ .rep-grid{grid-template-columns:repeat(2,1fr)} }
        .rep-actions{display:flex;gap:8px;align-items:center;margin-top:8px}
        .rep-totalbox{padding:22px;text-align:center;border-top:1px solid #eef2f7}
        .rep-totalcap{font-size:12px;color:#6b7a90;letter-spacing:.08em}
        .rep-total{font-size:44px;line-height:1.0;font-weight:800;color:#10253f;margin-top:8px}
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
              <input id="fat-dtini" type="date" class="input"/>
            </div>
            <div>
              <label class="label">Até</label>
              <input id="fat-dtfim" type="date" class="input"/>
            </div>

            <div style="grid-column: span 2">
              <label class="label">Cliente (opcional)</label>
              <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                <input id="fat-cli" class="input" placeholder="F8 para pesquisar"
                       data-lookup="clientes" data-target-id="fat-cli-id"/>
                <button id="fat-cli-lupa" class="button outline">🔎</button>
              </div>
              <input id="fat-cli-id" type="hidden"/>
            </div>

            <div style="grid-column: span 2">
              <label class="label">Empresa (opcional)</label>
              <div style="display:grid;grid-template-columns:1fr auto;gap:6px">
                <input id="fat-emp" class="input" placeholder="F8 para pesquisar"
                       data-lookup="empresas" data-target-id="fat-emp-id"/>
                <button id="fat-emp-lupa" class="button outline">🔎</button>
              </div>
              <input id="fat-emp-id" type="hidden"/>
            </div>

            <div>
              <label class="label">Movimento</label>
              <select id="fat-mov" class="select">
                <option value="saidas">Saídas (vendas)</option>
                <option value="entradas">Entradas (compras)</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>

          <div class="rep-actions">
            <button id="fat-aplicar" class="button">Aplicar</button>
            <button id="fat-limpar" class="button outline">Limpar</button>
            <button id="fat-pdf" class="button outline">Baixar PDF</button>
          </div>
        </div>

        <div class="rep-totalbox">
          <div class="rep-totalcap">TOTAL DO PERÍODO</div>
          <div id="fat-total" class="rep-total">R$ 0,00</div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px 0">Totais por Dia</h3>
          <table class="tbl">
            <thead>
              <tr>
                <th style="width:60%">Dia</th>
                <th class="txt-right">Total (R$)</th>
              </tr>
            </thead>
            <tbody id="fat-por-dia"></tbody>
          </table>
        </div>

        <div class="card">
          <h3 style="margin:0 0 8px 0">Documentos (Saídas/Entradas)</h3>
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
            <tbody id="fat-docs"></tbody>
          </table>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // helpers
      const $ = (id) => document.getElementById(id);
      const fmtBr = (iso) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
      const moeda = (n) => Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
      const todayISO = () => new Date().toISOString().slice(0,10);
      const firstOfMonth = () => { const d=new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); };

      // defaults
      $('fat-dtini').value = firstOfMonth();
      $('fat-dtfim').value  = todayISO();

      // lookups
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
      wireLookup('fat-cli-lupa','fat-cli','clientes');
      wireLookup('fat-emp-lupa','fat-emp','empresas');

      // state
      let lastData = { porDia: [], docs: [], totalPeriodo: 0 };

      async function load() {
        const filters = {
          dtini: $('fat-dtini').value || null,
          dtfim: $('fat-dtfim').value || null,
          cliforId: Number($('fat-cli-id').value || '') || null,
          empresaId: Number($('fat-emp-id').value || '') || null,
          movimento: $('fat-mov').value
        };

        const resp = await ipcRenderer.invoke('rel:fatdiario:listar', filters);
        const porDia = Array.isArray(resp.porDia) ? resp.porDia : [];
        const docs   = Array.isArray(resp.docs) ? resp.docs : [];

        // total (backend pode devolver totalPeriodo ou total)
        const totalPeriodo = (resp.totalPeriodo ?? resp.total ?? porDia.reduce((a,b)=>a+Number(b.total||0),0)) || 0;

        lastData = { porDia, docs, totalPeriodo, filters };

        // render total
        $('fat-total').textContent = moeda(totalPeriodo);

        // render por dia
        $('fat-por-dia').innerHTML =
          porDia.length
            ? porDia.map(r=>`
                <tr>
                  <td>${fmtBr(String(r.dia).slice(0,10))}</td>
                  <td class="txt-right">${moeda(r.total)}</td>
                </tr>
              `).join('')
            : `<tr><td colspan="2" class="muted">Sem dados</td></tr>`;

        // render docs
        $('fat-docs').innerHTML =
          docs.length
            ? docs.map(r=>`
                <tr>
                  <td>${r.codigo}</td>
                  <td>${fmtBr(String(r.data).slice(0,10))}</td>
                  <td>${r.cliente || ''}</td>
                  <td class="txt-right">${moeda(r.total)}</td>
                  <td>${(r.mov||'').charAt(0).toUpperCase()+String(r.mov||'').slice(1)}</td>
                </tr>
              `).join('')
            : `<tr><td colspan="5" class="muted">Sem documentos</td></tr>`;
      }

      $('fat-aplicar').onclick = load;
      $('fat-limpar').onclick = () => {
        $('fat-dtini').value = firstOfMonth();
        $('fat-dtfim').value  = todayISO();
        $('fat-cli').value = ''; $('fat-cli-id').value = '';
        $('fat-emp').value = ''; $('fat-emp-id').value = '';
        $('fat-mov').value = 'saidas';
        load();
      };

      // PDF (sem filtros; layout limpo)
      $('fat-pdf').onclick = () => {
        const { porDia, docs, totalPeriodo, filters } = lastData;
        const br = (s)=>s||'';
        const fmtMov = {saidas:'saídas',entradas:'entradas',ambos:'ambos'}[filters?.movimento||'saidas'];
        const html = `
          <html>
          <head>
            <meta charset="utf-8"/>
            <title>Relatório de Faturamento</title>
            <style>
              @page { size: A4; margin: 18mm 14mm; }
              body{font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#0f2544}
              h1{font-size:20px;margin:0 0 4px 0}
              .muted{color:#6b7a90}
              .cap{font-size:12px;margin:2px 0 14px 0}
              .total{font-size:30px;font-weight:800;margin:10px 0 14px 0;color:#10253f}
              .sec{border:1px solid #e8eef7;border-radius:10px;padding:10px 12px;margin-top:14px}
              table{width:100%;border-collapse:separate;border-spacing:0}
              thead th{background:#f7f9ff;border-bottom:1px solid #e8eef7;padding:8px;text-align:left}
              td{border-bottom:1px solid #eef2f7;padding:8px}
              .right{text-align:right}
            </style>
          </head>
          <body>
            <h1>Relatório de Faturamento</h1>
            <div class="cap muted">De: <b>${br(filters?.dtini ? filters.dtini.split('-').reverse().join('/') : '')}</b>
              • Até: <b>${br(filters?.dtfim ? filters.dtfim.split('-').reverse().join('/') : '')}</b>
              • Movimento: <b>${fmtMov}</b>
            </div>
            <div class="total">${moeda(totalPeriodo)}</div>

            <div class="sec">
              <h3 style="margin:0 0 6px 0">Totais por Dia</h3>
              <table>
                <thead><tr><th style="width:60%">Dia</th><th class="right">Total (R$)</th></tr></thead>
                <tbody>
                  ${
                    (porDia&&porDia.length)
                      ? porDia.map(r=>`
                        <tr>
                          <td>${(String(r.dia).slice(0,10).split('-').reverse().join('/'))}</td>
                          <td class="right">${moeda(r.total)}</td>
                        </tr>`).join('')
                      : `<tr><td colspan="2" class="muted">Sem dados</td></tr>`
                  }
                </tbody>
              </table>
            </div>

            <div class="sec">
              <h3 style="margin:0 0 6px 0">Documentos (Saídas/Entradas)</h3>
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
                          <td>${String(r.data).slice(0,10).split('-').reverse().join('/')}</td>
                          <td>${r.cliente||''}</td>
                          <td class="right">${moeda(r.total)}</td>
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
        // dá um tempo para o layout carregar
        setTimeout(()=>{ w.focus(); w.print(); w.close(); }, 300);
      };

      // primeira carga
      load();
    }
  };
};
