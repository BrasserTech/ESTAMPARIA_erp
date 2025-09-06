// src/renderer/views/consulta-saidas.js
window.renderConsultarSaidas = function () {
  return {
    title: 'Consultar Saídas',
    html: `
      <style>
        .cos-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .cos-wrap{display:flex;flex-direction:column;gap:16px}

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
          .card, .cos-shell { box-shadow:none; border:none; }
          thead th { position:static !important }
        }
      </style>

      <div class="cos-shell">
        <div class="cos-wrap">
          <div class="card">
            <div class="card-head">Filtros</div>
            <div class="card-body">
              <div class="filters">
                <div>
                  <label class="label">Data inicial</label>
                  <input id="cs-dtini" type="date" class="input"/>
                </div>
                <div>
                  <label class="label">Data final</label>
                  <input id="cs-dtfim" type="date" class="input"/>
                </div>
                <div>
                  <label class="label">Cliente</label>
                  <div class="row-inline">
                    <input id="cs-cli" class="input" placeholder="F8 para pesquisar"/>
                    <button id="cs-cli-lupa" type="button" class="button outline">🔎</button>
                  </div>
                  <input id="cs-cli-id" type="hidden"/>
                </div>
                <div>
                  <label class="label">Ativo</label>
                  <select id="cs-ativo" class="select">
                    <option value="">(todos)</option>
                    <option value="1">1 — Em edição</option>
                    <option value="2">2 — Finalizado</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px">
                <button id="cs-buscar" class="button">Buscar</button>
                <button id="cs-limpar" class="button outline">Limpar</button>
                <button id="cs-print" class="button outline">Imprimir / PDF</button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">Resultados</div>
            <div class="tbl-wrap">
              <div id="cs-result" class="empty">Informe os filtros e clique em Buscar.</div>
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
      $('cs-dtini').value = `${y}-${m}-01`;
      $('cs-dtfim').value = `${y}-${m}-${d}`;

      $('cs-cli-lupa').onclick = () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('clientes', ({ id, label }) => {
          $('cs-cli-id').value = String(id);
          $('cs-cli').value = label;
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
          dtIni: $('cs-dtini').value,
          dtFim: endExclusive($('cs-dtfim').value),
          clienteId: Number($('cs-cli-id').value || '') || null,
          ativo: $('cs-ativo').value ? Number($('cs-ativo').value) : null
        };
        if (!params.dtIni || !$('cs-dtfim').value) {
          return toast('Informe o período.', true);
        }
        const data = await ipcRenderer.invoke('consulta:saidas:listar', params);
        renderTable(data);
      }

      function renderTable(data) {
        if (!data?.rows?.length) {
          $('cs-result').innerHTML = `<div class="empty">Nenhum registro encontrado.</div>`;
          return;
        }
        const rows = data.rows.map(r => `
          <tr data-id="${r.chave}">
            <td>${r.chave}</td>
            <td>${new Date(r.data).toLocaleString()}</td>
            <td>${r.cliente}</td>
            <td class="txt-right">R$ ${f2(r.total)}</td>
            <td><span class="badge ${r.ativo===2?'green':'gray'}">${r.ativo}</span></td>
            <td><button class="btn-ghost cs-ver">Ver itens</button></td>
          </tr>
        `).join('');

        $('cs-result').innerHTML = `
          <div style="overflow:auto">
            <table id="cs-tbl">
              <thead>
                <tr>
                  <th>Chave</th><th>Data</th><th>Cliente</th><th class="txt-right">Total</th><th>Status</th><th>Ação</th>
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

        document.querySelectorAll('#cs-tbl .cs-ver').forEach(btn => {
          btn.onclick = async () => {
            const tr = btn.closest('tr');
            const id = Number(tr.dataset.id);
            if (tr.nextElementSibling?.classList.contains('detail-row')) {
              tr.nextElementSibling.remove();
              return;
            }
            const det = await ipcRenderer.invoke('consulta:saidas:itens', { chavesaida: id });
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

      $('cs-buscar').onclick = (e) => { e.preventDefault(); buscar().catch(err => toast(err.message, true)); };
      $('cs-limpar').onclick = (e) => {
        e.preventDefault();
        $('cs-cli-id').value = ''; $('cs-cli').value = ''; $('cs-ativo').value = '';
        $('cs-result').innerHTML = `<div class="empty">Informe os filtros e clique em Buscar.</div>`;
      };
      $('cs-print').onclick = (e) => { e.preventDefault(); window.print(); };

      ['cs-dtini','cs-dtfim','cs-cli','cs-ativo'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); $('cs-buscar').click(); }
        });
      });
    }
  };
};
