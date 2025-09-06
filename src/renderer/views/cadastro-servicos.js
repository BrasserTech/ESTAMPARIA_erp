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
            <button type="submit" class="button" id="s-submit">Salvar</button>
            <button type="reset" class="button outline" id="s-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      const $ = (id) => document.getElementById(id);

      // ===== Toast seguro com fallback =====
      function safeToast(message, isError = false) {
        try {
          if (typeof window.toast === 'function') {
            window.toast(message, isError);
            return;
          }
        } catch (_) {}
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

      // ===== Lookup Empresa (botão + F8) =====
      function openEmpresasLookup() {
        if (typeof window.openLookup !== 'function') {
          safeToast('Lookup não carregado.', true);
          return;
        }
        window.openLookup('empresas', ({ id, label }) => {
          $('s-emp-id').value = String(id);
          $('s-emp').value = label;
        });
      }
      $('s-emp-lupa').addEventListener('click', openEmpresasLookup);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F8') {
          e.preventDefault();
          openEmpresasLookup();
        }
      });

      // ===== Reset padronizado =====
      function resetAll() {
        $('form-serv').reset();
        $('s-emp-id').value = '';
        $('s-emp').value = '';
        $('s-cat').value = '1';
        $('s-valor').value = '0';
        $('s-nome').focus();
      }
      $('s-reset').addEventListener('click', (e) => {
        e.preventDefault();
        resetAll();
        safeToast('Formulário limpo.');
      });

      // ===== Estado de carregamento / prevenção de duplo clique =====
      const submitBtn = $('s-submit');
      const submitBtnDefault = submitBtn.textContent;
      function setBusy(isBusy) {
        submitBtn.disabled = isBusy;
        submitBtn.textContent = isBusy ? 'Salvando…' : submitBtnDefault;
        submitBtn.classList.toggle('is-loading', isBusy);
      }

      // ===== Submit =====
      $('form-serv').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn.disabled) return;

        try {
          const nome = ($('s-nome').value || '').trim();
          if (!nome) {
            safeToast('Informe o nome do serviço.', true);
            $('s-nome').focus();
            return;
          }

          // Normalização do valor (garante número válido)
          let valor = Number($('s-valor').value || '0');
          if (!Number.isFinite(valor) || valor < 0) valor = 0;

          setBusy(true);

          const payload = {
            nome,
            valorvenda: valor,
            chaveemp: Number($('s-emp-id').value || '') || null,
            obs: ($('s-obs').value || '').trim() || null,
            categoria: Number($('s-cat').value || '1') || 1,
            validade: ($('s-valid').value || '') ? $('s-valid').value : null
            // prazoentrega permanece fora deste cadastro
          };

          await ipcRenderer.invoke('servicos:criar', payload);

          safeToast('Serviço salvo!');
          resetAll();
        } catch (err) {
          const msg = (err && err.message) ? err.message : String(err);
          safeToast('Erro ao salvar: ' + msg, true);
        } finally {
          setBusy(false);
        }
      });

      $('s-nome').focus();
    }
  };
};
