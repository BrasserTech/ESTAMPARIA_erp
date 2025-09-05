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
                <input class="input" id="entp-forn" placeholder="F8 para pesquisar"
                       data-lookup="fornecedores" data-target-id="entp-forn-id" />
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
            <div style="display:flex; gap:6px; max-width:620px">
              <input class="input" id="entp-prod" placeholder="F8 para pesquisar"
                     data-lookup="produtos" data-target-id="entp-prod-id" />
              <button type="button" class="button" id="entp-add-prod">Adicionar</button>
              <button type="button" class="button outline" id="entp-prod-lupa" title="Pesquisar (F8)">🔎</button>
            </div>
            <input type="hidden" id="entp-prod-id" />
          </div>

          <div class="card" style="margin-top:12px">
            <h4 style="margin:0 0 8px 0">Itens de Produto</h4>
            <table class="table" style="--td-pad:10px">
              <thead>
                <tr>
                  <th style="width:130px">Código</th>
                  <th>Produto</th>
                  <th style="width:120px;text-align:right">Ação</th>
                </tr>
              </thead>
              <tbody id="entp-itens"></tbody>
            </table>
            <div id="entp-empty" style="padding:10px 12px; color:#78909c; display:none">Sem itens</div>
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

      // Estado local
      let fornecedorId = null;
      let entradaChave = null;
      const itens = []; // [{id, codigo, nome, rowId}]

      // Helpers DOM
      const $ = (id) => document.getElementById(id);

      // Renderização do grid
      function renderGrid() {
        const body = $('entp-itens');
        const empty = $('entp-empty');

        if (!itens.length) {
          body.innerHTML = '';
          empty.style.display = 'block';
          return;
        }
        empty.style.display = 'none';
        body.innerHTML = itens.map((it) => `
          <tr>
            <td>${it.codigo}</td>
            <td>${it.nome}</td>
            <td style="text-align:right">
              <button class="button outline btn-rem" data-id="${it.rowId}">Remover</button>
            </td>
          </tr>
        `).join('');

        body.querySelectorAll('.btn-rem').forEach((btn) => {
          btn.addEventListener('click', async () => {
            try {
              const rowId = Number(btn.dataset.id);
              await ipcRenderer.invoke('movs:entrada:remProd', { itementradaprod_chave: rowId });
              const ix = itens.findIndex(x => x.rowId === rowId);
              if (ix >= 0) itens.splice(ix, 1);
              renderGrid();
              toast('Item removido.');
            } catch (e) {
              toast('Erro ao remover: ' + e.message, true);
            }
          });
        });
      }

      // Reset
      function resetAll() {
        $('form-entp').reset();
        fornecedorId = null;
        entradaChave = null;
        itens.length = 0;
        $('entp-forn-id').value = '';
        $('entp-prod-id').value = '';
        $('entp-forn').value = '';
        $('entp-prod').value = '';
        renderGrid();
      }

      // LUPAS
      $('entp-forn-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('fornecedores', ({ id, label }) => {
          $('entp-forn-id').value = String(id);
          $('entp-forn').value = label;
          fornecedorId = id;
        });
      });
      $('entp-prod-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('produtos', ({ id, label }) => {
          $('entp-prod-id').value = String(id);
          $('entp-prod').value = label;
        });
      });

      // Se o usuário editar o texto do fornecedor manualmente,
      // usamos o hidden apenas se estiver preenchido.
      $('entp-forn').addEventListener('change', () => {
        fornecedorId = Number($('entp-forn-id').value || '') || null;
      });

      // invoke com fallback (resolve o “No handler registered” caso algo não tenha carregado)
      async function safeInvoke(channel, payload) {
        try {
          return await ipcRenderer.invoke(channel, payload);
        } catch (err) {
          // Apenas para o ensure, tentamos um alias muito comum em projetos antigos
          if (channel === 'movs:entrada:ensure') {
            try {
              return await ipcRenderer.invoke('movsentrada:ensure', payload);
            } catch (err2) {
              throw err; // devolve o erro original
            }
          }
          throw err;
        }
      }

      // Garante um cabeçalho/rascunho de Entrada existente
      async function ensureEntrada() {
        if (entradaChave) return entradaChave;
        if (!fornecedorId) throw new Error('Informe o fornecedor (F8 para pesquisar).');
        const { chave } = await safeInvoke('movs:entrada:ensure', { chaveclifor: fornecedorId, ativo: 1 });
        entradaChave = chave;
        return chave;
      }

      // Clique em “Adicionar”
      $('entp-add-prod').addEventListener('click', async () => {
        try {
          const pid = Number($('entp-prod-id').value || '');
          const label = ($('entp-prod').value || '').trim();
          if (!pid) return toast('Selecione um produto (F8 ou lupa).', true);

          await ensureEntrada();

          // Extrai "código - nome" quando possível para quebrar corretamente nas colunas
          let codigo = '';
          let nome = label;
          const dashIx = label.indexOf(' - ');
          if (dashIx > -1) {
            codigo = label.substring(0, dashIx).trim();
            nome   = label.substring(dashIx + 3).trim();
          }

          const { chave: rowId } = await ipcRenderer.invoke('movs:entrada:addProd', {
            chaveentrada: entradaChave, chaveproduto: pid
          });

          itens.push({ id: pid, codigo: codigo || '—', nome, rowId });
          $('entp-prod').value = '';
          $('entp-prod-id').value = '';
          renderGrid();
          toast('Item adicionado.');
        } catch (e) {
          toast('Erro ao adicionar: ' + e.message, true);
        }
      });

      // Salvar / Finalizar a Entrada
      $('form-entp').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ensureEntrada();
          const total = Number($('entp-total').value || '0');
          const obs = ($('entp-obs').value || '').trim() || null;

          await ipcRenderer.invoke('movs:entrada:finalizar', {
            chaveentrada: entradaChave,
            chaveclifor: fornecedorId,
            total,
            obs
          });

          toast('Entrada (produtos) salva!');
          resetAll();
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      // Limpar
      $('entp-reset').addEventListener('click', resetAll);

      // Inicial
      renderGrid();
    }
  };
};
