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
              <input class="input" id="c-doc" maxlength="32" placeholder="00000000000 ou 00000000000000" />
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

      /* ========= helpers de máscara/normalização ========= */
      const onlyDigits = (s) => (s || '').replace(/\D+/g, '');

      function formatCPF(digits) {
        if (digits.length !== 11) return digits;
        return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
      }

      function formatCNPJ(digits) {
        if (digits.length !== 14) return digits;
        return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
      }

      function formatPhone(digits) {
        // 10 dígitos: (00) 0000-0000 | 11 dígitos: (00) 00000-0000
        if (digits.length === 10) {
          return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
        }
        if (digits.length === 11) {
          return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
        }
        return digits; // tamanhos diferentes, deixa como está
      }

      // Formata documento ao sair do campo (sem impedir o usuário digitar livre)
      $('c-doc').addEventListener('blur', () => {
        const raw = $('c-doc').value || '';
        const digits = onlyDigits(raw);
        if (!digits) { $('c-doc').value = ''; return; }

        // decide formatação por tamanho
        if (digits.length === 11) {
          $('c-doc').value = formatCPF(digits);
          // força fis/jur = Física se estiver vazio/errado
          if (!$('c-fisjur').value) $('c-fisjur').value = '1';
        } else if (digits.length === 14) {
          $('c-doc').value = formatCNPJ(digits);
          if (!$('c-fisjur').value) $('c-fisjur').value = '2';
        } else {
          // tamanho inesperado: mantém o que o usuário pôs (sem erro)
          $('c-doc').value = raw;
        }
      });

      // Formata telefone ao sair do campo
      $('c-tel').addEventListener('blur', () => {
        const raw = $('c-tel').value || '';
        const digits = onlyDigits(raw);
        if (!digits) { $('c-tel').value = ''; return; }
        $('c-tel').value = formatPhone(digits);
      });

      /* ========= lookup Empresa ========= */
      $('c-emp-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('empresas', ({ id, label }) => {
          $('c-emp-id').value = String(id);
          $('c-emp').value = label;
        });
      });

      /* ========= reset ========= */
      function resetAll() {
        $('form-cli').reset();
        $('c-emp-id').value = '';
        $('c-emp').value = '';
        $('c-nome').focus();
      }
      $('c-reset').addEventListener('click', resetAll);

      /* ========= submit ========= */
      $('form-cli').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const nome = ($('c-nome').value || '').trim();
          if (!nome) return toast('Informe o nome.', true);

          // normalizações para enviar ao back-end:
          const fisjur = Number($('c-fisjur').value || '1') || 1; // 1 = Física, 2 = Jurídica
          const cpfDigits = onlyDigits($('c-doc').value || '');
          const telDigits = onlyDigits($('c-tel').value || '');

          // envia somente dígitos (constraints costumam exigir isso)
          const payload = {
            nome,
            fisjur,
            tipo: Number($('c-tipo').value || '1') || 1,
            pertenceemp: Number($('c-emp-id').value || '') || null,
            email: ($('c-email').value || '').trim() || null,
            cpf: (cpfDigits.length ? cpfDigits : null),
            telefone: (telDigits.length ? telDigits : null),
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
