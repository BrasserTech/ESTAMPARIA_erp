// src/renderer/views/consulta-servicos.js
window.renderConsultaServicos = function () {
  return {
    title: 'Consulta de Serviços',
    html: `
      <div class="card">
        <div class="actions" style="margin-bottom:12px; gap:8px">
          <input class="input" id="q-serv" placeholder="Buscar por nome ou código..." style="max-width:360px" />
          <button class="button" id="btn-buscar">Buscar</button>
          <button class="button outline" id="btn-limpar">Limpar</button>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Validade</th>
              <th>Prazo Entrega</th>
              <th>Valor (R$)</th>
              <th>Ativo</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody id="tbl-servicos"></tbody>
        </table>

        <div class="actions" style="justify-content:flex-end; margin-top:12px; gap:8px">
          <button class="button outline" id="pg-prev">Anterior</button>
          <span id="pg-info" style="align-self:center; color:#546e7a"></span>
          <button class="button outline" id="pg-next">Próximo</button>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const q = document.getElementById('q-serv');
      const tbody = document.getElementById('tbl-servicos');
      const pgPrev = document.getElementById('pg-prev');
      const pgNext = document.getElementById('pg-next');
      const pgInfo = document.getElementById('pg-info');

      let rows = [];
      let page = 1;
      const pageSize = 10;

      const fmt = (v) => (v == null ? '' : v);
      const money = (n) => Number(n || 0).toFixed(2);
      const dmy = (d) => (d ? new Date(d).toLocaleDateString() : '');
      const dts = (d) => (d ? new Date(d).toLocaleString() : '');
      const ativoTxt = (a) => (String(a) === '2' ? 'Não' : 'Sim');

      function render() {
        const start = (page - 1) * pageSize;
        const pageRows = rows.slice(start, start + pageSize);
        if (!pageRows.length) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#78909c;background:#fff">Nenhum registro</td></tr>`;
        } else {
          tbody.innerHTML = pageRows
            .map(
              (r) => `
              <tr>
                <td>${fmt(r.codigo)}</td>
                <td>${fmt(r.nome)}</td>
                <td>${fmt(r.categoria)}</td>
                <td>${dmy(r.validade)}</td>
                <td>${dmy(r.prazoentrega)}</td>
                <td>${money(r.valorvenda)}</td>
                <td>${ativoTxt(r.ativo)}</td>
                <td>${dts(r.datahoracad)}</td>
              </tr>`
            )
            .join('');
        }
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        pgInfo.textContent = `Página ${page} de ${totalPages} — ${rows.length} registro(s)`;
        pgPrev.disabled = page <= 1;
        pgNext.disabled = page >= totalPages;
      }

      async function carregar() {
        try {
          const filtro = q.value ? String(q.value).trim() : null;
          rows = await ipcRenderer.invoke('servicos:listar', filtro);
          page = 1;
          render();
        } catch (e) {
          toast('Erro ao carregar serviços: ' + e.message, true);
        }
      }

      document.getElementById('btn-buscar').addEventListener('click', carregar);
      document.getElementById('btn-limpar').addEventListener('click', () => {
        q.value = '';
        carregar();
      });
      q.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') carregar(); });
      pgPrev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      pgNext.addEventListener('click', () => {
        const totalPages = Math.ceil(rows.length / pageSize);
        if (page < totalPages) { page++; render(); }
      });

      carregar();
    },
  };
};
