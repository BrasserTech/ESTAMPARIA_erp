// Entrada de PRODUTOS
window.renderCadastroEntradaProd = function () {
  return {
    title: 'Entrada (Produtos)',
    html: `
      <div class="card">
        <form class="form" id="form-entp" autocomplete="off">
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            <div>
              <label class="label">Fornecedor*</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="entp-forn" placeholder="F8 para pesquisar" data-lookup="fornecedores" data-target-id="entp-forn-id" />
                <button type="button" class="button outline" id="entp-forn-lupa" title="Pesquisar (F8)">🔎</button>
              </div>
              <input type="hidden" id="entp-forn-id" />
            </div>

            <div>
              <label class="label">Total (R$)</label>
              <input class="input" id="entp-total" type="number" step="0.01" min="0" value="0" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="entp-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid #e4e7eb;margin:12px 0" />

          <div>
            <label class="label">Produto</label>
            <div style="display:flex; gap:6px; max-width:520px">
              <input class="input" id="entp-prod" placeholder="F8 para pesquisar" data-lookup="produtos" data-target-id="entp-prod-id" />
              <button type="button" class="button" id="entp-add-prod">Adicionar</button>
              <button type="button" class="button outline" id="entp-prod-lupa" title="Pesquisar (F8)">🔎</button>
            </div>
            <input type="hidden" id="entp-prod-id" />
          </div>

          <div class="card" style="margin-top:12px">
            <h4 style="margin-bottom:8px">Itens de Produto</h4>
            <table class="table">
              <thead><tr><th>Código/Produto</th><th style="width:90px">Ação</th></tr></thead>
              <tbody id="entp-itens"></tbody>
            </table>
          </div>

          <div class="actions" style="margin-top:12px; gap:8px">
            <button type="submit" class="button">Salvar Entrada</button>
            <button type="reset" class="button outline" id="entp-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      let fornecedorId = null;
      let entradaChave = null;
      const itens = []; // {id, label, rowId}

      const $ = (id) => document.getElementById(id);
      const render = () => {
        const body = $('entp-itens');
        if (!itens.length) {
          body.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#78909c;background:#fff">Sem itens</td></tr>`;
          return;
        }
        body.innerHTML = itens.map(it => `
          <tr>
            <td>${it.label}</td>
            <td><button class="button outline btn-rem" data-id="${it.rowId}">Remover</button></td>
          </tr>
        `).join('');
        body.querySelectorAll('.btn-rem').forEach(btn => {
          btn.addEventListener('click', async () => {
            try {
              await ipcRenderer.invoke('movs:entrada:remProd', { itementradaprod_chave: Number(btn.dataset.id) });
              const ix = itens.findIndex(x => x.rowId === Number(btn.dataset.id));
              if (ix >= 0) itens.splice(ix, 1);
              render();
            } catch (e) { toast('Erro ao remover: ' + e.message, true); }
          });
        });
      };

      function resetAll() {
        $('form-entp').reset();
        fornecedorId = null;
        entradaChave = null;
        itens.length = 0;
        $('entp-forn-id').value = '';
        $('entp-prod-id').value = '';
        $('entp-forn').value = '';
        $('entp-prod').value = '';
        render();
      }

      // LUPAS
      $('entp-forn-lupa').addEventListener('click', () => {
        openLookup('fornecedores', ({ id, label }) => {
          $('entp-forn-id').value = String(id);
          $('entp-forn').value = label;
          fornecedorId = id;
        });
      });
      $('entp-prod-lupa').addEventListener('click', () => {
        openLookup('produtos', ({ id, label }) => {
          $('entp-prod-id').value = String(id);
          $('entp-prod').value = label;
        });
      });

      // muda fornecedor ao sair do campo (se veio do modal F8, já preenche hidden)
      $('entp-forn').addEventListener('change', () => {
        fornecedorId = Number($('entp-forn-id').value || '') || null;
      });

      async function ensureEntrada() {
        if (entradaChave) return entradaChave;
        if (!fornecedorId) throw new Error('Informe o fornecedor (F8 para pesquisar).');
        const { chave } = await ipcRenderer.invoke('movs:entrada:ensure', { chaveclifor: fornecedorId, ativo: 1 });
        entradaChave = chave;
        return chave;
      }

      $('entp-add-prod').addEventListener('click', async () => {
        try {
          const pid = Number($('entp-prod-id').value || '');
          const label = ($('entp-prod').value || '').trim();
          if (!pid) return toast('Selecione um produto (F8 ou lupa).', true);
          await ensureEntrada();
          const { chave: rowId } = await ipcRenderer.invoke('movs:entrada:addProd', { chaveentrada: entradaChave, chaveproduto: pid });
          itens.push({ id: pid, label, rowId });
          $('entp-prod').value = '';
          $('entp-prod-id').value = '';
          render();
        } catch (e) { toast('Erro ao adicionar: ' + e.message, true); }
      });

      $('form-entp').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ensureEntrada();
          const total = Number($('entp-total').value || '0');
          const obs = ($('entp-obs').value || '').trim() || null;
          await ipcRenderer.invoke('movs:entrada:finalizar', {
            chaveentrada: entradaChave, chaveclifor: fornecedorId, total, obs
          });
          toast('Entrada (produtos) salva!');
          resetAll();
        } catch (err) { toast('Erro ao salvar: ' + err.message, true); }
      });

      $('entp-reset').addEventListener('click', resetAll);
      render();
    }
  };
};
