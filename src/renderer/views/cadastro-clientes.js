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
            <button type="submit" class="button" id="c-submit">Salvar</button>
            <button type="reset" class="button outline" id="c-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (id) => document.getElementById(id);

      // ====== TOAST seguro (fallback local se window.toast não existir) ======
      function safeToast(message, isError = false) {
        try {
          if (typeof window.toast === 'function') {
            window.toast(message, isError);
            return;
          }
        } catch (_) { /* ignora e usa fallback */ }

        // fallback simples
        const host = document.body;
        let box = document.getElementById('__toast_fallback_box__');
        if (!box) {
          box = document.createElement('div');
          box.id = '__toast_fallback_box__';
          box.style.position = 'fixed';
          box.style.right = '18px';
          box.style.bottom = '18px';
          box.style.zIndex = '99999';
          host.appendChild(box);
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

      // ====== helpers de máscara/normalização ======
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
        if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
        if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
        return digits;
      }

      // formata documento ao sair do campo
      $('c-doc').addEventListener('blur', () => {
        const raw = $('c-doc').value || '';
        const digits = onlyDigits(raw);
        if (!digits) { $('c-doc').value = ''; return; }
        if (digits.length === 11) {
          $('c-doc').value = formatCPF(digits);
          if (!$('c-fisjur').value) $('c-fisjur').value = '1';
        } else if (digits.length === 14) {
          $('c-doc').value = formatCNPJ(digits);
          if (!$('c-fisjur').value) $('c-fisjur').value = '2';
        } else {
          $('c-doc').value = raw;
        }
      });

      // formata telefone ao sair do campo
      $('c-tel').addEventListener('blur', () => {
        const raw = $('c-tel').value || '';
        const digits = onlyDigits(raw);
        if (!digits) { $('c-tel').value = ''; return; }
        $('c-tel').value = formatPhone(digits);
      });

      // ====== lookup Empresa (botão + F8) ======
      function openEmpresasLookup() {
        if (typeof window.openLookup !== 'function') {
          safeToast('Lookup não carregado.', true);
          return;
        }
        window.openLookup('empresas', ({ id, label }) => {
          $('c-emp-id').value = String(id);
          $('c-emp').value = label;
        });
      }
      $('c-emp-lupa').addEventListener('click', openEmpresasLookup);
      // F8 global abre lookup se o foco estiver nesta view
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F8') {
          e.preventDefault();
          openEmpresasLookup();
        }
      });

      // ====== reset ======
      function resetAll() {
        $('form-cli').reset();
        $('c-emp-id').value = '';
        $('c-emp').value = '';
        $('c-nome').focus();
      }
      $('c-reset').addEventListener('click', (e) => {
        e.preventDefault();
        resetAll();
        safeToast('Formulário limpo.');
      });

      // ====== estado de carregamento do submit ======
      const submitBtn = $('c-submit');
      const submitBtnDefaultText = submitBtn.textContent;
      function setBusy(isBusy) {
        submitBtn.disabled = isBusy;
        submitBtn.textContent = isBusy ? 'Salvando…' : submitBtnDefaultText;
        submitBtn.classList.toggle('is-loading', isBusy);
      }

      // ====== submit ======
      $('form-cli').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn.disabled) return; // evita duplo clique rápido

        try {
          const nome = ($('c-nome').value || '').trim();
          if (!nome) {
            safeToast('Informe o nome.', true);
            $('c-nome').focus();
            return;
          }

          setBusy(true);

          // normalizações para enviar ao back-end:
          const fisjur = Number($('c-fisjur').value || '1') || 1; // 1 = Física, 2 = Jurídica
          const cpfDigits = onlyDigits($('c-doc').value || '');
          const telDigits = onlyDigits($('c-tel').value || '');

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

          // chamada ao main (sem novos IPCs)
          await ipcRenderer.invoke('clientes:criar', payload);

          // sucesso: feedback e limpeza
          safeToast('Cliente salvo!');
          resetAll();
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);
          safeToast('Erro ao salvar: ' + msg, true);
        } finally {
          setBusy(false);
        }
      });

      $('c-nome').focus();
    }
  };
};
