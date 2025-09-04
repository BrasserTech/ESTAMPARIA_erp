// src/renderer/views/cadastro-clientes.js
window.renderCadastroClientes = function () {
  return {
    title: 'Cadastro de Clientes',
    html: `
      <div class="card">
        <form class="form" id="form-cli" autocomplete="off">
          <div class="form-fields">
            <div style="grid-column:1/-1">
              <label class="label">Nome*</label>
              <input class="input" id="c-nome" required maxlength="120" placeholder="Cliente Exemplo" />
            </div>

            <div>
              <label class="label">Fis./Jur.*</label>
              <select class="input" id="c-fisjur" required>
                <option value="1">Física</option>
                <option value="2">Jurídica</option>
              </select>
            </div>

            <div>
              <label class="label">Tipo*</label>
              <select class="input" id="c-tipo" required>
                <option value="1">Cliente</option>
                <option value="2">Fornecedor</option>
                <option value="3">Representante</option>
              </select>
            </div>

            <div>
              <label class="label">Documento (CPF/CNPJ)</label>
              <input class="input" id="c-doc" maxlength="32" placeholder="000.000.000-00 / 00.000.000/0001-00" />
            </div>

            <div>
              <label class="label">Empresa (referência) — opcional</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="c-emp" placeholder="F8 para pesquisar empresa" data-lookup="empresas" data-target-id="c-emp-id" />
                <button type="button" class="button outline" id="c-emp-lupa" title="Pesquisar (F8)">🔎</button>
              </div>
              <input type="hidden" id="c-emp-id" />
            </div>

            <div>
              <label class="label">Email</label>
              <input class="input" id="c-email" type="email" maxlength="120" placeholder="contato@email.com" />
            </div>

            <div>
              <label class="label">Telefone</label>
              <input class="input" id="c-tel" maxlength="32" placeholder="(00) 00000-0000" />
            </div>

            <div style="grid-column:1/-1">
              <label class="label">Endereço</label>
              <input class="input" id="c-end" maxlength="200" placeholder="Rua, nº, bairro, cidade" />
            </div>
          </div>

          <!-- Botões no rodapé, à direita -->
          <div class="form-actions">
            <button type="submit" class="button">Salvar</button>
            <button type="reset" class="button outline" id="c-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (id) => document.getElementById(id);

      $('c-emp-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('empresas', ({ id, label }) => {
          $('c-emp-id').value = String(id);
          $('c-emp').value = label;
        });
      });

      function resetAll() {
        $('form-cli').reset();
        $('c-emp-id').value = '';
        $('c-emp').value = '';
        $('c-nome').focus();
      }
      $('c-reset').addEventListener('click', resetAll);

      $('form-cli').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const nome = ($('c-nome').value || '').trim();
          if (!nome) return toast('Informe o nome.', true);

          const payload = {
            nome,
            fisjur: Number($('c-fisjur').value || 1),
            tipo: Number($('c-tipo').value || 1),
            pertenceemp: Number($('c-emp-id').value || '') || null,
            email: ($('c-email').value || '').trim() || null,
            cpf: ($('c-doc').value || '').trim() || null,
            telefone: ($('c-tel').value || '').trim() || null,
            endereco: ($('c-end').value || '').trim() || null
          };

          await ipcRenderer.invoke('clientes:criar', payload);
          toast('Cliente salvo!');
          resetAll();
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      $('c-nome').focus();
    }
  };
};
