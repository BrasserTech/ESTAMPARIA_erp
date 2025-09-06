// ===============================
// relatorios.js
// ===============================
window.renderRelatorios = function () {
  return {
    title: 'Relatórios',
    html: `
      <style>
        .rep-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .rep-wrap{display:flex;flex-direction:column;gap:16px}
        .filters{display:grid;gap:12px;grid-template-columns:repeat(6,1fr);align-items:end}
        @media (max-width:1200px){ .filters{grid-template-columns:1fr 1fr 1fr} }
        @media (max-width:800px){ .filters{grid-template-columns:1fr 1fr} }
        .label{font-weight:600;color:#0f172a;font-size:13px}
        .input,.button,.select{width:100%}
        .row-lookup{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}
        .tabs{display:flex;gap:8px;flex-wrap:wrap}
        .tab{border:1px solid #dbe2ea;border-radius:999px;padding:6px 12px;background:#f8fafc;cursor:pointer;font-size:13px}
        .tab.active{background:#2563eb;color:#fff;border-color:#2563eb}
        .card{border:1px solid #e5eaf0;border-radius:12px;background:#fbfdff;overflow:hidden}
        .card-head{padding:10px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .card-body{padding:14px}
        .tbl{width:100%;border-collapse:separate;border-spacing:0}
        .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;font-size:13px;text-align:left}
        .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
        .txt-right{text-align:right}
        .actions{display:flex;gap:8px;align-items:center}
        .mt8{margin-top:8px}
        .muted{color:#64748b}
        .hstack{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .print-title{font-size:18px;font-weight:700;margin:0 0 8px 0}
        .print-sub{margin:0 0 12px 0}
        .badge{display:inline-block;background:#eef2ff;color:#1e3a8a;border:1px solid #c7d2fe;border-radius:999px;padding:4px 8px;font-size:12px}

        /* Impressão */
        @media print{
          body{background:#fff}
          .sidebar,.topbar,.footerbar,.nav,.actions,.tabs{display:none !important}
          .rep-shell{border:none;box-shadow:none;padding:0}
          .card{border:none}
          .card-head{border:none;padding:0;margin-bottom:8px}
          .card-body{padding:0}
          .no-print{display:none !important}
        }
      </style>

      <div class="rep-shell">
        <div class="rep-wrap">
          <div class="card">
            <div class="card-head">Filtros</div>
            <div class="card-body">
              <div class="filters">
                <div>
                  <label class="label">Período (início)</label>
                  <input type="date" id="rep-dtini" class="input"/>
                </div>
                <div>
                  <label class="label">Período (fim)</label>
                  <input type="date" id="rep-dtfim" class="input"/>
                </div>

                <div>
                  <label class="label">Cliente / Fornecedor</label>
                  <div class="row-lookup">
                    <input id="rep-clifor" class="input" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="rep-clifor-id" />
                    <button id="rep-clifor-lupa" class="button outline" type="button">🔎</button>
                  </div>
                  <input type="hidden" id="rep-clifor-id"/>
                </div>

                <div>
                  <label class="label">Produto</label>
                  <div class="row-lookup">
                    <input id="rep-prod" class="input" placeholder="F8 para pesquisar" data-lookup="produtos" data-target-id="rep-prod-id" />
                    <button id="rep-prod-lupa" class="button outline" type="button">🔎</button>
                  </div>
                  <input type="hidden" id="rep-prod-id"/>
                </div>

                <div>
                  <label class="label">Serviço</label>
                  <div class="row-lookup">
                    <input id="rep-serv" class="input" placeholder="F8 para pesquisar" data-lookup="servicos" data-target-id="rep-serv-id" />
                    <button id="rep-serv-lupa" class="button outline" type="button">🔎</button>
                  </div>
                  <input type="hidden" id="rep-serv-id"/>
                </div>

                <div>
                  <label class="label">Empresa (título)</label>
                  <input id="rep-empresa" class="input" placeholder="Ex.: Estamparia ABC Ltda"/>
                </div>
              </div>

              <div class="hstack mt8">
                <span class="muted">Escolha o relatório:</span>
                <div class="tabs no-print">
                  <button class="tab active" data-tab="lucro">Lucro Mensal</button>
                  <button class="tab" data-tab="entradas">Entradas Detalhadas</button>
                  <button class="tab" data-tab="saidas">Saídas Detalhadas</button>
                  <button class="tab" data-tab="ranking">Ranking</button>
                </div>

                <div class="actions" style="margin-left:auto">
                  <button id="rep-gerar" class="button">Gerar</button>
                  <button id="rep-print" class="button outline">Imprimir PDF</button>
                </div>
              </div>
            </div>
          </div>

          <div id="rep-out" class="card">
            <div class="card-head">Resultado</div>
            <div class="card-body">
              <div id="rep-header"></div>
              <div id="rep-table"></div>
            </div>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // helpers
      const $ = (id) => document.getElementById(id);
      const f2 = (n)=>Number(n||0).toFixed(2);
      const todayISO = ()=> new Date().toISOString().slice(0,10);
      const firstDayMonth = ()=>{
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
      };

      // defaults
      $('rep-dtini').value = firstDayMonth();
      $('rep-dtfim').value = todayISO();

      // lookups
      const wireLookup = (btnId, inputId, key)=>{
        $(btnId).onclick = ()=>{
          if(typeof openLookup!=='function') return toast('Lookup não carregado.', true);
          openLookup(key, ({id,label})=>{
            $(inputId+'-id').value = String(id);
            $(inputId.replace('-id','')).value = label;
          });
        };
      };
      wireLookup('rep-clifor-lupa', 'rep-clifor', 'clientes');
      wireLookup('rep-prod-lupa', 'rep-prod', 'produtos');
      wireLookup('rep-serv-lupa', 'rep-serv', 'servicos');

      // tabs
      let current = 'lucro';
      document.querySelectorAll('.tab').forEach(t=>{
        t.onclick = ()=>{
          document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
          t.classList.add('active');
          current = t.dataset.tab;
          $('rep-table').innerHTML = '';
          $('rep-header').innerHTML = '';
        };
      });

      $('rep-print').onclick = ()=> window.print();

      $('rep-gerar').onclick = async ()=>{
        const filters = {
          dtini: $('rep-dtini').value || null,
          dtfim: $('rep-dtfim').value || null,
          cliforId: Number($('rep-clifor-id').value||'') || null,
          produtoId: Number($('rep-prod-id').value||'') || null,
          servicoId: Number($('rep-serv-id').value||'') || null
        };
        const empresa = ($('rep-empresa').value||'').trim() || 'Empresa';

        try{
          if(current==='lucro'){
            const { rows, totais } = await ipcRenderer.invoke('reports:lucroMensal', filters);
            renderLucro(empresa, filters, rows, totais);
          }else if(current==='entradas'){
            const { rows } = await ipcRenderer.invoke('reports:entradasDetalhe', filters);
            renderDetalhe(empresa, 'Entradas', filters, rows);
          }else if(current==='saidas'){
            const { rows } = await ipcRenderer.invoke('reports:saidasDetalhe', filters);
            renderDetalhe(empresa, 'Saídas', filters, rows);
          }else if(current==='ranking'){
            // pequena UI inline para ranking
            const tipo = prompt('Ranking por "produto" ou "servico"?', 'produto') || 'produto';
            const movimento = prompt('Em "saidas" (vendas) ou "entradas" (compras)?', 'saidas') || 'saidas';
            const limit = Number(prompt('Qtde de itens (ex.: 10, 20, 50)', '20')||'20')||20;

            const { rows } = await ipcRenderer.invoke('reports:ranking', {...filters, tipo, movimento, limit});
            renderRanking(empresa, tipo, movimento, filters, rows, limit);
          }
        }catch(err){
          toast('Erro ao gerar: '+err.message, true);
          console.error(err);
        }
      };

      function headerHTML(empresa, titulo, filters, extras=''){
        const p = [
          `<span class="badge">${empresa}</span>`,
          filters.dtini ? `Período: ${fmtBr(filters.dtini)} a ${fmtBr(filters.dtfim || todayISO())}` : '',
          extras
        ].filter(Boolean).join(' · ');
        return `
          <h3 class="print-title">${titulo}</h3>
          <p class="print-sub muted">${p}</p>
        `;
      }
      const fmtBr = (iso)=> {
        if(!iso) return '';
        const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`;
      };

      function renderLucro(empresa, filters, rows, totais){
        $('rep-header').innerHTML = headerHTML(empresa, 'Demonstrativo de Lucro Mensal', filters);
        const tbody = rows.map(r=>`
          <tr>
            <td>${r.ym}</td>
            <td class="txt-right">${f2(r.compras)}</td>
            <td class="txt-right">${f2(r.vendas)}</td>
            <td class="txt-right"><b>${f2(r.lucro)}</b></td>
          </tr>
        `).join('') || `<tr><td colspan="4" class="muted">Sem dados no período</td></tr>`;

        $('rep-table').innerHTML = `
          <table class="tbl">
            <thead>
              <tr>
                <th>Mês</th>
                <th class="txt-right">Compras (Entradas)</th>
                <th class="txt-right">Vendas (Saídas)</th>
                <th class="txt-right">Lucro</th>
              </tr>
            </thead>
            <tbody>${tbody}</tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th class="txt-right">${f2(totais.compras)}</th>
                <th class="txt-right">${f2(totais.vendas)}</th>
                <th class="txt-right">${f2(totais.lucro)}</th>
              </tr>
            </tfoot>
          </table>
        `;
      }

      function renderDetalhe(empresa, titulo, filters, rows){
        $('rep-header').innerHTML = headerHTML(empresa, `${titulo} (Detalhado)`, filters);
        const tbody = (rows||[]).map(r=>`
          <tr>
            <td>${r.data}</td>
            <td>${r.mov}</td>
            <td>${r.clifor ?? ''}</td>
            <td>${r.tipo}</td>
            <td>${r.item_id}</td>
            <td class="txt-right">${Number(r.qtde||0).toFixed(3)}</td>
            <td class="txt-right">${f2(r.valorunit)}</td>
            <td class="txt-right">${f2(r.valortotal)}</td>
          </tr>
        `).join('') || `<tr><td colspan="8" class="muted">Sem dados para os filtros informados.</td></tr>`;

        $('rep-table').innerHTML = `
          <table class="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Mov</th>
                <th>Cli/For</th>
                <th>Tipo</th>
                <th>Item ID</th>
                <th class="txt-right">Qtde</th>
                <th class="txt-right">Vlr Unit</th>
                <th class="txt-right">Total</th>
              </tr>
            </thead>
            <tbody>${tbody}</tbody>
          </table>
        `;
      }

      function renderRanking(empresa, tipo, movimento, filters, rows, limit){
        $('rep-header').innerHTML = headerHTML(
          empresa,
          `Ranking (${movimento} · ${tipo})`,
          filters,
          `Top ${limit}`
        );
        const tbody = (rows||[]).map((r,ix)=>`
          <tr>
            <td>${ix+1}</td>
            <td>${r.item_id}</td>
            <td class="txt-right">${Number(r.qtde||0).toFixed(3)}</td>
            <td class="txt-right">${f2(r.total)}</td>
          </tr>
        `).join('') || `<tr><td colspan="4" class="muted">Sem dados.</td></tr>`;

        $('rep-table').innerHTML = `
          <table class="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>${tipo === 'servico' ? 'Serviço ID' : 'Produto ID'}</th>
                <th class="txt-right">Qtde</th>
                <th class="txt-right">Total</th>
              </tr>
            </thead>
            <tbody>${tbody}</tbody>
          </table>
        `;
      }
    }
  };
};
