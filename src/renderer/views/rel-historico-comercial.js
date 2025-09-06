// ======================================
// Relatório: Histórico Comercial
// (itens/linhas vendidas/compradas)
// ======================================
window.renderRelHistoricoComercial = function () {
  return {
    title: 'Relatório: Histórico Comercial',
    html: `
      <style>
        .rep-wrap{display:flex;flex-direction:column;gap:16px}
        .filters{display:grid;gap:12px;grid-template-columns:repeat(7,1fr);align-items:end}
        @media (max-width:1400px){ .filters{grid-template-columns:1fr 1fr 1fr 1fr} }
        @media (max-width:900px){ .filters{grid-template-columns:1fr 1fr} }
        .row-lookup{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}
        .tbl{width:100%;border-collapse:separate;border-spacing:0}
        .tbl th{background:#f8fafc;border-bottom:1px solid #e5eaf0;padding:10px;font-size:13px;text-align:left}
        .tbl td{border-bottom:1px solid #eef2f7;padding:10px}
        .txt-right{text-align:right}
        .muted{color:#64748b}
      </style>

      <div class="rep-wrap">
        <div class="card">
          <h3>Filtros</h3>
          <div class="filters">
            <div>
              <label class="label">De</label>
              <input type="date" id="rhc-de" class="input"/>
            </div>
            <div>
              <label class="label">Até</label>
              <input type="date" id="rhc-ate" class="input"/>
            </div>

            <div>
              <label class="label">Cliente (opcional)</label>
              <div class="row-lookup">
                <input id="rhc-cliente" class="input" placeholder="F8 para pesquisar" data-target-id="rhc-cliente-id"/>
                <button id="rhc-cli-lupa" class="button outline" type="button">🔎</button>
              </div>
              <input type="hidden" id="rhc-cliente-id"/>
            </div>

            <div>
              <label class="label">Empresa (opcional)</label>
              <div class="row-lookup">
                <input id="rhc-empresa" class="input" placeholder="F8 para pesquisar" data-target-id="rhc-empresa-id"/>
                <button id="rhc-emp-lupa" class="button outline" type="button">🔎</button>
              </div>
              <input type="hidden" id="rhc-empresa-id"/>
            </div>

            <div>
              <label class="label">Movimento</label>
              <select id="rhc-mov" class="select">
                <option value="ambos">Ambos</option>
                <option value="saidas" selected>Saídas</option>
                <option value="entradas">Entradas</option>
              </select>
            </div>

            <div>
              <label class="label">Tipo de Item</label>
              <select id="rhc-tipo" class="select">
                <option value="ambos">Ambos</option>
                <option value="produto" selected>Produto</option>
                <option value="servico">Serviço</option>
              </select>
            </div>

            <div class="actions" style="gap:8px">
              <button id="rhc-aplicar" class="button">Aplicar</button>
              <button id="rhc-limpar"  class="button outline">Limpar</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Itens</h3>
          <table class="tbl" id="rhc-itens">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Descrição</th>
                <th class="txt-right">Qtde</th>
                <th class="txt-right">Valor Unit.</th>
                <th class="txt-right">Valor Total</th>
                <th>Mov</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody><tr><td colspan="7" class="muted">Sem dados</td></tr></tbody>
          </table>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (s) => document.querySelector(s);

      const money = (v) => (Number(v || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const n3 = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      const fmtDateBR = (v, withTime = false) => {
        if (!v) return '';
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          const [y, m, d] = v.split('-').map(Number);
          const dd = String(d).padStart(2, '0'), mm = String(m).padStart(2, '0');
          return withTime ? `${dd}/${mm}/${y} 00:00` : `${dd}/${mm}/${y}`;
        }
        const d = (v instanceof Date) ? v : new Date(v);
        if (isNaN(d)) return String(v);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        if (!withTime) return `${dd}/${mm}/${yyyy}`;
        const HH = String(d.getHours()).padStart(2, '0');
        const MM = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
      };
      const todayISO = () => new Date().toISOString().slice(0,10);
      const firstDay = () => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
      };

      // defaults
      $('#rhc-de').value  = firstDay();
      $('#rhc-ate').value = todayISO();

      function wireLookup(inputSel, btnSel, source){
        const input = $(inputSel), btn = $(btnSel);
        const hiddenId = document.getElementById(input.dataset.targetId);
        const open = () => {
          if (typeof window.openLookup !== 'function') { alert('Lookup não disponível'); return; }
          window.openLookup(source, ({id,label}) => { hiddenId.value = String(id || ''); input.value = label || ''; });
        };
        input.addEventListener('keydown', (ev)=>{ if (ev.key === 'F8') { ev.preventDefault(); open(); } });
        btn.addEventListener('click', open);
      }
      wireLookup('#rhc-cliente', '#rhc-cli-lupa', 'clientes');
      wireLookup('#rhc-empresa', '#rhc-emp-lupa', 'empresa');

      $('#rhc-limpar').onclick = () => {
        $('#rhc-de').value  = firstDay();
        $('#rhc-ate').value = todayISO();
        $('#rhc-cliente').value = ''; $('#rhc-cliente-id').value = '';
        $('#rhc-empresa').value = ''; $('#rhc-empresa-id').value = '';
        $('#rhc-mov').value  = 'saidas';
        $('#rhc-tipo').value = 'produto';
        render({ itens: [] });
      };

      $('#rhc-aplicar').onclick = async () => {
        const payload = {
          dtini: $('#rhc-de').value || null,
          dtfim: $('#rhc-ate').value || null,
          cliforId: Number($('#rhc-cliente-id').value || '') || null,
          empresaId: Number($('#rhc-empresa-id').value || '') || null,
          movimento: $('#rhc-mov').value || 'ambos',
          tipoItem:  $('#rhc-tipo').value || 'ambos'
        };
        try{
          const data = await ipcRenderer.invoke('rel:historicocomercial:listar', payload);
          render(data);
        }catch(err){
          console.error(err);
          alert('Erro ao consultar: ' + err.message);
        }
      };

      function render(data){
        const rows = (data?.itens || []).map(r => `
          <tr>
            <td>${r.cliente ?? r.fornecedor ?? r.clifor ?? ''}</td>
            <td>${r.descricao ?? r.produto ?? r.servico ?? r.item ?? ''}</td>
            <td class="txt-right">${n3(r.qtde)}</td>
            <td class="txt-right">${money(r.valorunit)}</td>
            <td class="txt-right">${money(r.valortotal)}</td>
            <td>${(r.mov || '').charAt(0).toUpperCase() + (r.mov || '').slice(1)}</td>
            <td>${fmtDateBR(r.data, true)}</td>
          </tr>
        `).join('');
        $('#rhc-itens tbody').innerHTML = rows || `<tr><td colspan="7" class="muted">Sem dados</td></tr>`;
      }

      render({ itens: [] });
    }
  };
};
