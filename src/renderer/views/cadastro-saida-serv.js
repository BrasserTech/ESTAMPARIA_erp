// Saída de SERVIÇOS
window.renderCadastroSaidaServ = function () {
  return {
    title: 'Saída (Serviços)',
    html: `
      <div class="card">
        <form class="form" id="form-sais" autocomplete="off">
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            <div>
              <label class="label">Cliente*</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="sais-cli" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="sais-cli-id" />
                <button type="button" class="button outline" id="sais-cli-lupa">🔎</button>
              </div>
              <input type="hidden" id="sais-cli-id" />
            </div>

            <div>
              <label class="label">Total (R$)</label>
              <input class="input" id="sais-total" type="number" step="0.01" min="0" value="0" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="sais-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid #e4e7eb;margin:12px 0" />

          <div>
            <label class="label">Serviço</label>
            <div style="display:flex; gap:6px; max-width:520px">
              <input class="input" id="sais-serv" placeholder="F8 para pesquisar" data-lookup="servicos" data-target-id="sais-serv-id" />
              <button type="button" class="button" id="sais-add-serv">Adicionar</button>
              <button type="button" class="button outline" id="sais-serv-lupa">🔎</button>
            </div>
            <input type="hidden" id="sais-serv-id" />
          </div>

          <div class="card" style="margin-top:12px">
            <h4 style="margin-bottom:8px">Itens de Serviço</h4>
            <table class="table">
              <thead><tr><th>Código/Serviço</th><th style="width:90px">Ação</th></tr></thead>
              <tbody id="sais-itens"></tbody>
            </table>
          </div>

          <div class="actions" style="margin-top:12px; gap:8px">
            <button type="submit" class="button">Salvar Saída</button>
            <button type="reset" class="button outline" id="sais-reset">Limpar</button>
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
        const body = $('sais-itens');
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
              await ipcRenderer.invoke('movs:saida:remServ', { itemsaidaserv_chave: Number(btn.dataset.id) });
              const ix = itens.findIndex(x => x.rowId === Number(btn.dataset.id));
              if (ix >= 0) itens.splice(ix, 1);
              render();
            } catch (e) { toast('Erro ao remover: ' + e.message, true); }
          });
        });
      };
      function resetAll() {
        $('form-sais').reset();
        clienteId = null; saidaChave = null; itens.length = 0;
        ['sais-cli-id','sais-serv-id','sais-cli','sais-serv'].forEach(id => { $(id).value = ''; });
        render();
      }

      $('sais-cli-lupa').addEventListener('click', () => {
        openLookup('clientes', ({ id, label }) => {
          $('sais-cli-id').value = String(id);
          $('sais-cli').value = label;
          clienteId = id;
        });
      });
      $('sais-serv-lupa').addEventListener('click', () => {
        openLookup('servicos', ({ id, label }) => {
          $('sais-serv-id').value = String(id);
          $('sais-serv').value = label;
        });
      });

      $('sais-cli').addEventListener('change', () => {
        clienteId = Number($('sais-cli-id').value || '') || null;
      });

      async function ensureSaida() {
        if (saidaChave) return saidaChave;
        if (!clienteId) throw new Error('Informe o cliente.');
        const { chave } = await ipcRenderer.invoke('movs:saida:ensure', { chaveclifor: clienteId, ativo: 1 });
        saidaChave = chave;
        return chave;
      }

      $('sais-add-serv').addEventListener('click', async () => {
        try {
          const sid = Number($('sais-serv-id').value || '');
          const label = ($('sais-serv').value || '').trim();
          if (!sid) return toast('Selecione um serviço (F8 ou lupa).', true);
          await ensureSaida();
          const { chave: rowId } = await ipcRenderer.invoke('movs:saida:addServ', { chavesaida: saidaChave, chaveservico: sid });
          itens.push({ id: sid, label, rowId });
          $('sais-serv').value = ''; $('sais-serv-id').value = '';
          render();
        } catch (e) { toast('Erro ao adicionar: ' + e.message, true); }
      });

      $('form-sais').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ensureSaida();
          const total = Number($('sais-total').value || '0');
          const obs = ($('sais-obs').value || '').trim() || null;
          await ipcRenderer.invoke('movs:saida:finalizar', {
            chavesaida: saidaChave, chaveclifor: clienteId, total, obs
          });
          toast('Saída (serviços) salva!');
          resetAll();
        } catch (err) { toast('Erro ao salvar: ' + err.message, true); }
      });

      $('sais-reset').addEventListener('click', resetAll);
      render();
    }
  };
};
