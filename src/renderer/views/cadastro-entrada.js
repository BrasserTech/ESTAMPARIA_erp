// src/renderer/views/cadastro-entrada.js
window.renderCadastroEntrada = function () {
  return {
    title: 'Cadastro de Entrada',
    html: `
      <div class="card">
        <form class="form" id="form-ent" autocomplete="off">
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">

            <div>
              <label class="label">Fornecedor (CLIFOR)*</label>
              <input class="input" id="ent-forn-search" placeholder="Digite para buscar..." list="ent-forn-list" />
              <datalist id="ent-forn-list"></datalist>
              <input type="hidden" id="ent-forn-id" />
            </div>

            <div>
              <label class="label">Total (R$)</label>
              <input class="input" id="ent-total" type="number" step="0.01" min="0" value="0" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="ent-obs" rows="3" maxlength="300" placeholder="Detalhes da entrada..."></textarea>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid #e4e7eb;margin:12px 0" />

          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            <div>
              <label class="label">Adicionar Produto</label>
              <input class="input" id="ent-prod-search" placeholder="Buscar produto..." list="ent-prod-list" />
              <datalist id="ent-prod-list"></datalist>
              <button type="button" class="button" id="ent-add-prod" style="margin-top:6px">Adicionar</button>
            </div>

            <div>
              <label class="label">Adicionar Serviço</label>
              <input class="input" id="ent-serv-search" placeholder="Buscar serviço..." list="ent-serv-list" />
              <datalist id="ent-serv-list"></datalist>
              <button type="button" class="button" id="ent-add-serv" style="margin-top:6px">Adicionar</button>
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
              <tbody id="ent-itens"></tbody>
            </table>
          </div>

          <div class="actions" style="margin-top:12px; gap:8px">
            <button type="submit" class="button">Salvar Entrada</button>
            <button type="reset" class="button outline" id="ent-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // --- estado local (rascunho + grid)
      let fornecedorId = null;
      let entradaChave = null; // rascunho criado ao 1º "Adicionar"
      const itens = []; // [{t:'p'|'s', itemRowChave: number, display: string}]

      const elFornSearch = document.getElementById('ent-forn-search');
      const elFornList = document.getElementById('ent-forn-list');
      const elFornHidden = document.getElementById('ent-forn-id');

      const elProdSearch = document.getElementById('ent-prod-search');
      const elProdList = document.getElementById('ent-prod-list');

      const elServSearch = document.getElementById('ent-serv-search');
      const elServList = document.getElementById('ent-serv-list');

      const elItens = document.getElementById('ent-itens');

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
              if (t === 'p') await ipcRenderer.invoke('movs:entrada:remProd', { itementradaprod_chave: id });
              else await ipcRenderer.invoke('movs:entrada:remServ', { itementradaserv_chave: id });
              const ix = itens.findIndex(x => x.itemRowChave === id);
              if (ix >= 0) itens.splice(ix, 1);
              renderItens();
            } catch (e) {
              toast('Erro ao remover item: ' + e.message, true);
            }
          });
        });
      }

      async function buscarFornecedores(q) {
        const rows = await ipcRenderer.invoke('movs:lookupClifor', { search: q || '', tipo: 2, limit: 20 });
        elFornList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
      }
      async function buscarProdutos(q) {
        const rows = await ipcRenderer.invoke('movs:lookupProdutos', { search: q || '', limit: 20 });
        elProdList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
      }
      async function buscarServicos(q) {
        const rows = await ipcRenderer.invoke('movs:lookupServicos', { search: q || '', limit: 20 });
        elServList.innerHTML = rows.map(r => `<option value="${r.codigo} - ${r.nome}" data-id="${r.chave}"></option>`).join('');
      }

      async function ensureEntrada() {
        if (entradaChave) return entradaChave;
        if (!fornecedorId) throw new Error('Informe o fornecedor (CLIFOR) antes de adicionar itens.');
        const cab = await ipcRenderer.invoke('movs:entrada:ensure', { chaveclifor: fornecedorId, ativo: 1 });
        entradaChave = cab.chave;
        return entradaChave;
      }

      function resetForm() {
        document.getElementById('form-ent').reset();
        fornecedorId = null;
        entradaChave = null;
        itens.length = 0;
        elFornList.innerHTML = '';
        elProdList.innerHTML = '';
        elServList.innerHTML = '';
        elFornHidden.value = '';
        elFornSearch.value = '';
        elProdSearch.value = '';
        elServSearch.value = '';
        renderItens();
      }

      /* ---------- eventos ---------- */
      elFornSearch.addEventListener('input', () => buscarFornecedores(elFornSearch.value));
      elProdSearch.addEventListener('input', () => buscarProdutos(elProdSearch.value));
      elServSearch.addEventListener('input', () => buscarServicos(elServSearch.value));

      elFornSearch.addEventListener('change', () => {
        fornecedorId = pickIdFromDatalist(elFornSearch, elFornList);
        elFornHidden.value = fornecedorId || '';
      });

      document.getElementById('ent-add-prod').addEventListener('click', async () => {
        try {
          const prodChave = pickIdFromDatalist(elProdSearch, elProdList);
          if (!prodChave) return toast('Selecione um produto válido', true);
          await ensureEntrada();
          const { chave: itemRowChave } = await ipcRenderer.invoke('movs:entrada:addProd', {
            chaveentrada: entradaChave, chaveproduto: prodChave
          });
          itens.push({ t: 'p', itemRowChave, display: displayFromInput(elProdSearch) });
          elProdSearch.value = '';
          renderItens();
        } catch (e) {
          toast('Erro ao adicionar produto: ' + e.message, true);
        }
      });

      document.getElementById('ent-add-serv').addEventListener('click', async () => {
        try {
          const servChave = pickIdFromDatalist(elServSearch, elServList);
          if (!servChave) return toast('Selecione um serviço válido', true);
          await ensureEntrada();
          const { chave: itemRowChave } = await ipcRenderer.invoke('movs:entrada:addServ', {
            chaveentrada: entradaChave, chaveservico: servChave
          });
          itens.push({ t: 's', itemRowChave, display: displayFromInput(elServSearch) });
          elServSearch.value = '';
          renderItens();
        } catch (e) {
          toast('Erro ao adicionar serviço: ' + e.message, true);
        }
      });

      // Salvar/Finalizar Entrada
      const form = document.getElementById('form-ent');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          if (!fornecedorId) return toast('Informe o fornecedor (CLIFOR)', true);
          if (!entradaChave) await ensureEntrada(); // cria se ainda não criou

          const total = Number(document.getElementById('ent-total').value || '0');
          const obs = (document.getElementById('ent-obs').value || '').trim() || null;

          await ipcRenderer.invoke('movs:entrada:finalizar', {
            chaveentrada: entradaChave,
            chaveclifor: fornecedorId,
            total,
            obs,
          });

          toast('Entrada salva!');
          resetForm(); // limpa tudo (inclusive grid de itens)
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      // Limpar manual
      document.getElementById('ent-reset').addEventListener('click', resetForm);

      // inicial
      renderItens();
    },
  };
};
