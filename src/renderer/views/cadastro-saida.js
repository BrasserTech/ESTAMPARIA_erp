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
            <button type="submit" class="button">Salvar Saída</button>
            <button type="reset" class="button outline" id="sai-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // --- estado local
      let clienteId = null;
      let saidaChave = null; // rascunho criado ao 1º "Adicionar"
      const itens = []; // [{t:'p'|'s', itemRowChave: number, display: string}]

      const elCliSearch = document.getElementById('sai-cli-search');
      const elCliList = document.getElementById('sai-cli-list');
      const elCliHidden = document.getElementById('sai-cli-id');

      const elProdSearch = document.getElementById('sai-prod-search');
      const elProdList = document.getElementById('sai-prod-list');

      const elServSearch = document.getElementById('sai-serv-search');
      const elServList = document.getElementById('sai-serv-list');

      const elItens = document.getElementById('sai-itens');

      /* ---------- util ---------- */
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

        // bind remover
        Array.from(elItens.querySelectorAll('.btn-rem')).forEach(btn => {
          btn.addEventListener('click', async () => {
            const t = btn.getAttribute('data-t');
            const id = Number(btn.getAttribute('data-id'));
            try {
              if (t === 'p') await ipcRenderer.invoke('movs:saida:remProd', { itemsaidaprod_chave: id });
              else await ipcRenderer.invoke('movs:saida:remServ', { itemsaidaserv_chave: id });
              const ix = itens.findIndex(x => x.itemRowChave === id);
              if (ix >= 0) itens.splice(ix, 1);
              renderItens();
            } catch (e) {
              toast('Erro ao remover item: ' + e.message, true);
            }
          });
        });
      }

      async function buscarClientes(q) {
        const rows = await ipcRenderer.invoke('movs:lookupClifor', { search: q || '', tipo: 1, limit: 20 });
        elCliList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
      }
      async function buscarProdutos(q) {
        const rows = await ipcRenderer.invoke('movs:lookupProdutos', { search: q || '', limit: 20 });
        elProdList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
      }
      async function buscarServicos(q) {
        const rows = await ipcRenderer.invoke('movs:lookupServicos', { search: q || '', limit: 20 });
        elServList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
      }

      async function ensureSaida() {
        if (saidaChave) return saidaChave;
        if (!clienteId) throw new Error('Informe o cliente (CLIFOR) antes de adicionar itens.');
        const cab = await ipcRenderer.invoke('movs:saida:ensure', { chaveclifor: clienteId, ativo: 1 });
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
      }

      /* ---------- eventos ---------- */
      elCliSearch.addEventListener('input', () => buscarClientes(elCliSearch.value));
      elProdSearch.addEventListener('input', () => buscarProdutos(elProdSearch.value));
      elServSearch.addEventListener('input', () => buscarServicos(elServSearch.value));

      elCliSearch.addEventListener('change', () => {
        clienteId = pickIdFromDatalist(elCliSearch, elCliList);
        elCliHidden.value = clienteId || '';
      });

      document.getElementById('sai-add-prod').addEventListener('click', async () => {
        try {
          const prodChave = pickIdFromDatalist(elProdSearch, elProdList);
          if (!prodChave) return toast('Selecione um produto válido', true);
          await ensureSaida();
          const { chave: itemRowChave } = await ipcRenderer.invoke('movs:saida:addProd', {
            chavesaida: saidaChave, chaveproduto: prodChave
          });
          itens.push({ t: 'p', itemRowChave, display: displayFromInput(elProdSearch) });
          elProdSearch.value = '';
          renderItens();
        } catch (e) {
          toast('Erro ao adicionar produto: ' + e.message, true);
        }
      });

      document.getElementById('sai-add-serv').addEventListener('click', async () => {
        try {
          const servChave = pickIdFromDatalist(elServSearch, elServList);
          if (!servChave) return toast('Selecione um serviço válido', true);
          await ensureSaida();
          const { chave: itemRowChave } = await ipcRenderer.invoke('movs:saida:addServ', {
            chavesaida: saidaChave, chaveservico: servChave
          });
          itens.push({ t: 's', itemRowChave, display: displayFromInput(elServSearch) });
          elServSearch.value = '';
          renderItens();
        } catch (e) {
          toast('Erro ao adicionar serviço: ' + e.message, true);
        }
      });

      // Salvar/Finalizar Saída
      const form = document.getElementById('form-sai');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          if (!clienteId) return toast('Informe o cliente (CLIFOR)', true);
          if (!saidaChave) await ensureSaida();

          const total = Number(document.getElementById('sai-total').value || '0');
          const obs = (document.getElementById('sai-obs').value || '').trim() || null;

          await ipcRenderer.invoke('movs:saida:finalizar', {
            chavesaida: saidaChave,
            chaveclifor: clienteId,
            total,
            obs,
          });

          toast('Saída salva!');
          resetForm(); // limpa tudo (inclusive grid de itens)
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      // Limpar manual
      document.getElementById('sai-reset').addEventListener('click', resetForm);

      // inicial
      renderItens();
    },
  };
};
