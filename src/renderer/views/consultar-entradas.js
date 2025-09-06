// src/renderer/views/consulta-entradas.js
window.renderConsultarEntradas = function () {
  return {
    title: 'Consultar Entradas',
    html: `
      <style>
        .con-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .con-wrap{display:flex;flex-direction:column;gap:16px}

        .card{border:1px solid #e5eaf0;border-radius:12px;background:#fbfdff;box-shadow:0 6px 18px rgba(15,23,42,.05);overflow:hidden}
        .card-head{padding:10px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .card-body{padding:14px}

        .filters{display:grid;gap:12px;grid-template-columns:repeat(4,minmax(180px,1fr))}
        @media (max-width:1100px){ .filters{grid-template-columns:1fr 1fr} }
        @media (max-width:720px){ .filters{grid-template-columns:1fr} }

        .label{font-weight:600;color:#0f172a}
        .input,.select,.button,.button.outline{width:100%}
        .row-inline{display:flex;gap:8px;align-items:end}

        .tbl-wrap{padding:10px}
        table{width:100%;border-collapse:separate;border-spacing:0}
        thead th{background:#f8fafc;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #e5eaf0;padding:10px;position:sticky;top:0;z-index:1}
        tbody td{border-bottom:1px solid #eef2f7;padding:10px;color:#0f172a}
        tbody tr:last-child td{border-bottom:none}
        tbody tr:hover{background:#f9fbff}
        .txt-right{text-align:right}
        .muted{color:#64748b}
        .empty{padding:18px;text-align:center;color:#64748b}
        .btn-ghost{background:#fff;border:1px solid #e5eaf0;color:#334155;padding:6px 10px;border-radius:8px;cursor:pointer}
        .btn-ghost:hover{background:#f8fafc}

        .badge{border:1px solid #e5eaf0;border-radius:999px;padding:2px 8px;font-size:12px}
        .badge.green{background:#10b9811a;color:#065f46;border-color:#10b98166}
        .badge.gray{background:#6b72801a;color:#374151;border-color:#6b728066}

        @media print{
          .app .sidebar, .app .topbar, .footerbar { display:none !important; }
          .card, .con-shell { box-shadow:none; border:none; }
          thead th { position:static !important }
        }
      </style>

      <div class="con-shell">
        <div class="con-wrap">
          <div class="card">
            <div class="card-head">Filtros</div>
            <div class="card-body">
              <div class="filters">
                <div>
                  <label class="label">Data inicial</label>
                  <input id="ce-dtini" type="date" class="input"/>
                </div>
                <div>
                  <label class="label">Data final</label>
                  <input id="ce-dtfim" type="date" class="input"/>
                </div>
                <div>
                  <label class="label">Fornecedor</label>
                  <div class="row-inline">
                    <input id="ce-forn" class="input" placeholder="F8 para pesquisar"/>
                    <button id="ce-forn-lupa" type="button" class="button outline">🔎</button>
                  </div>
                  <input id="ce-forn-id" type="hidden"/>
                </div>
                <div>
                  <label class="label">Ativo</label>
                  <select id="ce-ativo" class="select">
                    <option value="">(todos)</option>
                    <option value="1">1 — Em edição</option>
                    <option value="2">2 — Finalizado</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px">
                <button id="ce-buscar" class="button">Buscar</button>
                <button id="ce-limpar" class="button outline">Limpar</button>
                <button id="ce-print" class="button outline">Imprimir / PDF</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Resultados</div>
            <div class="tbl-wrap">
              <div id="ce-result" class="empty">Informe os filtros e clique em Buscar.</div>
            </div>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = id => document.getElementById(id);
      const f2 = n => Number(n || 0).toFixed(2);

      // datas padrão: mês atual
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      $('ce-dtini').value = `${y}-${m}-01`;
      $('ce-dtfim').value = `${y}-${m}-${d}`;

      // lookup fornecedor
      $('ce-forn-lupa').onclick = () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('fornecedores', ({ id, label }) => {
          $('ce-forn-id').value = String(id);
          $('ce-forn').value = label;
        });
      };

      function endExclusive(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        const yy = d.getFullYear();
        const mm = String(d.getMonth()+1).padStart(2,'0');
        const dd = String(d.getDate()).padStart(2,'0');
        return `${yy}-${mm}-${dd}`;
      }

      async function buscar() {
        const params = {
          dtIni: $('ce-dtini').value,
          dtFim: endExclusive($('ce-dtfim').value),
          fornecedorId: Number($('ce-forn-id').value || '') || null,
          ativo: $('ce-ativo').value ? Number($('ce-ativo').value) : null
        };
        if (!params.dtIni || !$('ce-dtfim').value) {
          return toast('Informe o período.', true);
        }
        const data = await ipcRenderer.invoke('consulta:entradas:listar', params);
        renderTable(data);
      }

      function renderTable(data) {
        if (!data?.rows?.length) {
          $('ce-result').innerHTML = `<div class="empty">Nenhum registro encontrado.</div>`;
          return;
        }
        const rows = data.rows.map(r => `
          <tr data-id="${r.chave}">
            <td>${r.chave}</td>
            <td>${new Date(r.data).toLocaleString()}</td>
            <td>${r.fornecedor}</td>
            <td class="txt-right">R$ ${f2(r.total)}</td>
            <td><span class="badge ${r.ativo===2?'green':'gray'}">${r.ativo}</span></td>
            <td><button class="btn-ghost ce-ver">Ver itens</button></td>
          </tr>
        `).join('');

        $('ce-result').innerHTML = `
          <div style="overflow:auto">
            <table id="ce-tbl">
              <thead>
                <tr>
                  <th>Chave</th><th>Data</th><th>Fornecedor</th><th class="txt-right">Total</th><th>Status</th><th>Ação</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="txt-right"><strong>Total geral:</strong></td>
                  <td class="txt-right"><strong>R$ ${f2(data.rows.reduce((a,x)=>a+Number(x.total||0),0))}</strong></td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        `;

        // expandir itens
        document.querySelectorAll('#ce-tbl .ce-ver').forEach(btn => {
          btn.onclick = async () => {
            const tr = btn.closest('tr');
            const id = Number(tr.dataset.id);
            // já aberto?
            if (tr.nextElementSibling?.classList.contains('detail-row')) {
              tr.nextElementSibling.remove();
              return;
            }
            const det = await ipcRenderer.invoke('consulta:entradas:itens', { chaveentrada: id });
            const lines = det.rows.map(i => `
              <tr>
                <td>${i.tipo}</td>
                <td>${i.item}</td>
                <td class="txt-right">${Number(i.qtde).toFixed(3)}</td>
                <td class="txt-right">R$ ${f2(i.valorunit)}</td>
                <td class="txt-right">R$ ${f2(i.valortotal)}</td>
              </tr>
            `).join('') || `<tr><td colspan="5" class="muted">Sem itens.</td></tr>`;

            const detail = document.createElement('tr');
            detail.className = 'detail-row';
            detail.innerHTML = `
              <td colspan="6" style="background:#f9fafb">
                <div class="tbl-wrap">
                  <table style="width:100%">
                    <thead><tr><th>Tipo</th><th>Item</th><th class="txt-right">Qtd</th><th class="txt-right">Vlr Unit</th><th class="txt-right">Total</th></tr></thead>
                    <tbody>${lines}</tbody>
                  </table>
                </div>
              </td>
            `;
            tr.after(detail);
          };
        });
      }

      $('ce-buscar').onclick = (e) => { e.preventDefault(); buscar().catch(err => toast(err.message, true)); };
      $('ce-limpar').onclick = (e) => {
        e.preventDefault();
        $('ce-forn-id').value = ''; $('ce-forn').value = ''; $('ce-ativo').value = '';
        $('ce-result').innerHTML = `<div class="empty">Informe os filtros e clique em Buscar.</div>`;
      };
      $('ce-print').onclick = (e) => { e.preventDefault(); window.print(); };

      // atalho Enter
      ['ce-dtini','ce-dtfim','ce-forn','ce-ativo'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); $('ce-buscar').click(); }
        });
      });
    }
  };
};
