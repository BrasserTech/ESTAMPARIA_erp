// src/renderer/views/consulta-clientes.js
window.renderConsultaClientes = function () {
  return {
    title: 'Consulta de Clientes',
    html: `
      <div class="card">
        <div class="actions" style="margin-bottom:12px; gap:8px">
          <input class="input" id="q-cli" placeholder="Buscar por nome, documento ou e-mail..." style="max-width:360px" />
          <button class="button" id="btn-buscar">Buscar</button>
          <button class="button outline" id="btn-limpar">Limpar</button>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>F/J</th>
              <th>Tipo</th>
              <th>Documento</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody id="tbl-clientes"></tbody>
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
      const q = document.getElementById('q-cli');
      const tbody = document.getElementById('tbl-clientes');
      const pgPrev = document.getElementById('pg-prev');
      const pgNext = document.getElementById('pg-next');
      const pgInfo = document.getElementById('pg-info');

      let rows = [];
      let page = 1;
      const pageSize = 10;

      function fmt(v) { return v == null ? '' : v; }
      function dt(v) { return v ? new Date(v).toLocaleString() : ''; }
      function tipoTexto(t) {
        const m = { 1: 'Cliente', 2: 'Fornecedor', 3: 'Representante' };
        return m[String(t)] || '';
      }

      function render() {
        const start = (page - 1) * pageSize;
        const pageRows = rows.slice(start, start + pageSize);
        if (!pageRows.length) {
          tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#78909c;background:#fff">Nenhum registro</td></tr>`;
        } else {
          tbody.innerHTML = pageRows.map(r => `
            <tr>
              <td>${fmt(r.codigo)}</td>
              <td>${fmt(r.nome)}</td>
              <td>${fmt(r.fisjur)}</td>
              <td>${tipoTexto(r.tipo)}</td>
              <td>${fmt(r.cpf)}</td>
              <td>${fmt(r.email)}</td>
              <td>${fmt(r.telefone)}</td>
              <td>${fmt(r.endereco)}</td>
              <td>${dt(r.datahoracad)}</td>
            </tr>
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
          rows = await ipcRenderer.invoke('clientes:listar', filtro);
          page = 1;
          render();
        } catch (e) {
          toast('Erro ao carregar clientes: ' + e.message, true);
        }
      }

      document.getElementById('btn-buscar').addEventListener('click', carregar);
      document.getElementById('btn-limpar').addEventListener('click', () => { q.value = ''; carregar(); });
      q.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') carregar(); });
      pgPrev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      pgNext.addEventListener('click', () => {
        const totalPages = Math.ceil(rows.length / pageSize);
        if (page < totalPages) { page++; render(); }
      });

      carregar();
    }
  };
};
