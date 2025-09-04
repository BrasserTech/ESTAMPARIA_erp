// src/renderer/views/consulta-clientes.js
window.renderConsultaClientes = function () {
  return {
    title: 'Consulta de Clientes',
    html: `
      <div class="card">
        <style>
          .cli-wrap{ width:100%; }
          .cli-tools{
            display:flex; gap:8px; margin-bottom:12px;
            align-items:center; flex-wrap:wrap;
          }
          .cli-tools .input{ max-width:420px; }

          table.cli-table{
            width:100%;
            border-collapse:separate;
            border-spacing:0 8px;
            table-layout:fixed;
          }
          .cli-table thead th{
            background:#eff5ff;
            color:#0f2544;
            font-weight:700;
            border:1px solid #dfe9ff;
            padding:12px 10px;
          }
          .cli-table thead th:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
          .cli-table thead th:last-child{  border-top-right-radius:12px; border-bottom-right-radius:12px; }

          .cli-table tbody td{
            background:#fff; border:1px solid #e6ecf5;
            padding:12px 10px; color:#1b2b48; vertical-align:middle;
          }
          .cli-table tbody tr td:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
          .cli-table tbody tr td:last-child{  border-top-right-radius:12px; border-bottom-right-radius:12px; }
          .cli-table tbody tr:hover td{ box-shadow:0 4px 12px rgba(15,37,68,.06); }

          .c-codigo { width:90px;  text-align:right; }
          .c-nome   { width:22%; }
          .c-fj     { width:60px; text-align:center; }
          .c-tipo   { width:120px; }
          .c-doc    { width:180px; }
          .c-email  { width:220px; }
          .c-fone   { width:160px; }
          .c-ender  { width:24%; }
          .c-data   { width:150px; text-align:center; }

          @media (max-width: 1100px){
            .c-email, .c-ender { display:none; }
          }
          @media (max-width: 900px){
            .c-doc, .c-fone { display:none; }
          }
        </style>

        <div class="cli-wrap">
          <div class="cli-tools">
            <input class="input" id="q-cli" placeholder="Buscar por nome, documento ou e-mail..." />
            <button class="button" id="btn-buscar">Buscar</button>
            <button class="button outline" id="btn-limpar">Limpar</button>
          </div>

          <table class="cli-table">
            <thead>
              <tr>
                <th class="c-codigo">Código</th>
                <th class="c-nome">Nome</th>
                <th class="c-fj">F/J</th>
                <th class="c-tipo">Tipo</th>
                <th class="c-doc">Documento</th>
                <th class="c-email">Email</th>
                <th class="c-fone">Telefone</th>
                <th class="c-ender">Endereço</th>
                <th class="c-data">Data</th>
              </tr>
            </thead>
            <tbody id="tb-clientes"></tbody>
          </table>

          <div class="prod-pager" style="display:flex; justify-content:flex-end; gap:12px; margin-top:10px; color:#546e7a;">
            <button class="button outline" id="pg-prev">Anterior</button>
            <span id="pg-info"></span>
            <button class="button outline" id="pg-next">Próximo</button>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      const q      = document.getElementById('q-cli');
      const tbody  = document.getElementById('tb-clientes');
      const pgPrev = document.getElementById('pg-prev');
      const pgNext = document.getElementById('pg-next');
      const pgInfo = document.getElementById('pg-info');

      let rows = [];
      let page = 1;
      const pageSize = 10;

      const fmt = (v) => (v == null ? '' : v);
      const dt  = (v) => v ? new Date(v).toLocaleString() : '';   // mantém data+hora se houver

      function resolveCodigo(r){
        return r.codigo ?? r.id ?? r.chave ?? '';
      }
      function resolveFJ(r){
        const raw = r.fisjur ?? r.fis_jur ?? r.pessoa ?? r.tipo_pessoa;
        if (!raw) return '';
        const s = String(raw).toUpperCase();
        if (s.startsWith('F')) return 'F';
        if (s.startsWith('J')) return 'J';
        return s; // qualquer outro mapeamento permanece
      }
      function resolveTipo(r){
        return r.tipo ?? r.tp ?? '';
      }
      function resolveDoc(r){
        return r.documento ?? r.cpf_cnpj ?? r.cpf ?? r.cnpj ?? '';
      }
      function resolveData(r){
        return r.created_at ?? r.datahoracad ?? r.data_cad ?? r.data ?? null;
      }

      function render(){
        const start = (page - 1) * pageSize;
        const pageRows = rows.slice(start, start + pageSize);

        if (!pageRows.length){
          tbody.innerHTML = `
            <tr><td colspan="9" style="text-align:center; color:#78909c; background:#fff; border:1px solid #e6ecf5; border-radius:12px; padding:16px">
              Nenhum registro
            </td></tr>`;
        }else{
          tbody.innerHTML = pageRows.map(r => `
            <tr>
              <td class="c-codigo">${fmt(resolveCodigo(r))}</td>
              <td class="c-nome">${fmt(r.nome)}</td>
              <td class="c-fj">${fmt(resolveFJ(r))}</td>
              <td class="c-tipo">${fmt(resolveTipo(r))}</td>
              <td class="c-doc">${fmt(resolveDoc(r))}</td>
              <td class="c-email">${fmt(r.email)}</td>
              <td class="c-fone">${fmt(r.telefone ?? r.fone ?? r.celular)}</td>
              <td class="c-ender">${fmt(r.endereco)}</td>
              <td class="c-data">${fmt(dt(resolveData(r)))}</td>
            </tr>
          `).join('');
        }

        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        pgInfo.textContent = `Página ${page} de ${totalPages} — ${rows.length} registro(s)`;
        pgPrev.disabled = page <= 1;
        pgNext.disabled = page >= totalPages;
      }

      async function carregar(resetToFirstPage = true){
        try{
          const filtro = q.value ? String(q.value).trim() : null;
          rows = await ipcRenderer.invoke('clientes:listar', filtro);
          if (resetToFirstPage) page = 1;
          render();
        }catch(e){
          toast('Erro ao carregar clientes: ' + e.message, true);
        }
      }

      document.getElementById('btn-buscar').addEventListener('click', () => carregar(true));
      document.getElementById('btn-limpar').addEventListener('click', () => { q.value=''; carregar(true); });
      q.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') carregar(true); });

      pgPrev.addEventListener('click', () => { if (page > 1) { page--; render(); } });
      pgNext.addEventListener('click', () => {
        const totalPages = Math.ceil(rows.length / pageSize);
        if (page < totalPages) { page++; render(); }
      });

      carregar(true);
    }
  }
}
