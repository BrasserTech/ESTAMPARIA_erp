// src/renderer/views/lookup-modal.js
(function () {
  const { ipcRenderer } = require('electron');

  // ===== Overlay (singleton) =====
  const modal = document.createElement('div');
  modal.id = 'lookup-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
    background: rgba(15, 23, 42, .35); z-index: 9999;
  `;

  // ===== Conteúdo =====
  modal.innerHTML = `
    <div id="lk-wrap"
         style="
           width: 820px; max-width: 95vw; max-height: 85vh;
           background:#fff; border-radius:14px; box-shadow:0 16px 40px rgba(15,23,42,.25);
           display:flex; flex-direction:column; overflow:hidden; border:1px solid #e5eaf0;
         ">

      <!-- Cabeçalho: visual aprimorado (sem quebrar o que já existia) -->
      <div id="lk-header"
           style="display:flex; align-items:center; gap:10px; padding:10px 14px;
                  background:#1f5fe0; color:#fff; border-bottom:1px solid #e5eaf0;">
        <strong id="lk-title" style="font-size:15px; font-weight:800; flex:1;">Pesquisar</strong>
        <button id="lk-close"
                title="Fechar"
                style="
                  width:34px; height:34px; border-radius:10px; border:1px solid rgba(255,255,255,.45);
                  background:transparent; color:#fff; display:flex; align-items:center; justify-content:center;
                  font-size:18px; cursor:pointer;
                ">×</button>
      </div>

      <!-- Barra de busca -->
      <div style="padding:12px 14px; border-bottom:1px solid #e5eaf0; display:grid; grid-template-columns: 1fr auto auto; gap:8px; background:#f8fbff">
        <input id="lk-q" class="input" placeholder="Digite para buscar..." style="flex:1" />
        <button id="lk-btn" class="button" style="height:38px">Pesquisar</button>
        <button id="lk-clear" class="button outline" style="height:38px">Limpar</button>
      </div>

      <!-- Tabela -->
      <div style="padding:8px 12px 12px 12px; flex:1 1 auto; overflow:auto;">
        <table id="lk-table"
               style="
                 width:100%; border-collapse:separate; border-spacing:0;
                 border:1px solid #e5eaf0; border-radius:10px; overflow:hidden;
               ">
          <thead style="background:#f1f5f9; color:#0f172a; font-weight:600;">
            <tr id="lk-head"></tr>
          </thead>
          <tbody id="lk-body"></tbody>
        </table>
        <div id="lk-hint" style="padding:8px 0; color:#6b7c93; font-size:12px;">
          Enter = pesquisar · Setas ↑/↓ = navegar · Duplo clique ou Enter (na lista) = selecionar · Esc = cancelar
        </div>
      </div>

    </div>

    <style>
      #lk-table th, #lk-table td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; }
      #lk-table thead th { border-bottom: 1px solid #e2e8f0; font-size: 12.5px; }
      #lk-table tbody tr:last-child td { border-bottom: none; }
      #lk-table .col-codigo { width: 110px; white-space: nowrap; text-align: left; color:#0f172a; }
      #lk-table .col-nome   { text-align: left; color:#0f172a; }
      #lk-table .col-val    { width: 140px; text-align: right; color:#0f172a; }
      #lk-table tbody tr { background:#fff; transition: background .12s ease; }
      #lk-table tbody tr:hover { background:#f8fafc; cursor: pointer; }
      #lk-table tbody tr.is-selected { background:#eef4ff; }
      #lk-empty, #lk-loading, #lk-error { text-align:center; color:#64748b; background:#fff; }
      #lk-error { color:#e11d48; }
    </style>
  `;
  document.body.appendChild(modal);

  // ===== Refs =====
  const elTitle = modal.querySelector('#lk-title');
  const elQ     = modal.querySelector('#lk-q');
  const elHead  = modal.querySelector('#lk-head');
  const elBody  = modal.querySelector('#lk-body');
  const elBtn   = modal.querySelector('#lk-btn');
  const elClear = modal.querySelector('#lk-clear');
  const elClose = modal.querySelector('#lk-close');

  let current = null; // { entity, setter }
  let selIndex = -1;  // linha selecionada para navegação por teclado
  let lastRows = [];

  // Map entity (UI) -> source (IPC/main.js)
  function mapEntityToSource(entity) {
    // Alias extra para telas que usam "cliente" singular
    const norm = String(entity || '').toLowerCase().trim();
    if (['cliente', 'clientes', 'fornecedor', 'fornecedores'].includes(norm)) return 'clifor';
    if (norm === 'empresas' || norm === 'empresa') return 'empresa';
    if (norm === 'servico' || norm === 'servicos') return 'servicos';
    // padrão mantém o que já existia
    switch (norm) {
      case 'produtos': return 'produtos';
      case 'servicos': return 'servicos';
      case 'clientes': return 'clifor';
      case 'fornecedores': return 'clifor';
      case 'empresas': return 'empresa';
      default: return 'produtos';
    }
  }

  function close() {
    modal.style.display = 'none';
    current = null;
    selIndex = -1;
    lastRows = [];
  }

  function open(entity, setter) {
    current = { entity, setter };
    elQ.value = '';
    elBody.innerHTML = '';
    elHead.innerHTML = '';
    selIndex = -1;
    lastRows = [];

    // Cabeçalhos conforme entidade
    if (entity === 'produtos') {
      elTitle.textContent = 'Pesquisar Produtos';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th><th class="col-val">Valor venda</th>`;
    } else if (entity === 'servicos' || entity === 'servico') {
      elTitle.textContent = 'Pesquisar Serviços';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th><th class="col-val">Valor</th>`;
    } else if (entity === 'clientes' || entity === 'cliente') {
      elTitle.textContent = 'Pesquisar Clientes';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    } else if (entity === 'fornecedores' || entity === 'fornecedor') {
      elTitle.textContent = 'Pesquisar Fornecedores';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    } else if (entity === 'empresas' || entity === 'empresa') {
      elTitle.textContent = 'Pesquisar Empresas';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    } else {
      elTitle.textContent = 'Pesquisar';
      elHead.innerHTML = `<th class="col-codigo">Código</th><th class="col-nome">Nome</th>`;
    }

    modal.style.display = 'flex';
    elQ.focus();

    // Lista tudo ao abrir
    search('');
  }

  // ===== Busca (com debounce) =====
  let tDebounce = null;
  function scheduleSearch() {
    clearTimeout(tDebounce);
    tDebounce = setTimeout(() => search(elQ.value || ''), 180);
  }

  async function search(qRaw) {
    if (!current) return;
    const q = String(qRaw || '').trim();

    elBody.innerHTML = `<tr><td id="lk-loading" colspan="${elHead.children.length || 3}">Carregando...</td></tr>`;

    try {
      const rows = await ipcRenderer.invoke('lookup:search', {
        source: mapEntityToSource(current.entity),
        term: q,
        limit: 50
      });

      lastRows = Array.isArray(rows) ? rows : [];
      selIndex = lastRows.length ? 0 : -1;

      if (!lastRows.length) {
        elBody.innerHTML = `<tr><td id="lk-empty" colspan="${elHead.children.length || 3}">Sem resultados</td></tr>`;
        return;
      }

      const money = (v) => Number(v || 0).toFixed(2);

      if (current.entity === 'produtos') {
        elBody.innerHTML = lastRows.map((r, i) => `
          <tr data-i="${i}" data-id="${r.chave}" data-label="${r.codigo} - ${r.nome}">
            <td class="col-codigo">${r.codigo}</td>
            <td class="col-nome">${r.nome}</td>
            <td class="col-val">${money(r.valorvenda)}</td>
          </tr>`).join('');
      } else if (current.entity === 'servicos' || current.entity === 'servico') {
        elBody.innerHTML = lastRows.map((r, i) => `
          <tr data-i="${i}" data-id="${r.chave}" data-label="${r.codigo} - ${r.nome}">
            <td class="col-codigo">${r.codigo}</td>
            <td class="col-nome">${r.nome}</td>
            <td class="col-val">${money(r.valorvenda)}</td>
          </tr>`).join('');
      } else {
        // clientes / fornecedores / empresas (clifor/empresa)
        elBody.innerHTML = lastRows.map((r, i) => `
          <tr data-i="${i}" data-id="${r.chave}" data-label="${r.codigo} - ${r.nome}">
            <td class="col-codigo">${r.codigo}</td>
            <td class="col-nome">${r.nome}</td>
          </tr>`).join('');
      }

      // Eventos de linha
      Array.from(elBody.querySelectorAll('tr[data-i]')).forEach(tr => {
        tr.addEventListener('click', () => {
          selIndex = Number(tr.getAttribute('data-i'));
          highlightSelection();
        });
        tr.addEventListener('dblclick', () => {
          selectRow(tr.getAttribute('data-id'), tr.getAttribute('data-label'));
        });
      });

      highlightSelection();
    } catch (e) {
      elBody.innerHTML = `<tr><td id="lk-error" colspan="${elHead.children.length || 3}">Erro: ${e.message}</td></tr>`;
    }
  }

  function highlightSelection() {
    Array.from(elBody.querySelectorAll('tr[data-i]')).forEach(tr => {
      tr.classList.toggle('is-selected', Number(tr.getAttribute('data-i')) === selIndex);
    });
  }

  function selectRow(id, label) {
    if (current && current.setter) current.setter({ id: Number(id), label });
    close();
  }

  // ===== Eventos =====
  elBtn.addEventListener('click', () => search(elQ.value || ''));
  elClear.addEventListener('click', () => { elQ.value = ''; elQ.focus(); search(''); });

  elQ.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      // Enter faz busca (não seleciona)
      search(elQ.value || '');
    }
  });
  elQ.addEventListener('input', scheduleSearch);
  elClose.addEventListener('click', close);
  modal.addEventListener('click', (ev) => { if (ev.target === modal) close(); });
  document.addEventListener('keydown', (ev) => {
    if (modal.style.display !== 'flex') return;
    if (ev.key === 'Escape') { close(); return; }

    // Navegação por teclado na lista
    if (!lastRows.length) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      selIndex = Math.min(lastRows.length - 1, selIndex + 1);
      highlightSelection();
      scrollIntoViewIfNeeded();
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      selIndex = Math.max(0, selIndex - 1);
      highlightSelection();
      scrollIntoViewIfNeeded();
      return;
    }
    if (ev.key === 'Enter' && document.activeElement !== elQ) {
      // Enter com foco fora do input seleciona a linha
      const tr = elBody.querySelector(`tr[data-i="${selIndex}"]`);
      if (tr) selectRow(tr.getAttribute('data-id'), tr.getAttribute('data-label'));
    }
  });

  function scrollIntoViewIfNeeded() {
    const tr = elBody.querySelector(`tr[data-i="${selIndex}"]`);
    if (!tr) return;
    const container = elBody.parentElement; // div com overflow
    const top = tr.offsetTop;
    const bottom = tr.offsetTop + tr.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = top - 8;
    else if (bottom > container.scrollTop + container.clientHeight)
      container.scrollTop = bottom - container.clientHeight + 8;
  }

  // API global
  window.openLookup = open;

  // F8 contextual (usa data-lookup + data-target-id do input focado)
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
