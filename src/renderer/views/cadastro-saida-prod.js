// Saída de PRODUTOS — versão com ações abaixo das observações,
// container visual e layout fluido sem sobrar espaço em branco.
window.renderCadastroSaidaProd = function () {
  return {
    title: 'Saída (Produtos)',
    html: `
      <style>
        /* ------------ CONTÊINER GERAL ------------ */
        .saip-shell {
          border: 1px solid #e5eaf0;
          border-radius: 14px;
          background: #fff;
          box-shadow: 0 8px 22px rgba(15,23,42,.06);
          padding: 14px;
        }
        .saip-wrap { display:flex; flex-direction:column; gap:16px; }

        /* ------------ GRID SUPERIOR (cadastro) ------------ */
        /* Colunas: cliente grande (min 420px), total compacto (min 220px) */
        .section-top {
          display:grid;
          grid-template-columns: minmax(420px, 1fr) minmax(220px, .6fr);
          gap:14px;
        }
        .wide { grid-column: 1 / -1; }

        .label { font-weight: 600; color:#0f172a; }
        .input.numeric { text-align: right; }
        .textarea { resize: vertical; min-height: 92px; }

        /* ------------ ROW DE PRODUTO ------------ */
        .product-row {
          display:grid;
          grid-template-columns: 1fr auto 140px 160px auto; /* produto | lupa | qtd | vlr unit | botão */
          gap:10px; align-items:end;
          padding:10px; border:1px solid #e5eaf0; border-radius:12px; background:#fbfdff;
        }
        .product-row .field { display:flex; flex-direction:column; gap:6px; }
        .product-row .field .label { font-size:12px; color:#64748b; }
        .product-row .btns { display:flex; gap:8px; align-items:center; }

        /* Ajuste para telas menores */
        @media (max-width: 1100px) {
          .section-top { grid-template-columns: 1fr; }
          .product-row {
            grid-template-columns: 1fr auto 140px 160px auto;
          }
        }
        @media (max-width: 820px) {
          .product-row { grid-template-columns: 1fr 1fr; }
          .product-row .btns { grid-column: 1 / -1; }
        }

        /* ------------ AÇÕES (abaixo das observações) ------------ */
        .actions-row {
          display:flex; gap:8px; align-items:center; justify-content:flex-start;
          padding-top:2px;
        }

        /* ------------ TABELA INFERIOR ------------ */
        .items-wrapper { margin-top: 8px; }
        .items-card {
          border: 1px solid #e5eaf0;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(15,23,42,.06);
          overflow:hidden;
        }
        .items-card h4 {
          margin: 0; padding: 12px 14px;
          border-bottom: 1px solid #e5eaf0;
          font-size: 15px; color:#0f172a;
        }
        .tbl-wrap { padding: 6px 10px 12px 10px; }
        .tbl-grid { width: 100%; border-collapse: separate; border-spacing: 0; }
        .tbl-grid thead th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
          font-size: 13px;
          border-bottom: 1px solid #e5eaf0;
          padding: 12px 10px;
          position: sticky; top: 0; z-index: 1;
        }
        .tbl-grid tbody td {
          border-bottom: 1px solid #eef2f7;
          padding: 12px 10px;
          color: #0f172a;
        }
        .tbl-grid tbody tr:last-child td { border-bottom: none; }
        .tbl-grid tbody tr:hover { background: #f9fbff; }
        .txt-right { text-align: right; }
        .empty-row { text-align:center; color:#64748b; background:#fff; }

        .btn-ghost {
          background:#fff; border:1px solid #e5eaf0; color:#334155;
          padding:6px 10px; border-radius:8px; cursor:pointer;
        }
        .btn-ghost:hover { background:#f8fafc; }
      </style>

      <div class="saip-shell">
        <div class="saip-wrap">
          <form class="form" id="form-saip" autocomplete="off">
            <!-- TOPO -->
            <div class="section-top">
              <div>
                <label class="label">Cliente*</label>
                <div style="display:flex; gap:6px">
                  <input class="input" id="saip-cli"
                         placeholder="F8 para pesquisar"
                         data-lookup="clientes" data-target-id="saip-cli-id" />
                  <button type="button" class="button outline" id="saip-cli-lupa" title="Pesquisar (F8)">🔎</button>
                </div>
                <input type="hidden" id="saip-cli-id" />
              </div>

              <div>
                <label class="label">Total (R$)</label>
                <input class="input numeric" id="saip-total" type="number" step="0.01" min="0" value="0" disabled />
              </div>

              <div class="wide">
                <label class="label">Observações</label>
                <textarea class="textarea" id="saip-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
              </div>

              <!-- AÇÕES imediatamente abaixo das observações -->
              <div class="actions-row wide">
                <button type="submit" class="button">Salvar Saída</button>
                <button type="reset" class="button outline" id="saip-reset">Limpar</button>
              </div>

              <!-- PRODUTO ocupa largura total -->
              <div class="wide">
                <label class="label">Produto</label>
                <div class="product-row">
                  <div class="field">
                    <input class="input" id="saip-prod"
                           placeholder="F8 para pesquisar"
                           data-lookup="produtos" data-target-id="saip-prod-id" />
                  </div>

                  <div class="btns">
                    <button type="button" class="button outline" id="saip-prod-lupa" title="Pesquisar (F8)">🔎</button>
                  </div>

                  <div class="field">
                    <label class="label">Quantidade</label>
                    <input class="input numeric" id="saip-qtde" type="number" step="0.001" min="0.001" value="1" />
                  </div>

                  <div class="field">
                    <label class="label">Valor unitário (R$)</label>
                    <input class="input numeric" id="saip-vu" type="number" step="0.01" min="0" value="0" />
                  </div>

                  <div class="btns">
                    <button type="button" class="button" id="saip-add-prod" title="Adicionar (Enter)">Adicionar</button>
                  </div>

                  <input type="hidden" id="saip-prod-id" />
                </div>
              </div>
            </div>

            <!-- TABELA INFERIOR -->
            <div class="items-wrapper">
              <div class="items-card">
                <h4>Itens de Produto</h4>
                <div class="tbl-wrap">
                  <table class="tbl-grid">
                    <thead>
                      <tr>
                        <th style="min-width:280px">Produto</th>
                        <th class="txt-right" style="width:120px">Qtd</th>
                        <th class="txt-right" style="width:140px">Vlr Unit</th>
                        <th class="txt-right" style="width:140px">Total</th>
                        <th style="width:110px">Ação</th>
                      </tr>
                    </thead>
                    <tbody id="saip-itens"></tbody>
                  </table>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      let clienteId = null;
      let saidaChave = null;
      const itens = []; // { id, label, qtde, vu, vt, rowId }

      const $ = (id) => document.getElementById(id);
      const fmt2 = (n) => Number(n || 0).toFixed(2);
      const fmt3 = (n) => Number(n || 0).toFixed(3);

      function recalcTotal() {
        const tot = itens.reduce((acc, it) => acc + Number(it.vt || 0), 0);
        $('saip-total').value = fmt2(tot);
      }

      function renderGrid() {
        const body = $('saip-itens');
        if (!itens.length) {
          body.innerHTML = `
            <tr>
              <td class="empty-row" colspan="5">Itens adicionados serão exibidos nessa tabela</td>
            </tr>`;
          recalcTotal();
          return;
        }
        body.innerHTML = itens.map(it => `
          <tr>
            <td>${it.label}</td>
            <td class="txt-right">${fmt3(it.qtde)}</td>
            <td class="txt-right">${fmt2(it.vu)}</td>
            <td class="txt-right">${fmt2(it.vt)}</td>
            <td><button type="button" class="btn-ghost btn-rem" data-id="${it.rowId}">Remover</button></td>
          </tr>
        `).join('');

        body.querySelectorAll('.btn-rem').forEach(btn => {
          btn.addEventListener('click', async () => {
            try {
              await ipcRenderer.invoke('movs:saida:remProd', { itemsaidaprod_chave: Number(btn.dataset.id) });
              const ix = itens.findIndex(x => x.rowId === Number(btn.dataset.id));
              if (ix >= 0) itens.splice(ix, 1);
              renderGrid();
            } catch (e) {
              toast('Erro ao remover: ' + e.message, true);
            }
          });
        });

        recalcTotal();
      }

      function resetAll() {
        $('form-saip').reset();
        $('saip-total').value = '0.00';
        clienteId = null;
        saidaChave = null;
        itens.length = 0;
        ['saip-cli-id','saip-prod-id','saip-cli','saip-prod'].forEach(id => { $(id).value = ''; });
        $('saip-qtde').value = '1';
        $('saip-vu').value = '0';
        renderGrid();
        $('saip-cli').focus();
      }

      // LOOKUP + foco
      $('saip-cli-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('clientes', ({ id, label }) => {
          $('saip-cli-id').value = String(id);
          $('saip-cli').value = label;
          clienteId = id;
          $('saip-prod').focus();
        });
        $('saip-cli').focus();
      });

      $('saip-prod-lupa').addEventListener('click', () => {
        if (typeof openLookup !== 'function') return toast('Lookup não carregado.', true);
        openLookup('produtos', ({ id, label }) => {
          $('saip-prod-id').value = String(id);
          $('saip-prod').value = label;
          $('saip-qtde').focus();
          $('saip-qtde').select?.();
        });
        $('saip-prod').focus();
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

      // Enter adiciona item
      const addFromKeyboard = (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          $('saip-add-prod').click();
        }
      };
      $('saip-prod').addEventListener('keydown', addFromKeyboard);
      $('saip-qtde').addEventListener('keydown', addFromKeyboard);
      $('saip-vu').addEventListener('keydown', addFromKeyboard);

      $('saip-add-prod').addEventListener('click', async () => {
        try {
          const pid   = Number($('saip-prod-id').value || '');
          const label = ($('saip-prod').value || '').trim();
          const qtde  = Number($('saip-qtde').value || '0');
          const vu    = Number($('saip-vu').value || '0');
          if (!pid)          return toast('Selecione um produto (F8 ou lupa).', true);
          if (!(qtde > 0))   return toast('Informe uma quantidade válida.', true);
          if (!(vu   >= 0))  return toast('Informe um valor unitário válido.', true);

          await ensureSaida();
          const { chave: rowId } = await ipcRenderer.invoke('movs:saida:addProd', {
            chavesaida: saidaChave,
            chaveproduto: pid,
            qtde,
            valorunit: vu
          });

          itens.push({ id: pid, label, qtde, vu, vt: qtde * vu, rowId });
          $('saip-prod').value = '';
          $('saip-prod-id').value = '';
          $('saip-prod').focus();
          renderGrid();
        } catch (e) {
          toast('Erro ao adicionar: ' + e.message, true);
        }
      });

      $('form-saip').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await ensureSaida();
          const obs = ($('saip-obs').value || '').trim() || null;
          await ipcRenderer.invoke('movs:saida:finalizar', {
            chavesaida: saidaChave,
            chaveclifor: clienteId,
            obs
          });
          toast('Saída (produtos) salva!');
          resetAll();
        } catch (err) {
          toast('Erro ao salvar: ' + err.message, true);
        }
      });

      $('saip-reset').addEventListener('click', resetAll);

      // inicial
      renderGrid();
      $('saip-cli').focus();
    }
  };
};
