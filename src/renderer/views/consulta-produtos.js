// src/renderer/views/consulta-produtos.js
window.renderConsultaProdutos = function () {
  return {
    title: 'Consulta de Produtos',
    html: `
      <div class="card">
        <div class="actions" style="margin-bottom:12px; gap:8px">
          <input class="input" id="q-prod" placeholder="Buscar por nome ou SKU..." style="max-width:360px" />
          <button class="button" id="btn-buscar">Buscar</button>
          <button class="button outline" id="btn-limpar">Limpar</button>
        </div>

        <!-- Datagrid -->
        <div class="datagrid" id="dg-produtos">
          <div class="dg-row dg-head">
            <div class="dg-cell">SKU</div>
            <div class="dg-cell">Nome</div>
            <div class="dg-cell">Categoria</div>
            <div class="dg-cell">Unid.</div>
            <div class="dg-cell">Validade</div>
            <div class="dg-cell">Estoque</div>
            <div class="dg-cell">Preço Venda (R$)</div>
          </div>
          <div id="dg-body"></div>
        </div>

        <div class="actions" style="justify-content:flex-end; margin-top:12px; gap:8px">
          <button class="button outline" id="pg-prev">Anterior</button>
          <span id="pg-info" style="align-self:center; color:#546e7a"></span>
          <button class="button outline" id="pg-next">Próximo</button>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const q = document.getElementById('q-prod');
      const body = document.getElementById('dg-body');
      const pgPrev = document.getElementById('pg-prev');
      const pgNext = document.getElementById('pg-next');
      const pgInfo = document.getElementById('pg-info');

      let rows = [];
      let page = 1;
      const pageSize = 10;

      const fmt = v => (v == null ? '' : v);
      const money = n => Number(n || 0).toFixed(2);
      const validade = d => d ? new Date(d).toLocaleDateString() : '';

      function render() {
        const start = (page - 1) * pageSize;
        const pageRows = rows.slice(start, start + pageSize);

        if (!pageRows.length) {
          body.innerHTML = `
            <div class="dg-row">
              <div class="dg-cell" style="grid-column:1/-1; text-align:center; color:#78909c">
                Nenhum registro
              </div>
            </div>`;
        } else {
          body.innerHTML = pageRows.map(r => `
            <div class="dg-row">
              <div class="dg-cell">${fmt(r.sku)}</div>
              <div class="dg-cell">${fmt(r.nome)}</div>
              <div class="dg-cell">${fmt(r.categoria)}</div>
              <div class="dg-cell">${fmt(r.unidade)}</div>
              <div class="dg-cell">${validade(r.validade)}</div>
              <div class="dg-cell">${fmt(r.estoque_atual)}</div>
              <div class="dg-cell">${money(r.preco_venda)}</div>
            </div>
          `).join('');
        }

        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        pgInfo.textContent = `Página ${page} de ${totalPages} — ${rows.length} registro(s)`;
        pgPrev.disabled = page <= 1;
        pgNext.disabled = page >= totalPages;
      }

      async function carregar() {
        try {
          const filtro = q.value ? String(q.value).trim() : null;
          rows = await ipcRenderer.invoke('produtos:listar', filtro);
          page = 1;
          render();
        } catch (e) {
          toast('Erro ao carregar produtos: ' + e.message, true);
        }
      }

      document.getElementById('btn-buscar').addEventListener('click', carregar);
      document.getElementById('btn-limpar').addEventListener('click', () => { q.value=''; carregar(); });
      q.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') carregar(); });
      pgPrev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      pgNext.addEventListener('click', () => {
        const totalPages = Math.ceil(rows.length / pageSize);
        if (page < totalPages) { page++; render(); }
      });

      carregar();
    }
  }
}
