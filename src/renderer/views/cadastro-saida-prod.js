// Saída de PRODUTOS
window.renderCadastroSaidaProd = function () {
  return {
    title: 'Saída (Produtos)',
    html: `
      <div class="card">
        <form class="form" id="form-saip" autocomplete="off">
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            <div>
              <label class="label">Cliente*</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="saip-cli" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="saip-cli-id" />
                <button type="button" class="button outline" id="saip-cli-lupa">🔎</button>
              </div>
              <input type="hidden" id="saip-cli-id" />
            </div>

            <div>
              <label class="label">Total (R$)</label>
              <input class="input" id="saip-total" type="number" step="0.01" min="0" value="0" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="saip-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid #e4e7eb;margin:12px 0" />

          <div>
            <label class="label">Produto</label>
            <div style="display:flex; gap:6px; max-width:520px">
              <input class="input" id="saip-prod" placeholder="F8 para pesquisar" data-lookup="produtos" data-target-id="saip-prod-id" />
              <button type="button" class="button" id="saip-add-prod">Adicionar</button>
              <button type="button" class="button outline" id="saip-prod-lupa">🔎</button>
            </div>
            <input type="hidden" id="saip-prod-id" />
          </div>

          <div class="card" style="margin-top:12px">
            <h4 style="margin-bottom:8px">Itens de Produto</h4>
            <table class="table">
              <thead><tr><th>Código/Produto</th><th style="width:90px">Ação</th></tr></thead>
              <tbody id="saip-itens"></tbody>
            </table>
          </div>

          <div class="actions" style="margin-top:12px; gap:8px">
            <button type="submit" class="button">Salvar Saída</button>
            <button type="reset" class="button outline" id="saip-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      let clienteId = null;
      let saidaChave = null;
      const itens = [];

      const $ = (id) => document.getElementById(id);
      const render = () => {
        const body = $('saip-itens');
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
              await ipcRenderer.invoke('movs:saida:remProd', { itemsaidaprod_chave: Number(btn.dataset.id) });
              const ix = itens.findIndex(x => x.rowId === Number(btn.dataset.id));
              if (ix >= 0) itens.splice(ix, 1);
              render();
            } catch (e) { toast('Erro ao remover: ' + e.message, true); }
          });
        });
      };
      function resetAll() {
        $('form-saip').reset();
        clienteId = null; saidaChave = null; itens.length = 0;
        ['saip-cli-id','saip-prod-id','saip-cli','saip-prod'].forEach(id => { $(id).value = ''; });
        render();
      }

      $('saip-cli-lupa').addEventListener('click', () => {
        openLookup('clientes', ({ id, label }) => {
          $('saip-cli-id').value = String(id);
          $('saip-cli').value = label;
          clienteId = id;
        });
      });
      $('saip-prod-lupa').addEventListener('click', () => {
        openLookup('produtos', ({ id, label }) => {
          $('saip-prod-id').value = String(id);
          $('saip-prod').value = label;
        });
      });

      $('saip-cli').addEventListener('change', () => {
        clienteId = Number($('saip-cli-id').value || '') || null;
      });

      async function ensureSaida() {
        if (saidaChave) return saidaChave;
        if (!clienteId) throw new Error('Informe o cliente.');
        const { chave } = await ipcRenderer.invoke('movs:saida:ensure', { chaveclifor: clienteId, ativo: 1 });
        saidaChave = chave;
        return chave;
      }

      $('saip-add-prod').addEventListener('click', async () => {
        try {
          const pid = Number($('saip-prod-id').value || '');
          const label = ($('saip-prod').value || '').trim();
          if (!pid) return toast('Selecione um produto (F8 ou lupa).', true);
          await ensureSaida();
          const { chave: rowId } = await ipcRenderer.invoke('movs:saida:addProd', { chavesaida: saidaChave, chaveproduto: pid });
          itens.push({ id: pid, label, rowId });
          $('saip-prod').value = ''; $('saip-prod-id').value = '';
          render();
        } catch (e) { toast('Erro ao adicionar: ' + e.message, true); }
      });

      $('form-saip').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ensureSaida();
          const total = Number($('saip-total').value || '0');
          const obs = ($('saip-obs').value || '').trim() || null;
          await ipcRenderer.invoke('movs:saida:finalizar', {
            chavesaida: saidaChave, chaveclifor: clienteId, total, obs
          });
          toast('Saída (produtos) salva!');
          resetAll();
        } catch (err) { toast('Erro ao salvar: ' + err.message, true); }
      });

      $('saip-reset').addEventListener('click', resetAll);
      render();
    }
  };
};
