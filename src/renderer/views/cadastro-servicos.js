// src/renderer/views/cadastro-servicos.js
window.renderCadastroServicos = function () {
  return {
    title: 'Cadastro de Serviços',
    html: `
      <div class="card">
        <form class="form" id="form-serv" autocomplete="off">
          <div class="form-fields">
            <div style="grid-column:1/-1">
              <label class="label">Nome*</label>
              <input class="input" id="s-nome" required maxlength="100" placeholder="Ex.: Silk 1 cor" />
            </div>

            <div>
              <label class="label">Valor de venda* (R$)</label>
              <input class="input" id="s-valor" type="number" step="0.01" min="0" value="0" required />
            </div>

            <div>
              <label class="label">Categoria</label>
              <input class="input" id="s-cat" type="number" step="1" min="1" value="1" />
            </div>

            <div>
              <label class="label">Empresa (referência) — opcional</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="s-emp" placeholder="F8 para pesquisar empresa" data-lookup="empresas" data-target-id="s-emp-id" />
                <button type="button" class="button outline" id="s-emp-lupa" title="Pesquisar (F8)">🔎</button>
              </div>
              <input type="hidden" id="s-emp-id" />
            </div>

            <div>
              <label class="label">Validade (opcional)</label>
              <input class="input" id="s-valid" type="date" />
            </div>

            <div style="grid-column:1/-1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="s-obs" rows="3" maxlength="300" placeholder="Detalhes do serviço..."></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="button">Salvar</button>
            <button type="reset" class="button outline" id="s-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (id) => document.getElementById(id);

      // Lupa / F8 para Empresa
      $('s-emp-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('empresas', ({ id, label }) => {
          $('s-emp-id').value = String(id);
          $('s-emp').value = label;
        });
      });

      function resetAll() {
        $('form-serv').reset();
        $('s-emp-id').value = '';
        $('s-emp').value = '';
        $('s-cat').value = '1';
        $('s-valor').value = '0';
        $('s-nome').focus();
      }
      $('s-reset').addEventListener('click', resetAll);

      $('form-serv').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const nome = ($('s-nome').value || '').trim();
          if (!nome) return toast('Informe o nome do serviço.', true);

          const payload = {
            nome,
            valorvenda: Number($('s-valor').value || '0') || 0,
            chaveemp: Number($('s-emp-id').value || '') || null,
            obs: ($('s-obs').value || '').trim() || null,
            categoria: Number($('s-cat').value || '1') || 1,
            validade: $('s-valid').value || null
            // prazoentrega removido do cadastro (será definido na saída)
          };

          await ipcRenderer.invoke('servicos:criar', payload);
          toast('Serviço salvo!');
          resetAll();
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      $('s-nome').focus();
    }
  };
};
