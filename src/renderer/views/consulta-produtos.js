// src/renderer/views/consulta-produtos.js
window.renderConsultaProdutos = function () {
  return {
    title: 'Consulta de Produtos',
    html: `
      <div class="card">
        <style>
          /* Layout da tabela com linhas “soltas” e colunas alinhadas */
          .prod-grid-wrap{ width:100%; }
          .prod-tools{
            display:flex; gap:8px; margin-bottom:12px;
            align-items:center; flex-wrap:wrap;
          }
          .prod-tools .input{ max-width:360px; }

          table.prod-table{
            width:100%;
            border-collapse:separate;
            border-spacing:0 8px;           /* espaçamento entre as linhas */
            table-layout:fixed;              /* alinha colunas pelo header */
          }
          .prod-table thead th{
            background:#eff5ff;
            color:#0f2544;
            font-weight:700;
            border:1px solid #dfe9ff;
            padding:12px 10px;
          }
          .prod-table thead th:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
          .prod-table thead th:last-child{  border-top-right-radius:12px; border-bottom-right-radius:12px; }

          .prod-table tbody tr td{
            background:#fff;
            border:1px solid #e6ecf5;
            padding:12px 10px;
            vertical-align:middle;
            color:#1b2b48;
          }
          .prod-table tbody tr td:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
          .prod-table tbody tr td:last-child{  border-top-right-radius:12px; border-bottom-right-radius:12px; }
          .prod-table tbody tr:hover td{ box-shadow:0 4px 12px rgba(15,37,68,.06); }

          /* Larguras proporcionais (ajuste fino de alinhamento) */
          .col-codigo { width: 90px;   text-align:right; }
          .col-nome   { width: 32%;    }
          .col-categ  { width: 90px;   text-align:center; }
          .col-valid  { width: 120px;  text-align:center; }
          .col-compra { width: 120px;  text-align:right; }
          .col-venda  { width: 120px;  text-align:right; }
          .col-data   { width: 160px;  text-align:center; }
          .col-acoes  { width: 80px;   text-align:center; }

          .btn-mini{
            border:1px solid #e4e8f4; background:#fff; color:#b42318;
            border-radius:8px; padding:4px 8px; cursor:pointer; font-weight:700;
          }
          .btn-mini:hover{ background:#fff5f5; border-color:#ffd5d5; }

          .prod-pager{
            display:flex; justify-content:flex-end; align-items:center; gap:12px;
            margin-top:10px; color:#546e7a;
          }
          .prod-pager .button.outline{ padding:6px 10px; height:auto; line-height:inherit; }

          @media (max-width: 980px){
            .col-valid, .col-categ { display:none; } /* responsivo simples */
          }
        </style>

        <div class="prod-grid-wrap">
          <div class="prod-tools">
            <input class="input" id="q-prod" placeholder="Buscar por nome ou código..." />
            <button class="button" id="btn-buscar">Buscar</button>
            <button class="button outline" id="btn-limpar">Limpar</button>
          </div>

          <table class="prod-table">
            <thead>
              <tr>
                <th class="col-codigo">Código</th>
                <th class="col-nome">Nome</th>
                <th class="col-categ">Categoria</th>
                <th class="col-valid">Validade</th>
                <th class="col-compra">Compra (R$)</th>
                <th class="col-venda">Venda (R$)</th>
                <th class="col-data">Data</th>
                <th class="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody id="tb-produtos"></tbody>
          </table>

          <div class="prod-pager">
            <button class="button outline" id="pg-prev">Anterior</button>
            <span id="pg-info"></span>
            <button class="button outline" id="pg-next">Próximo</button>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      const q       = document.getElementById('q-prod');
      const tbody   = document.getElementById('tb-produtos');
      const pgPrev  = document.getElementById('pg-prev');
      const pgNext  = document.getElementById('pg-next');
      const pgInfo  = document.getElementById('pg-info');

      let rows = [];
      let page = 1;
      const pageSize = 10;

      // Helpers tolerantes ao esquema
      const money = (n) => Number(n ?? 0).toFixed(2);
      const fmt   = (v) => (v == null ? '' : v);
      const dt    = (v) => v ? new Date(v).toLocaleDateString() : '';

      function resolveCodigo(r){
        return r.codigo ?? r.id ?? r.sku ?? '';
      }
      function resolveCompra(r){
        return r.preco_custo ?? r.valorcompra ?? r.precoCusto ?? 0;
      }
      function resolveVenda(r){
        const v = r.preco_venda ?? r.valorvenda ?? r.precoVenda;
        return v == null ? resolveCompra(r) : v;
      }
      function resolveData(r){
        return r.created_at ?? r.datahoracad ?? r.data_cad ?? r.data ?? null;
      }

      function render() {
        const start = (page - 1) * pageSize;
        const pageRows = rows.slice(start, start + pageSize);

        if (!pageRows.length) {
          tbody.innerHTML = `
            <tr><td colspan="8" style="text-align:center; color:#78909c; background:#fff; border:1px solid #e6ecf5; border-radius:12px; padding:16px">
              Nenhum registro
            </td></tr>`;
        } else {
          tbody.innerHTML = pageRows.map(r => {
            const cod   = resolveCodigo(r);
            const nome  = r.nome ?? r.descricao ?? '';
            const cat   = r.categoria ?? '';
            const val   = dt(r.validade);
            const comp  = money(resolveCompra(r));
            const vend  = money(resolveVenda(r));
            const data  = dt(resolveData(r));

            // chave preferencial: id > codigo > sku
            const keyPayload = (() => {
              if (r.id != null)      return `data-id="${String(r.id)}"`;
              if (r.codigo != null)  return `data-codigo="${String(r.codigo)}"`;
              if (r.sku != null)     return `data-sku="${String(r.sku)}"`;
              return '';
            })();

            return `
              <tr>
                <td class="col-codigo">${fmt(cod)}</td>
                <td class="col-nome">${fmt(nome)}</td>
                <td class="col-categ">${fmt(cat)}</td>
                <td class="col-valid">${fmt(val)}</td>
                <td class="col-compra">${fmt(comp)}</td>
                <td class="col-venda">${fmt(vend)}</td>
                <td class="col-data">${fmt(data)}</td>
                <td class="col-acoes">
                  <button class="btn-mini row-del" title="Excluir" ${keyPayload}>×</button>
                </td>
              </tr>
            `;
          }).join('');
        }

        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        pgInfo.textContent = `Página ${page} de ${totalPages} — ${rows.length} registro(s)`;
        pgPrev.disabled = page <= 1;
        pgNext.disabled = page >= totalPages;

        // Bind de exclusão
        tbody.querySelectorAll('.row-del').forEach(btn => {
          btn.addEventListener('click', async () => {
            try{
              const payload = {};
              if (btn.dataset.id) payload.id = btn.dataset.id;
              else if (btn.dataset.codigo) payload.codigo = btn.dataset.codigo;
              else if (btn.dataset.sku) payload.sku = btn.dataset.sku;

              if (!Object.keys(payload).length) return toast('Não foi possível identificar o produto.', true);
              if (!confirm('Confirma excluir este produto?')) return;

              await ipcRenderer.invoke('produtos:excluir', payload);
              toast('Produto excluído.');
              await carregar(false);
            }catch(err){
              toast('Erro ao excluir: ' + err.message, true);
            }
          });
        });
      }

      async function carregar(resetToFirstPage = true) {
        try {
          const filtro = q.value ? String(q.value).trim() : null;
          rows = await ipcRenderer.invoke('produtos:listar', filtro);
          if (resetToFirstPage) page = 1;
          render();
        } catch (e) {
          toast('Erro ao carregar produtos: ' + e.message, true);
        }
      }

      // Eventos
      document.getElementById('btn-buscar').addEventListener('click', () => carregar(true));
      document.getElementById('btn-limpar').addEventListener('click', () => { q.value=''; carregar(true); });
      q.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') carregar(true); });

      pgPrev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      pgNext.addEventListener('click', () => {
        const totalPages = Math.ceil(rows.length / pageSize);
        if (page < totalPages) { page++; render(); }
      });

      // Primeira carga
      carregar(true);
    }
  }
}
