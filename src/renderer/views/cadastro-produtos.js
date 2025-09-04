// src/renderer/views/cadastro-produtos.js
window.renderCadastroProdutos = function () {
  return {
    title: 'Cadastro de Produtos',
    html: `
      <div class="card">
        <form class="form" id="form-prod" autocomplete="off">
          <div class="form-fields">
            <div style="grid-column:1 / -1">
              <label class="label">Nome*</label>
              <input class="input" id="p-nome" required maxlength="100" placeholder="Ex.: Camiseta Algodão" />
            </div>

            <div>
              <label class="label">Valor de compra* (R$)</label>
              <input class="input" id="p-vcompra" type="number" step="0.01" min="0" value="0" required />
            </div>

            <div>
              <label class="label">Valor de venda (R$)</label>
              <input class="input" id="p-vvenda" type="number" step="0.01" min="0" placeholder="Em branco = igual à compra" />
            </div>

            <div>
              <label class="label">Empresa (referência) — opcional</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="p-emp" placeholder="F8 para pesquisar empresa" data-lookup="empresas" data-target-id="p-emp-id" />
                <button type="button" class="button outline" id="p-emp-lupa" title="Pesquisar (F8)">🔎</button>
              </div>
              <input type="hidden" id="p-emp-id" />
            </div>

            <div>
              <label class="label">Validade (opcional)</label>
              <input class="input" id="p-valid" type="date" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="p-obs" rows="3" maxlength="300" placeholder="Detalhes do produto..."></textarea>
            </div>
          </div>

          <!-- Botões no rodapé, à direita -->
          <div class="form-actions">
            <button type="submit" class="button">Salvar</button>
            <button type="reset" class="button outline" id="p-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (id) => document.getElementById(id);

      function resetAll() {
        $('form-prod').reset();
        $('p-emp-id').value = '';
        $('p-emp').value = '';
        $('p-nome').focus();
      }

      $('p-emp-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('empresas', ({ id, label }) => {
          $('p-emp-id').value = String(id);
          $('p-emp').value = label;
        });
      });

      $('p-reset').addEventListener('click', resetAll);

      $('form-prod').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const nome = ($('p-nome').value || '').trim();
          if (!nome) return toast('Informe o nome do produto.', true);

          const valorcompra = Number($('p-vcompra').value || '0');
          let valorvenda = $('p-vvenda').value ? Number($('p-vvenda').value) : NaN;
          if (!isFinite(valorvenda)) valorvenda = valorcompra;

          const payload = {
            nome,
            valorcompra,
            valorvenda,
            chaveemp: Number($('p-emp-id').value || '') || null,
            validade: $('p-valid').value || null,
            obs: ($('p-obs').value || '').trim() || null,
            categoria: 1
          };

          await ipcRenderer.invoke('produtos:criar', payload);
          toast('Produto salvo!');
          resetAll();
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      $('p-nome').focus();
    }
  };
};
