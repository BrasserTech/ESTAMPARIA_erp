// ===============================
// cadastro-saida-prod.js
// ===============================
window.renderCadastroSaidaProd = function () {
  return {
    title: 'Saída (Produtos)',
    html: `
      <style>
        .sop-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .sop-wrap{display:flex;flex-direction:column;gap:16px}
        .sop-main{display:grid;gap:16px;grid-template-columns:minmax(620px,1.2fr) minmax(420px,.8fr)}
        @media (max-width:1100px){ .sop-main{grid-template-columns:1fr} }

        .card{border:1px solid #e5eaf0;border-radius:12px;background:#fbfdff;box-shadow:0 6px 18px rgba(15,23,42,.05);overflow:hidden}
        .card-head{padding:10px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .card-body{padding:14px}

        .label{font-weight:600;color:#0f172a}
        .input,.textarea,.button,.button.outline{width:100%}
        .input.numeric{text-align:right}
        .textarea{resize:vertical;min-height:92px}

        .top-grid{
          display:grid;gap:14px;align-items:end;
          grid-template-columns:minmax(520px,2fr) minmax(220px,.9fr)
        }
        @media (max-width:1100px){ .top-grid{grid-template-columns:1fr} }
        .row-cli{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:end}

        .prod-row{
          display:grid;gap:10px;align-items:end;
          grid-template-columns:1fr auto 140px 160px auto;
          padding:10px;border:1px solid #e5eaf0;border-radius:12px;background:#fff
        }
        .prod-row .field{display:flex;flex-direction:column;gap:6px}
        .prod-row .field .label{font-size:12px;color:#64748b}
        .prod-row .btns{display:flex;gap:8px;align-items:center}
        @media (max-width:880px){ .prod-row{grid-template-columns:1fr 1fr} .prod-row .btns{grid-column:1 / -1} }

        .divider{height:1px;background:#e5eaf0;margin:12px 0}

        .items-card{border:1px solid #e5eaf0;border-radius:12px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.06);overflow:hidden}
        .items-card h4{margin:0;padding:12px 14px;border-bottom:1px solid #e5eaf0;font-size:15px;color:#0f172a}
        .tbl-wrap{padding:6px 10px 12px 10px}
        .tbl-grid{width:100%;border-collapse:separate;border-spacing:0}
        .tbl-grid thead th{
          background:#f8fafc;color:#0f172a;font-weight:600;font-size:13px;
          border-bottom:1px solid #e5eaf0;padding:12px 10px;position:sticky;top:0;z-index:1
        }
        .tbl-grid tbody td{border-bottom:1px solid #eef2f7;padding:12px 10px;color:#0f172a}
        .tbl-grid tbody tr:last-child td{border-bottom:none}
        .tbl-grid tbody tr:hover{background:#f9fbff}
        .txt-right{text-align:right}
        .empty-row{text-align:center;color:#64748b;background:#fff}
        .btn-ghost{background:#fff;border:1px solid #e5eaf0;color:#334155;padding:6px 10px;border-radius:8px;cursor:pointer}
        .btn-ghost:hover{background:#f8fafc}

        .actions{display:flex;gap:8px;align-items:center;justify-content:flex-start}
      </style>

      <div class="sop-shell">
        <div class="sop-wrap">
          <form id="form-sop" autocomplete="off">
            <div class="sop-main">
              <div class="card">
                <div class="card-head">Dados gerais da saída</div>
                <div class="card-body">
                  <div class="top-grid">
                    <div>
                      <label class="label">Cliente*</label>
                      <div class="row-cli">
                        <input class="input" id="sop-cli" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="sop-cli-id" />
                        <button type="button" class="button outline" id="sop-cli-lupa" title="Pesquisar (F8)">🔎</button>
                      </div>
                      <input type="hidden" id="sop-cli-id"/>
                    </div>
                    <div>
                      <label class="label">Total (R$)</label>
                      <input class="input numeric" id="sop-total" type="number" step="0.01" min="0" value="0" disabled />
                    </div>
                    <div style="grid-column:1 / -1">
                      <label class="label">Observações</label>
                      <textarea class="textarea" id="sop-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
                    </div>
                  </div>

                  <div style="margin-top:10px">
                    <label class="label">Produto</label>
                    <div class="prod-row">
                      <div class="field">
                        <input class="input" id="sop-prod" placeholder="F8 para pesquisar" data-lookup="produtos" data-target-id="sop-prod-id" />
                        <input type="hidden" id="sop-prod-id"/>
                      </div>
                      <div class="btns"><button type="button" class="button outline" id="sop-prod-lupa" title="Pesquisar (F8)">🔎</button></div>
                      <div class="field"><label class="label">Quantidade</label><input class="input numeric" id="sop-qtde" type="number" step="0.001" min="0.001" value="1" /></div>
                      <div class="field"><label class="label">Valor unitário (R$)</label><input class="input numeric" id="sop-vu" type="number" step="0.01" min="0" value="0" /></div>
                      <div class="btns"><button type="button" class="button" id="sop-add-prod" title="Adicionar (Enter)">Adicionar</button></div>
                    </div>
                  </div>

                  <div class="divider"></div>
                  <div class="actions">
                    <button type="submit" class="button">Salvar Saída</button>
                    <button type="reset" class="button outline" id="sop-reset">Limpar</button>
                  </div>
                </div>
              </div>

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
                    <tbody id="sop-itens"></tbody>
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
      const $  = (id) => document.getElementById(id);
      const f2 = (n) => Number(n||0).toFixed(2);
      const f3 = (n) => Number(n||0).toFixed(3);

      // Lista grande de aliases para funcionar em qualquer nomenclatura do IPC
      const ENSURE_ALIASES     = ['movssaida:ensure','movs:saida:createHeader','movs:saidaensure','movssaida:ensure','saidas:ensure','movs:ensure:saida'];
      const ADD_ALIASES        = ['movssaida:addProd','movs:saida:addProduto','movs:saida:addprod','saidas:addProd'];
      const REM_ALIASES        = ['movssaida:remProd','movs:saida:removeProd','movs:saida:remProduto','saidas:remProd'];
      const FINALIZAR_ALIASES  = ['movssaida:finalizar','movs:saida:close','saidas:finalizar'];

      async function safeInvoke(channel, payload, aliases=[]) {
        try { return await ipcRenderer.invoke(channel, payload); }
        catch (err) {
          for (const alt of aliases) {
            try { return await ipcRenderer.invoke(alt, payload); } catch {}
          }
          throw err;
        }
      }

      let clienteId=null, saidaChave=null;
      const itens=[];

      function recalc(){ $('sop-total').value = f2(itens.reduce((a,i)=>a + Number(i.vt||0), 0)); }
      function render(){
        const body = $('sop-itens');
        if (!itens.length){
          body.innerHTML = '<tr><td class="empty-row" colspan="5">Itens adicionados serão exibidos nessa tabela</td></tr>';
          return recalc();
        }
        body.innerHTML = itens.map(it=>`
          <tr>
            <td>${it.label}</td>
            <td class="txt-right">${f3(it.qtde)}</td>
            <td class="txt-right">${f2(it.vu)}</td>
            <td class="txt-right">${f2(it.vt)}</td>
            <td><button type="button" class="btn-ghost btn-rem" data-id="${it.rowId}">Remover</button></td>
          </tr>`).join('');
        body.querySelectorAll('.btn-rem').forEach(b=>b.onclick=async()=>{
          try{
            const rowId = Number(b.dataset.id);
            await safeInvoke('movs:saida:remProd',{ itemsaidaprod_chave: rowId }, REM_ALIASES);
            const ix = itens.findIndex(x=>x.rowId===rowId); if(ix>=0) itens.splice(ix,1);
            render();
          }catch(e){ toast('Erro ao remover: '+e.message, true); }
        });
        recalc();
      }

      function reset(){
        $('form-sop').reset(); clienteId=null; saidaChave=null; itens.length=0;
        ['sop-cli','sop-cli-id','sop-prod','sop-prod-id'].forEach(i=>$(i).value='');
        $('sop-qtde').value='1'; $('sop-vu').value='0'; $('sop-total').value='0.00';
        render(); $('sop-cli').focus();
      }

      async function ensure(){
        if (saidaChave) return saidaChave;
        if (!clienteId) throw new Error('Informe o cliente.');
        const { chave } = await safeInvoke('movs:saida:ensure', { chaveclifor: clienteId, ativo: 1 }, ENSURE_ALIASES);
        saidaChave = chave; return chave;
      }

      // lookups
      $('sop-cli-lupa').onclick=()=>{
        if (typeof openLookup!=='function') return toast('Lookup não carregado.', true);
        openLookup('clientes',({id,label})=>{
          $('sop-cli-id').value=String(id); $('sop-cli').value=label; clienteId=id; $('sop-prod').focus();
        });
      };
      $('sop-prod-lupa').onclick=()=>{
        if (typeof openLookup!=='function') return toast('Lookup não carregado.', true);
        openLookup('produtos',({id,label})=>{
          $('sop-prod-id').value=String(id); $('sop-prod').value=label; $('sop-qtde').focus(); $('sop-qtde').select?.();
        });
      };
      $('sop-cli').addEventListener('change',()=>{ clienteId = Number($('sop-cli-id').value || '') || null; });

      const addKey=(ev)=>{ if(ev.key==='Enter'){ ev.preventDefault(); $('sop-add-prod').click(); } };
      ['sop-prod','sop-qtde','sop-vu'].forEach(id=>$(id).addEventListener('keydown',addKey));

      $('sop-add-prod').onclick=async()=>{
        try{
          const pid  = Number($('sop-prod-id').value||'');
          const label= ($('sop-prod').value||'').trim();
          const qtde = Number($('sop-qtde').value||'0');
          const vu   = Number($('sop-vu').value||'0');
          if(!pid)        return toast('Selecione um produto (F8 ou lupa).',true);
          if(!(qtde>0))   return toast('Informe uma quantidade válida.',true);
          if(!(vu>=0))    return toast('Informe um valor unitário válido.',true);

          await ensure();

          const res = await safeInvoke('movs:saida:addProd',
            { chavesaida: saidaChave, chaveproduto: pid, qtde, valorunit: vu },
            ADD_ALIASES
          );
          const rowId = res?.chave;
          const vuDb  = (res?.valorunit ?? vu);
          const vtDb  = (res?.valortotal ?? (qtde * vuDb));

          itens.push({ id: pid, label, qtde, vu: vuDb, vt: vtDb, rowId });
          $('sop-prod').value=''; $('sop-prod-id').value=''; $('sop-prod').focus();
          render();
        }catch(e){ toast('Erro ao adicionar: '+e.message, true); }
      };

      $('form-sop').onsubmit=async(e)=>{
        e.preventDefault();
        try{
          await ensure();
          const obs = ($('sop-obs').value||'').trim() || null;
          await safeInvoke('movs:saida:finalizar',
            { chavesaida: saidaChave, chaveclifor: clienteId, obs },
            FINALIZAR_ALIASES
          );
          toast('Saída (produtos) salva!');
          reset();
        }catch(err){ toast('Erro ao salvar: '+err.message, true); }
      };

      $('sop-reset').onclick=reset;

      render(); $('sop-cli').focus();
    }
  };
};
