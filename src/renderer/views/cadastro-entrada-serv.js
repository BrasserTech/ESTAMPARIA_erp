// Entrada de SERVIÇOS
window.renderCadastroEntradaServ = function () {
  return {
    title: 'Entrada (Serviços)',
    html: `
      <div class="card">
        <form class="form" id="form-ents" autocomplete="off">
          <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
            <div>
              <label class="label">Fornecedor*</label>
              <div style="display:flex; gap:6px">
                <input class="input" id="ents-forn" placeholder="F8 para pesquisar" data-lookup="fornecedores" data-target-id="ents-forn-id" />
                <button type="button" class="button outline" id="ents-forn-lupa">🔎</button>
              </div>
              <input type="hidden" id="ents-forn-id" />
            </div>

            <div>
              <label class="label">Total (R$)</label>
              <input class="input" id="ents-total" type="number" step="0.01" min="0" value="0" />
            </div>

            <div style="grid-column:1 / -1">
              <label class="label">Observações</label>
              <textarea class="textarea" id="ents-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
            </div>
          </div>

          <hr style="border:none;border-top:1px solid #e4e7eb;margin:12px 0" />

          <div>
            <label class="label">Serviço</label>
            <div style="display:flex; gap:6px; max-width:520px">
              <input class="input" id="ents-serv" placeholder="F8 para pesquisar" data-lookup="servicos" data-target-id="ents-serv-id" />
              <button type="button" class="button" id="ents-add-serv">Adicionar</button>
              <button type="button" class="button outline" id="ents-serv-lupa">🔎</button>
            </div>
            <input type="hidden" id="ents-serv-id" />
          </div>

          <div class="card" style="margin-top:12px">
            <h4 style="margin-bottom:8px">Itens de Serviço</h4>
            <table class="table">
              <thead><tr><th>Código/Serviço</th><th style="width:90px">Ação</th></tr></thead>
              <tbody id="ents-itens"></tbody>
            </table>
          </div>

          <div class="actions" style="margin-top:12px; gap:8px">
            <button type="submit" class="button">Salvar Entrada</button>
            <button type="reset" class="button outline" id="ents-reset">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');
      let fornecedorId = null;
      let entradaChave = null;
      const itens = [];

      const $ = (id) => document.getElementById(id);
      const render = () => {
        const body = $('ents-itens');
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
              await ipcRenderer.invoke('movs:entrada:remServ', { itementradaserv_chave: Number(btn.dataset.id) });
              const ix = itens.findIndex(x => x.rowId === Number(btn.dataset.id));
              if (ix >= 0) itens.splice(ix, 1);
              render();
            } catch (e) { toast('Erro ao remover: ' + e.message, true); }
          });
        });
      };
      function resetAll() {
        $('form-ents').reset();
        fornecedorId = null;
        entradaChave = null;
        itens.length = 0;
        ['ents-forn-id','ents-serv-id','ents-forn','ents-serv'].forEach(id => { $(id).value = ''; });
        render();
      }

      $('ents-forn-lupa').addEventListener('click', () => {
        openLookup('fornecedores', ({ id, label }) => {
          $('ents-forn-id').value = String(id);
          $('ents-forn').value = label;
          fornecedorId = id;
        });
      });
      $('ents-serv-lupa').addEventListener('click', () => {
        openLookup('servicos', ({ id, label }) => {
          $('ents-serv-id').value = String(id);
          $('ents-serv').value = label;
        });
      });

      $('ents-forn').addEventListener('change', () => {
        fornecedorId = Number($('ents-forn-id').value || '') || null;
      });

      async function ensureEntrada() {
        if (entradaChave) return entradaChave;
        if (!fornecedorId) throw new Error('Informe o fornecedor.');
        const { chave } = await ipcRenderer.invoke('movs:entrada:ensure', { chaveclifor: fornecedorId, ativo: 1 });
        entradaChave = chave;
        return chave;
      }

      $('ents-add-serv').addEventListener('click', async () => {
        try {
          const sid = Number($('ents-serv-id').value || '');
          const label = ($('ents-serv').value || '').trim();
          if (!sid) return toast('Selecione um serviço (F8 ou lupa).', true);
          await ensureEntrada();
          const { chave: rowId } = await ipcRenderer.invoke('movs:entrada:addServ', { chaveentrada: entradaChave, chaveservico: sid });
          itens.push({ id: sid, label, rowId });
          $('ents-serv').value = ''; $('ents-serv-id').value = '';
          render();
        } catch (e) { toast('Erro ao adicionar: ' + e.message, true); }
      });

      $('form-ents').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ensureEntrada();
          const total = Number($('ents-total').value || '0');
          const obs = ($('ents-obs').value || '').trim() || null;
          await ipcRenderer.invoke('movs:entrada:finalizar', {
            chaveentrada: entradaChave, chaveclifor: fornecedorId, total, obs
          });
          toast('Entrada (serviços) salva!');
          resetAll();
        } catch (err) { toast('Erro ao salvar: ' + err.message, true); }
      });

      $('ents-reset').addEventListener('click', resetAll);
      render();
    }
  };
};
