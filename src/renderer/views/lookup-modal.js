// src/renderer/views/lookup-modal.js
(function () {
  const { ipcRenderer } = require('electron');

  // Overlay (singleton)
  const modal = document.createElement('div');
  modal.id = 'lookup-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    background: rgba(15, 23, 42, .35); z-index: 9999;
  `;

  // Conteúdo do modal
  modal.innerHTML = `
    <div id="lk-wrap"
         style="
           width: 820px; max-width: 95vw; max-height: 85vh;
           background:#fff; border-radius:14px; box-shadow:0 16px 40px rgba(15,23,42,.25);
           display:flex; flex-direction:column; overflow:hidden; border:1px solid #e5eaf0;
         ">
      <div style="padding:12px 14px; border-bottom:1px solid #e5eaf0; display:flex; align-items:center; gap:10px;">
        <strong id="lk-title" style="font-size:16px; color:#0f172a; flex:0 0 auto; min-width:180px;">Pesquisar</strong>
        <input id="lk-q" class="input" placeholder="Digite para buscar..." style="flex:1" />
        <button id="lk-btn" class="button" style="flex:0 0 auto">Pesquisar</button>
        <button id="lk-close"
                title="Fechar"
                style="
                  flex:0 0 auto; margin-left:4px;
                  width:36px; height:36px; border-radius:8px; border:1px solid #e5eaf0; background:#f8fafc;
                  display:flex; align-items:center; justify-content:center; font-size:18px; color:#334155; cursor:pointer;
                ">×</button>
      </div>

      <div style="padding:8px 12px 12px 12px; flex:1 1 auto; overflow:auto;">
        <table id="lk-table"
               style="
                 width:100%; border-collapse:separate; border-spacing:0;
                 border:1px solid #e5eaf0; border-radius:10px; overflow:hidden;
               ">
          <thead style="background:#f1f5f9; color:#0f172a; font-weight:600;">
            <tr id="lk-head">
              <!-- cabeçalho preenchido dinamicamente -->
            </tr>
          </thead>
          <tbody id="lk-body">
            <!-- linhas preenchidas dinamicamente -->
          </tbody>
        </table>
      </div>

      <div style="padding:10px 14px; border-top:1px solid #e5eaf0; color:#64748b; font-size:12px; display:flex; justify-content:space-between;">
        <div>Dica: <b>duplo clique</b> seleciona o item.</div>
        <div>Enter = pesquisar · Esc = cancelar</div>
      </div>
    </div>

    <style>
      /* estilos locais do modal */
      #lk-table th, #lk-table td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; }
      #lk-table thead th { border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-transform: none; }
      #lk-table tbody tr:last-child td { border-bottom: none; }
      #lk-table .col-codigo { width: 110px; white-space: nowrap; text-align: left; color:#0f172a; }
      #lk-table .col-nome   { text-align: left; color:#0f172a; }
      #lk-table .col-val    { width: 140px; text-align: right; color:#0f172a; }
      #lk-table tbody tr { background:#fff; transition: background .12s ease; }
      #lk-table tbody tr:hover { background:#f8fafc; cursor: pointer; }
      #lk-empty, #lk-loading, #lk-error { text-align:center; color:#64748b; background:#fff; }
      #lk-error { color:#e11d48; }
    </style>
  `;
  document.body.appendChild(modal);

  // refs
  const elTitle = modal.querySelector('#lk-title');
  const elQ     = modal.querySelector('#lk-q');
  const elHead  = modal.querySelector('#lk-head');
  const elBody  = modal.querySelector('#lk-body');
  const elBtn   = modal.querySelector('#lk-btn');
  const elClose = modal.querySelector('#lk-close');

  let current = null; // { entity, setter }

  function close() {
    modal.style.display = 'none';
    current = null;
  }

  function open(entity, setter) {
    current = { entity, setter };
    elQ.value = '';
    elBody.innerHTML = '';
    elHead.innerHTML = '';

    // Cabeçalhos conforme entidade
    if (entity === 'produtos') {
      elTitle.textContent = 'Pesquisar Produtos';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th><th class="col-val">Valor venda</th>`;
    } else if (entity === 'servicos') {
      elTitle.textContent = 'Pesquisar Serviços';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th><th class="col-val">Valor</th>`;
    } else if (entity === 'clientes') {
      elTitle.textContent = 'Pesquisar Clientes';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    } else if (entity === 'fornecedores') {
      elTitle.textContent = 'Pesquisar Fornecedores';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    } else if (entity === 'empresas') {
      elTitle.textContent = 'Pesquisar Empresas';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    } else {
      elTitle.textContent = 'Pesquisar';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    }

    modal.style.display = 'flex';
    elQ.focus();

    // Lista tudo por padrão
    search('');
  }

  async function search(qRaw) {
    if (!current) return;
    const q = String(qRaw || '').trim();

    // >>> ALTERAÇÃO: quando houver filtro, usamos SEMPRE 'contains' (LIKE '%q%')
    const mode = q ? 'contains' : 'all';

    elBody.innerHTML = `<tr><td id="lk-loading" colspan="3">Carregando...</td></tr>`;

    try {
      const rows = await ipcRenderer.invoke('lookup:search', {
        entity: current.entity,
        q,
        mode,
        limit: 50
      });

      if (!rows || !rows.length) {
        elBody.innerHTML = `<tr><td id="lk-empty" colspan="3">Sem resultados</td></tr>`;
        return;
      }

      if (current.entity === 'produtos') {
        elBody.innerHTML = rows.map(r => `
          <tr data-id="${r.chave}" data-label="${r.codigo} - ${r.nome}">
            <td class="col-codigo">${r.codigo}</td>
            <td class="col-nome">${r.nome}</td>
            <td class="col-val">${Number(r.valorvenda||0).toFixed(2)}</td>
          </tr>`).join('');
      } else if (current.entity === 'servicos') {
        elBody.innerHTML = rows.map(r => `
          <tr data-id="${r.chave}" data-label="${r.codigo} - ${r.nome}">
            <td class="col-codigo">${r.codigo}</td>
            <td class="col-nome">${r.nome}</td>
            <td class="col-val">${Number(r.valorvenda||0).toFixed(2)}</td>
          </tr>`).join('');
      } else {
        // clientes / fornecedores / empresas
        elBody.innerHTML = rows.map(r => `
          <tr data-id="${r.chave}" data-label="${r.codigo} - ${r.nome}">
            <td class="col-codigo">${r.codigo}</td>
            <td class="col-nome">${r.nome}</td>
          </tr>`).join('');
      }

      // duplo clique = selecionar
      Array.from(elBody.querySelectorAll('tr')).forEach(tr => {
        tr.addEventListener('dblclick', () => {
          selectRow(tr.getAttribute('data-id'), tr.getAttribute('data-label'));
        });
      });
    } catch (e) {
      elBody.innerHTML = `<tr><td id="lk-error" colspan="3">Erro: ${e.message}</td></tr>`;
    }
  }

  function selectRow(id, label) {
    if (current && current.setter) current.setter({ id: Number(id), label });
    close();
  }

  // Eventos
  elBtn.addEventListener('click', () => search(elQ.value || ''));
  elQ.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      // Enter SEMPRE pesquisa, não seleciona
      search(elQ.value || '');
    }
  });
  elClose.addEventListener('click', close);

  document.addEventListener('keydown', (ev) => {
    // Esc fecha
    if (ev.key === 'Escape' && modal.style.display === 'flex') close();
  });

  // Clicar fora fecha
  modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });

  // API global
  window.openLookup = open;

  // Atalho F8 contextual (mantido)
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'F8') return;
    const el = document.activeElement;
    if (!el) return;
    const entity = el.getAttribute('data-lookup');
    if (!entity) return;
    open(entity, ({ id, label }) => {
      el.value = label;
      const hid = document.getElementById(el.getAttribute('data-target-id'));
      if (hid) hid.value = String(id);
      el.dispatchEvent(new Event('change'));
    });
  });
})();
