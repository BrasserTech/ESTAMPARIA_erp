// src/renderer/views/cadastro-saida.js
window.renderCadastroSaida = function () {
  return {
    title: 'Cadastro de Saída',
    html: `
      <div class="card">
        <form class="form" id="form-sai" autocomplete="off">
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">

            <div>
              <label class="label">Cliente (CLIFOR)*</label>
              <input class="input" id="sai-cli-search" placeholder="Digite para buscar..." list="sai-cli-list" />
              <datalist id="sai-cli-list"></datalist>
              <input type="hidden" id="sai-cli-id" />
            </div>

            <div>
              <label class="label">Total (R$)</label>
              <input class="input" id="sai-total" type="number" step="0.01" min="0" value="0" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="sai-obs" rows="3" maxlength="300" placeholder="Detalhes da venda..."></textarea>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid #e4e7eb;margin:12px 0" />

          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            <div>
              <label class="label">Adicionar Produto</label>
              <input class="input" id="sai-prod-search" placeholder="Buscar produto..." list="sai-prod-list" />
              <datalist id="sai-prod-list"></datalist>
              <button type="button" class="button" id="sai-add-prod" style="margin-top:6px">Adicionar</button>
            </div>

            <div>
              <label class="label">Adicionar Serviço</label>
              <input class="input" id="sai-serv-search" placeholder="Buscar serviço..." list="sai-serv-list" />
              <datalist id="sai-serv-list"></datalist>
              <button type="button" class="button" id="sai-add-serv" style="margin-top:6px">Adicionar</button>
            </div>
          </div>

          <div class="card" style="margin-top:12px">
            <h4 style="margin-bottom:8px">Itens</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th style="width:90px">Ação</th>
                </tr>
              </thead>
              <tbody id="sai-itens"></tbody>
            </table>
          </div>

          <div class="actions" style="margin-top:12px; gap:8px">
            <button type="submit" class="button" id="sai-submit">Salvar Saída</button>
            <button type="reset" class="button outline" id="sai-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // ---------- estado local ----------
      let clienteId = null;
      let saidaChave = null; // rascunho criado ao 1º "Adicionar"
      const itens = []; // [{t:'p'|'s', itemRowChave: number, display: string}]

      // ---------- elementos ----------
      const elCliSearch = document.getElementById('sai-cli-search');
      const elCliList = document.getElementById('sai-cli-list');
      const elCliHidden = document.getElementById('sai-cli-id');

      const elProdSearch = document.getElementById('sai-prod-search');
      const elProdList = document.getElementById('sai-prod-list');
      const btnAddProd = document.getElementById('sai-add-prod');

      const elServSearch = document.getElementById('sai-serv-search');
      const elServList = document.getElementById('sai-serv-list');
      const btnAddServ = document.getElementById('sai-add-serv');

      const elItens = document.getElementById('sai-itens');
      const btnSubmit = document.getElementById('sai-submit');

      // ===== Toast robusto (fallback) =====
      function safeToast(message, isError = false) {
        try {
          if (typeof window.toast === 'function') { window.toast(message, isError); return; }
        } catch(_) {}
        let box = document.getElementById('__toast_fallback_box__');
        if (!box) {
          box = document.createElement('div');
          box.id = '__toast_fallback_box__';
          box.style.position = 'fixed';
          box.style.right = '18px';
          box.style.bottom = '18px';
          box.style.zIndex = '99999';
          document.body.appendChild(box);
        }
        const item = document.createElement('div');
        item.textContent = message;
        item.style.marginTop = '8px';
        item.style.padding = '10px 14px';
        item.style.borderRadius = '10px';
        item.style.boxShadow = '0 10px 24px rgba(0,0,0,.12)';
        item.style.background = isError ? '#fee2e2' : '#ecfdf5';
        item.style.border = `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`;
        item.style.color = isError ? '#991b1b' : '#065f46';
        item.style.fontSize = '14px';
        item.style.maxWidth = '380px';
        item.style.wordBreak = 'break-word';
        box.appendChild(item);
        setTimeout(() => item.remove(), 2600);
      }

      // ===== Aliases (só quando faltar handler principal) =====
      const ENSURE_ALIASES     = ['movssaida:ensure','movs:saida:createHeader','movs:saidaensure','saidas:ensure','movs:ensure:saida'];
      const ADD_PROD_ALIASES   = ['movssaida:addProd','movs:saida:addProduto','movs:saida:addprod','saidas:addProd'];
      const ADD_SERV_ALIASES   = ['movssaida:addServ','movs:saida:addServico','movs:saida:addserv','saidas:addServ'];
      const REM_PROD_ALIASES   = ['movssaida:remProd','movs:saida:removeProd','movs:saida:remProduto','saidas:remProd'];
      const REM_SERV_ALIASES   = ['movssaida:remServ','movs:saida:removeServ','movs:saida:remServico','saidas:remServ'];
      const FINALIZAR_ALIASES  = ['movssaida:finalizar','movs:saida:close','saidas:finalizar'];

      async function safeInvoke(channel, payload, aliases = []) {
        try {
          return await ipcRenderer.invoke(channel, payload);
        } catch (err) {
          const msg = String(err?.message || err);
          const isNoHandler =
            msg.includes('No handler registered') ||
            msg.includes('has no listeners') ||
            msg.includes('not a function');
          if (isNoHandler && Array.isArray(aliases) && aliases.length) {
            for (const alt of aliases) {
              try { return await ipcRenderer.invoke(alt, payload); } catch { /* tenta próximo */ }
            }
          }
          throw err;
        }
      }

      // ---------- util ----------
      function pickIdFromDatalist(inputEl, listEl) {
        const val = (inputEl.value || '').trim();
        const opt = Array.from(listEl.options || []).find(o => o.value === val);
        if (!opt) return null;
        const id = opt.getAttribute('data-id');
        return id ? Number(id) : null;
      }
      function displayFromInput(inputEl) {
        return (inputEl.value || '').trim();
      }
      function setBusy(button, busy, labelBusy) {
        if (!button) return;
        button.disabled = busy;
        if (busy) {
          button.dataset._default = button.dataset._default || button.textContent;
          button.textContent = labelBusy || 'Processando…';
          button.classList.add('is-loading');
        } else {
          button.textContent = button.dataset._default || button.textContent;
          button.classList.remove('is-loading');
        }
      }

      function renderItens() {
        if (!itens.length) {
          elItens.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#78909c;background:#fff">Sem itens</td></tr>`;
          return;
        }
        elItens.innerHTML = itens.map(it => `
          <tr>
            <td>${it.t === 'p' ? 'Produto' : 'Serviço'}</td>
            <td>${it.display}</td>
            <td><button type="button" class="button outline btn-rem" data-t="${it.t}" data-id="${it.itemRowChave}">Remover</button></td>
          </tr>
        `).join('');

        // remover
        Array.from(elItens.querySelectorAll('.btn-rem')).forEach(btn => {
          btn.addEventListener('click', async () => {
            const t = btn.getAttribute('data-t');
            const id = Number(btn.getAttribute('data-id'));
            try {
              if (t === 'p') await safeInvoke('movs:saida:remProd', { itemsaidaprod_chave: id }, REM_PROD_ALIASES);
              else           await safeInvoke('movs:saida:remServ', { itemsaidaserv_chave: id }, REM_SERV_ALIASES);
              const ix = itens.findIndex(x => x.itemRowChave === id);
              if (ix >= 0) itens.splice(ix, 1);
              renderItens();
              safeToast('Item removido.');
            } catch (e) {
              safeToast('Erro ao remover item: ' + (e?.message || e), true);
            }
          });
        });
      }

      async function buscarClientes(q) {
        try {
          const rows = await ipcRenderer.invoke('movs:lookupClifor', { search: q || '', tipo: 1, limit: 20 });
          elCliList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
        } catch (e) {
          safeToast('Erro ao buscar clientes: ' + (e?.message || e), true);
        }
      }
      async function buscarProdutos(q) {
        try {
          const rows = await ipcRenderer.invoke('movs:lookupProdutos', { search: q || '', limit: 20 });
          elProdList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
        } catch (e) {
          safeToast('Erro ao buscar produtos: ' + (e?.message || e), true);
        }
      }
      async function buscarServicos(q) {
        try {
          const rows = await ipcRenderer.invoke('movs:lookupServicos', { search: q || '', limit: 20 });
          elServList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
        } catch (e) {
          safeToast('Erro ao buscar serviços: ' + (e?.message || e), true);
        }
      }

      async function ensureSaida() {
        if (saidaChave) return saidaChave;
        if (!clienteId) throw new Error('Informe o cliente (CLIFOR) antes de adicionar itens.');
        const cab = await safeInvoke('movs:saida:ensure', { chaveclifor: clienteId, ativo: 1 }, ENSURE_ALIASES);
        saidaChave = cab.chave;
        return saidaChave;
      }

      function resetForm() {
        document.getElementById('form-sai').reset();
        clienteId = null;
        saidaChave = null;
        itens.length = 0;
        elCliList.innerHTML = '';
        elProdList.innerHTML = '';
        elServList.innerHTML = '';
        elCliHidden.value = '';
        elCliSearch.value = '';
        elProdSearch.value = '';
        elServSearch.value = '';
        renderItens();
        elCliSearch.focus();
      }

      // ---------- eventos ----------
      elCliSearch.addEventListener('input', () => buscarClientes(elCliSearch.value));
      elProdSearch.addEventListener('input', () => buscarProdutos(elProdSearch.value));
      elServSearch.addEventListener('input', () => buscarServicos(elServSearch.value));

      elCliSearch.addEventListener('change', () => {
        clienteId = pickIdFromDatalist(elCliSearch, elCliList);
        elCliHidden.value = clienteId || '';
      });

      // Enter em campos de busca aciona adicionar correspondente
      elProdSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); btnAddProd.click(); }
      });
      elServSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); btnAddServ.click(); }
      });

      // Adicionar Produto
      btnAddProd.addEventListener('click', async () => {
        if (btnAddProd.disabled) return;
        try {
          const prodChave = pickIdFromDatalist(elProdSearch, elProdList);
          if (!prodChave) return safeToast('Selecione um produto válido.', true);

          setBusy(btnAddProd, true, 'Adicionando…');
          await ensureSaida();

          const { chave: itemRowChave, descricao } = await safeInvoke(
            'movs:saida:addProd',
            { chavesaida: saidaChave, chaveproduto: prodChave },
            ADD_PROD_ALIASES
          );

          itens.push({ t: 'p', itemRowChave, display: descricao || displayFromInput(elProdSearch) });
          elProdSearch.value = '';
          renderItens();
          safeToast('Produto adicionado.');
        } catch (e) {
          safeToast('Erro ao adicionar produto: ' + (e?.message || e), true);
        } finally {
          setBusy(btnAddProd, false);
        }
      });

      // Adicionar Serviço
      btnAddServ.addEventListener('click', async () => {
        if (btnAddServ.disabled) return;
        try {
          const servChave = pickIdFromDatalist(elServSearch, elServList);
          if (!servChave) return safeToast('Selecione um serviço válido.', true);

          setBusy(btnAddServ, true, 'Adicionando…');
          await ensureSaida();

          const { chave: itemRowChave, descricao } = await safeInvoke(
            'movs:saida:addServ',
            { chavesaida: saidaChave, chaveservico: servChave },
            ADD_SERV_ALIASES
          );

          itens.push({ t: 's', itemRowChave, display: descricao || displayFromInput(elServSearch) });
          elServSearch.value = '';
          renderItens();
          safeToast('Serviço adicionado.');
        } catch (e) {
          safeToast('Erro ao adicionar serviço: ' + (e?.message || e), true);
        } finally {
          setBusy(btnAddServ, false);
        }
      });

      // Salvar/Finalizar Saída
      const form = document.getElementById('form-sai');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (btnSubmit.disabled) return;
        try {
          if (!clienteId) return safeToast('Informe o cliente (CLIFOR).', true);
          if (!itens.length) return safeToast('Adicione ao menos um item.', true);

          setBusy(btnSubmit, true, 'Salvando…');

          if (!saidaChave) await ensureSaida();

          const total = Number(document.getElementById('sai-total').value || '0');
          const obs = (document.getElementById('sai-obs').value || '').trim() || null;

          await safeInvoke(
            'movs:saida:finalizar',
            { chavesaida: saidaChave, chaveclifor: clienteId, total, obs },
            FINALIZAR_ALIASES
          );

          safeToast('Saída salva!');
          resetForm(); // limpa tudo (inclusive grid de itens)
        } catch (err) {
          safeToast('Erro ao salvar: ' + (err?.message || err), true);
        } finally {
          setBusy(btnSubmit, false);
        }
      });

      // Limpar manual
      document.getElementById('sai-reset').addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
        safeToast('Formulário limpo.');
      });

      // inicial
      renderItens();
      elCliSearch.focus();
    },
  };
};
