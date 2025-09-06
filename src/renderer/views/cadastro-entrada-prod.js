// ===============================
// cadastro-entrada-prod.js
// ===============================
window.renderCadastroEntradaProd = function () {
  return {
    title: 'Entrada (Produtos)',
    html: `
      <style>
        .enp-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .enp-wrap{display:flex;flex-direction:column;gap:16px}
        .enp-main{display:grid;gap:16px;grid-template-columns:minmax(620px,1.2fr) minmax(420px,.8fr)}
        @media (max-width:1100px){ .enp-main{grid-template-columns:1fr} }

        .card{border:1px solid #e5eaf0;border-radius:12px;background:#fbfdff;box-shadow:0 6px 18px rgba(15,23,42,.05);overflow:hidden}
        .card-head{padding:10px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .card-body{padding:14px}

        .label{font-weight:600;color:#0f172a}
        .input,.textarea,.button,.button.outline{width:100%}
        .input.numeric{text-align:right}
        .textarea{resize:vertical;min-height:92px}

        .top-grid{display:grid;gap:14px;align-items:end;grid-template-columns:minmax(520px,2fr) minmax(220px,.9fr)}
        @media (max-width:1100px){ .top-grid{grid-template-columns:1fr} }

        .row-forn{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}

        .prod-row{display:grid;gap:10px;align-items:end;grid-template-columns:1fr auto 140px 160px auto;padding:10px;border:1px solid #e5eaf0;border-radius:12px;background:#fff}
        .prod-row .field{display:flex;flex-direction:column;gap:6px}
        .prod-row .field .label{font-size:12px;color:#64748b}
        .prod-row .btns{display:flex;gap:8px;align-items:center}
        @media (max-width:880px){ .prod-row{grid-template-columns:1fr 1fr} .prod-row .btns{grid-column:1 / -1} }

        .divider{height:1px;background:#e5eaf0;margin:12px 0}

        .items-card{border:1px solid #e5eaf0;border-radius:12px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.06);overflow:hidden}
        .items-card h4{margin:0;padding:12px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .tbl-wrap{padding:6px 10px 12px 10px}
        .tbl-grid{width:100%;border-collapse:separate;border-spacing:0}
        .tbl-grid thead th{background:#f8fafc;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #e5eaf0;padding:12px 10px;position:sticky;top:0;z-index:1}
        .tbl-grid tbody td{border-bottom:1px solid #eef2f7;padding:12px 10px;color:#0f172a}
        .tbl-grid tbody tr:last-child td{border-bottom:none}
        .tbl-grid tbody tr:hover{background:#f9fbff}
        .txt-right{text-align:right}
        .empty-row{text-align:center;color:#64748b;background:#fff}
        .btn-ghost{background:#fff;border:1px solid #e5eaf0;color:#334155;padding:6px 10px;border-radius:8px;cursor:pointer}
        .btn-ghost:hover{background:#f8fafc}
        .actions{display:flex;gap:8px;align-items:center;justify-content:flex-start}
      </style>

      <div class="enp-shell">
        <div class="enp-wrap">
          <form id="form-enp" autocomplete="off">
            <div class="enp-main">
              <!-- COLUNA ESQUERDA: FORM -->
              <div class="card">
                <div class="card-head">Dados gerais da entrada</div>
                <div class="card-body">
                  <div class="top-grid">
                    <div>
                      <label class="label">Fornecedor*</label>
                      <div class="row-forn">
                        <input class="input" id="enp-forn" placeholder="F8 para pesquisar" data-lookup="fornecedores" data-target-id="enp-forn-id" />
                        <button type="button" class="button outline" id="enp-forn-lupa" title="Pesquisar (F8)">🔎</button>
                      </div>
                      <input type="hidden" id="enp-forn-id"/>
                    </div>
                    <div>
                      <label class="label">Total (R$)</label>
                      <input class="input numeric" id="enp-total" type="number" step="0.01" min="0" value="0" disabled />
                    </div>
                    <div style="grid-column:1 / -1">
                      <label class="label">Observações</label>
                      <textarea class="textarea" id="enp-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
                    </div>
                  </div>

                  <div style="margin-top:10px">
                    <label class="label">Produto</label>
                    <div class="prod-row">
                      <div class="field">
                        <input class="input" id="enp-prod" placeholder="F8 para pesquisar" data-lookup="produtos" data-target-id="enp-prod-id" />
                        <input type="hidden" id="enp-prod-id" />
                      </div>
                      <div class="btns"><button type="button" class="button outline" id="enp-prod-lupa" title="Pesquisar (F8)">🔎</button></div>
                      <div class="field"><label class="label">Quantidade</label><input class="input numeric" id="enp-qtde" type="number" step="0.001" min="0.001" value="1" /></div>
                      <div class="field"><label class="label">Valor unitário (R$)</label><input class="input numeric" id="enp-vu" type="number" step="0.01" min="0" value="0" /></div>
                      <div class="btns"><button type="button" class="button" id="enp-add-prod" title="Adicionar (Enter)">Adicionar</button></div>
                    </div>
                  </div>

                  <div class="divider"></div>
                  <div class="actions">
                    <button type="submit" class="button" id="enp-submit">Salvar Entrada</button>
                    <button type="reset" class="button outline" id="enp-reset">Limpar</button>
                  </div>
                </div>
              </div>

              <!-- COLUNA DIREITA: ITENS -->
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
                    <tbody id="enp-itens"></tbody>
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

      // ---------- Seletores / utilidades ----------
      const $ = (id) => document.getElementById(id);
      const f2 = (n) => Number(n || 0).toFixed(2);
      const f3 = (n) => Number(n || 0).toFixed(3);

      // ===== Toast robusto (fallback) =====
      function safeToast(message, isError = false) {
        try { if (typeof window.toast === 'function') return window.toast(message, isError); } catch (_) {}
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

      // *** INVOKE com aliases somente se for "No handler registered" ***
      async function safeInvoke(channel, payload, aliases = []) {
        try {
          return await ipcRenderer.invoke(channel, payload);
        } catch (err) {
          const msg = String(err?.message || err);
          const isNoHandler =
            msg.includes('No handler registered') ||
            msg.includes('has no listeners') ||
            msg.includes('not a function');
          if (isNoHandler && Array.isArray(aliases) && aliases.length) {
            for (const alt of aliases) {
              try { return await ipcRenderer.invoke(alt, payload); } catch {}
            }
          }
          throw err; // erro real (ex.: constraints / banco)
        }
      }

      // ---------- Estado ----------
      let fornecedorId = null;
      let entradaChave = null;
      const itens = []; // { id, label, qtde, vu, vt, rowId }

      // ---------- UI helpers ----------
      function recalc() {
        $('enp-total').value = f2(itens.reduce((a,i)=>a + Number(i.vt || 0), 0));
      }
      function render() {
        const body = $('enp-itens');
        if (!itens.length) {
          body.innerHTML = '<tr><td class="empty-row" colspan="5">Itens adicionados serão exibidos nessa tabela</td></tr>';
          return recalc();
        }
        body.innerHTML = itens.map(it => `
          <tr>
            <td>${it.label}</td>
            <td class="txt-right">${f3(it.qtde)}</td>
            <td class="txt-right">${f2(it.vu)}</td>
            <td class="txt-right">${f2(it.vt)}</td>
            <td><button type="button" class="btn-ghost btn-rem" data-id="${it.rowId}">Remover</button></td>
          </tr>
        `).join('');

        body.querySelectorAll('.btn-rem').forEach(btn => {
          btn.addEventListener('click', async () => {
            try {
              const rowId = Number(btn.dataset.id);
              await safeInvoke(
                'movs:entrada:remProd',
                { itementradaprod_chave: rowId },
                ['movsentrada:remProd', 'movs:entrada:removeProd']
              );
              const ix = itens.findIndex(x => x.rowId === rowId);
              if (ix >= 0) itens.splice(ix, 1);
              render();
              safeToast('Item removido.');
            } catch (e) {
              safeToast('Erro ao remover: ' + (e?.message || e), true);
            }
          });
        });

        recalc();
      }
      function reset() {
        $('form-enp').reset();
        fornecedorId = null;
        entradaChave = null;
        itens.length = 0;
        ['enp-forn','enp-forn-id','enp-prod','enp-prod-id'].forEach(i => { $(i).value = ''; });
        $('enp-qtde').value = '1';
        $('enp-vu').value   = '0';
        $('enp-total').value = '0.00';
        render();
        $('enp-forn').focus();
      }

      async function ensure() {
        if (entradaChave) return entradaChave;
        if (!fornecedorId) throw new Error('Informe o fornecedor.');
        const { chave } = await safeInvoke(
          'movs:entrada:ensure',
          { chaveclifor: fornecedorId, ativo: 1 },
          ['movsentrada:ensure', 'movs:entrada:createHeader']
        );
        entradaChave = chave;
        return chave;
      }

      // ---------- Resolução robusta da CHAVE do produto ----------
      // 1) tenta id oculto; 2) se não for confiável, extrai "codigo" do texto e consulta lookup; 3) devolve a CHAVE
      async function resolveProdutoChave({ hiddenId, inputText }) {
        const idNum = Number(hiddenId || '');
        if (Number.isFinite(idNum) && idNum > 0) return idNum; // assume que já é chave

        // tenta extrair "CODIGO - NOME"
        const codeTry = Number(String(inputText || '').split('-')[0].trim());
        if (Number.isFinite(codeTry) && codeTry > 0) {
          try {
            const rows = await ipcRenderer.invoke('movs:lookupProdutos', { search: String(codeTry), limit: 20 });
            // prioriza match exato de código; se não houver, tenta quando "chave" = codeTry
            const row = Array.isArray(rows)
              ? (rows.find(r => Number(r.codigo) === codeTry) || rows.find(r => Number(r.chave) === codeTry))
              : null;
            if (row && Number(row.chave) > 0) return Number(row.chave);
          } catch (_) { /* ignora e deixa cair no erro */ }
        }
        return null;
      }

      // ---------- Lookups ----------
      function openFornecedoresLookup() {
        if (typeof window.openLookup !== 'function') {
          safeToast('Lookup não carregado.', true);
          return;
        }
        window.openLookup('fornecedores', ({ id, label }) => {
          $('enp-forn-id').value = String(id);
          $('enp-forn').value   = label;
          fornecedorId = id;
          $('enp-prod').focus();
        });
      }
      function openProdutosLookup() {
        if (typeof window.openLookup !== 'function') {
          safeToast('Lookup não carregado.', true);
          return;
        }
        window.openLookup('produtos', ({ id, label }) => {
          $('enp-prod-id').value = String(id);
          $('enp-prod').value   = label;
          $('enp-qtde').focus();
          $('enp-qtde').select?.();
        });
      }

      $('enp-forn-lupa').onclick = openFornecedoresLookup;
      $('enp-prod-lupa').onclick = openProdutosLookup;

      // F8: abre fornecedores se foco está no fornecedor; caso contrário, produtos
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F8') {
          e.preventDefault();
          const ae = document.activeElement;
          if (ae && (ae.id === 'enp-forn' || ae.id === 'enp-forn-id')) openFornecedoresLookup();
          else openProdutosLookup();
        }
      });

      $('enp-forn').addEventListener('change', () => {
        fornecedorId = Number($('enp-forn-id').value || '') || null;
      });

      // Enter = adicionar
      const addKey = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('enp-add-prod').click(); } };
      ['enp-prod','enp-qtde','enp-vu'].forEach(id => $(id).addEventListener('keydown', addKey));

      // ---------- Botões com estado ----------
      const btnAdd = $('enp-add-prod');
      const btnAddDefault = btnAdd.textContent;
      const btnSubmit = $('enp-submit');
      const btnSubmitDefault = btnSubmit.textContent;

      function setBusy(button, busy, labelBusy) {
        if (!button) return;
        button.disabled = busy;
        if (busy) {
          button.dataset._default = button.dataset._default || button.textContent;
          button.textContent = labelBusy || 'Processando…';
          button.classList.add('is-loading');
        } else {
          button.textContent = button.dataset._default || button.textContent || '';
          if (!button.textContent) button.textContent = btnAdd === button ? btnAddDefault : btnSubmitDefault;
          button.classList.remove('is-loading');
        }
      }

      // ---------- Adicionar Item ----------
      $('enp-add-prod').onclick = async () => {
        if (btnAdd.disabled) return;
        try {
          const rawHidden = $('enp-prod-id').value || '';
          const label     = ($('enp-prod').value || '').trim();
          let qtde        = Number(($('enp-qtde').value || '0').replace(',', '.'));
          let vu          = Number(($('enp-vu').value   || '0').replace(',', '.'));

          if (!fornecedorId) return safeToast('Informe o fornecedor antes de adicionar itens.', true);
          if (!Number.isFinite(qtde) || !(qtde > 0)) return safeToast('Informe uma quantidade válida.', true);
          if (!Number.isFinite(vu)   || vu < 0)      return safeToast('Informe um valor unitário válido.', true);

          // resolve CHAVE de produto
          let pid = await resolveProdutoChave({ hiddenId: rawHidden, inputText: label });
          if (!pid) return safeToast('Selecione um produto válido (use a lupa ou F8).', true);

          setBusy(btnAdd, true, 'Adicionando…');
          await ensure();

          async function addWith(pidToUse) {
            return await safeInvoke(
              'movs:entrada:addProd',
              { chaveentrada: entradaChave, chaveproduto: pidToUse, qtde, valorunit: vu },
              ['movsentrada:addProd', 'movs:entrada:addProduto']
            );
          }

          let res;
          try {
            res = await addWith(pid);
          } catch (e) {
            // Se for FK de produto, tenta resolver por código do texto e reenvia UMA vez
            const isFkProduto = String(e?.code) === '23503' &&
              String(e?.message || e).includes('itementradaprod_chaveproduto_fkey');

            if (isFkProduto) {
              const pidResolved = await resolveProdutoChave({ hiddenId: null, inputText: label });
              if (pidResolved && pidResolved !== pid) {
                pid = pidResolved; // atualiza e tenta de novo
                res = await addWith(pid);
              } else {
                throw e;
              }
            } else {
              throw e;
            }
          }

          const rowId = res?.chave;
          const vuDb  = (res?.valorunit ?? vu);
          const vtDb  = (res?.valortotal ?? (qtde * vuDb));

          itens.push({ id: pid, label, qtde, vu: vuDb, vt: vtDb, rowId });

          // limpa campos do produto e mantém fluxo para novo item
          $('enp-prod').value = '';
          $('enp-prod-id').value = '';
          $('enp-qtde').value = '1';
          $('enp-vu').value   = '0';
          $('enp-prod').focus();

          render();
          safeToast('Item adicionado.');
        } catch (e) {
          safeToast('Erro ao adicionar: ' + (e?.message || e), true);
        } finally {
          setBusy(btnAdd, false);
        }
      };

      // ---------- Salvar (finalizar) ----------
      $('form-enp').onsubmit = async (e) => {
        e.preventDefault();
        if (btnSubmit.disabled) return;
        try {
          if (!fornecedorId) return safeToast('Informe o fornecedor.', true);
          if (!itens.length)  return safeToast('Adicione ao menos um item.', true);

          setBusy(btnSubmit, true, 'Salvando…');

          await ensure();
          const obs = ($('enp-obs').value || '').trim() || null;

          await safeInvoke(
            'movs:entrada:finalizar',
            { chaveentrada: entradaChave, chaveclifor: fornecedorId, obs },
            ['movsentrada:finalizar', 'movs:entrada:close']
          );

          safeToast('Entrada (produtos) salva!');
          reset();
        } catch (err) {
          safeToast('Erro ao salvar: ' + (err?.message || err), true);
        } finally {
          setBusy(btnSubmit, false);
        }
      };

      // ---------- Reset ----------
      $('enp-reset').onclick = (e) => {
        e.preventDefault();
        reset();
        safeToast('Formulário limpo.');
      };

      // Inicial
      render();
      $('enp-forn').focus();
    }
  };
};
