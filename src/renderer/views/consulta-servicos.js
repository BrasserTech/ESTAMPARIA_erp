// src/renderer/views/consulta-servicos.js
window.renderConsultaServicos = function () {
  return {
    title: 'Consulta de Serviços',
    html: `
      <div class="card">
        <style>
          .srv-wrap{ width:100%; }
          .srv-tools{
            display:flex; gap:8px; margin-bottom:12px;
            align-items:center; flex-wrap:wrap;
          }
          .srv-tools .input{ max-width:360px; }

          table.srv-table{
            width:100%;
            border-collapse:separate;
            border-spacing:0 8px;           /* espaço entre linhas */
            table-layout:fixed;              /* alinha colunas pelo header */
          }
          .srv-table thead th{
            background:#eff5ff;
            color:#0f2544;
            font-weight:700;
            border:1px solid #dfe9ff;
            padding:12px 10px;
          }
          .srv-table thead th:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
          .srv-table thead th:last-child{  border-top-right-radius:12px; border-bottom-right-radius:12px; }

          .srv-table tbody td{
            background:#fff;
            border:1px solid #e6ecf5;
            padding:12px 10px;
            vertical-align:middle;
            color:#1b2b48;
          }
          .srv-table tbody tr td:first-child{ border-top-left-radius:12px; border-bottom-left-radius:12px; }
          .srv-table tbody tr td:last-child{  border-top-right-radius:12px; border-bottom-right-radius:12px; }
          .srv-table tbody tr:hover td{ box-shadow:0 4px 12px rgba(15,37,68,.06); }

          /* Larguras/alinhamento por coluna */
          .col-codigo { width: 90px;   text-align:right; }
          .col-nome   { width: 38%;    }
          .col-categ  { width: 90px;   text-align:center; }
          .col-valid  { width: 120px;  text-align:center; }
          .col-valor  { width: 120px;  text-align:right; }
          .col-prazo  { width: 140px;  text-align:center; }

          .srv-pager{
            display:flex; justify-content:flex-end; align-items:center; gap:12px;
            margin-top:10px; color:#546e7a;
          }
          .srv-pager .button.outline{ padding:6px 10px; height:auto; line-height:inherit; }

          @media (max-width: 980px){
            .col-categ, .col-valid { display:none; } /* responsivo simples */
          }
        </style>

        <div class="srv-wrap">
          <div class="srv-tools">
            <input class="input" id="q-serv" placeholder="Buscar por descrição ou código..." />
            <button class="button" id="btn-buscar">Buscar</button>
            <button class="button outline" id="btn-limpar">Limpar</button>
          </div>

          <table class="srv-table">
            <thead>
              <tr>
                <th class="col-codigo">Código</th>
                <th class="col-nome">Nome / Descrição</th>
                <th class="col-categ">Categoria</th>
                <th class="col-valid">Validade</th>
                <th class="col-valor">Valor (R$)</th>
                <th class="col-prazo">Prazo</th>
              </tr>
            </thead>
            <tbody id="tb-servicos"></tbody>
          </table>

          <div class="srv-pager">
            <button class="button outline" id="pg-prev">Anterior</button>
            <span id="pg-info"></span>
            <button class="button outline" id="pg-next">Próximo</button>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      const q      = document.getElementById('q-serv');
      const tbody  = document.getElementById('tb-servicos');
      const pgPrev = document.getElementById('pg-prev');
      const pgNext = document.getElementById('pg-next');
      const pgInfo = document.getElementById('pg-info');

      let rows = [];
      let page = 1;
      const pageSize = 10;

      // Helpers
      const fmt   = (v) => (v == null ? '' : v);
      const money = (n) => Number(n ?? 0).toFixed(2);
      const dt    = (v) => v ? new Date(v).toLocaleDateString() : '';

      function resolveCodigo(r){
        return r.codigo ?? r.id ?? r.chave ?? '';
      }
      function resolveNome(r){
        return r.nome ?? r.descricao ?? '';
      }
      function resolveCategoria(r){
        return r.categoria ?? '';
      }
      function resolveValidade(r){
        return r.validade ?? r.data_validade ?? null;
      }
      function resolveValor(r){
        return r.valorvenda ?? r.valor ?? r.preco_venda ?? 0;
      }
      function resolvePrazo(r){
        // Preferência: data de prazoentrega; senão, número de dias (prazo_dias)
        if (r.prazoentrega) return dt(r.prazoentrega);
        if (r.prazo_dias != null) return `${r.prazo_dias} dia(s)`;
        return '';
      }

      function render(){
        const start = (page - 1) * pageSize;
        const pageRows = rows.slice(start, start + pageSize);

        if (!pageRows.length){
          tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center; color:#78909c; background:#fff; border:1px solid #e6ecf5; border-radius:12px; padding:16px">
              Nenhum registro
            </td></tr>`;
        } else {
          tbody.innerHTML = pageRows.map(r => `
            <tr>
              <td class="col-codigo">${fmt(resolveCodigo(r))}</td>
              <td class="col-nome">${fmt(resolveNome(r))}</td>
              <td class="col-categ">${fmt(resolveCategoria(r))}</td>
              <td class="col-valid">${fmt(dt(resolveValidade(r)))}</td>
              <td class="col-valor">${fmt(money(resolveValor(r)))}</td>
              <td class="col-prazo">${fmt(resolvePrazo(r))}</td>
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
          rows = await ipcRenderer.invoke('servicos:listar', filtro);
          if (resetToFirstPage) page = 1;
          render();
        }catch(e){
          toast('Erro ao carregar serviços: ' + e.message, true);
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

      carregar(true);
    }
  }
}
