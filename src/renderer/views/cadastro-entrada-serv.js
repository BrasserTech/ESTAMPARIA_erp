// ===============================
// cadastro-entrada-serv.js
// ===============================
window.renderCadastroEntradaServ = function () {
  return {
    title: 'Entrada (Serviços)',
    html: `
      <style>
        .ens-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .ens-wrap{display:flex;flex-direction:column;gap:16px}
        .ens-main{display:grid;gap:16px;grid-template-columns:minmax(620px,1.2fr) minmax(420px,.8fr)}
        @media (max-width:1100px){ .ens-main{grid-template-columns:1fr} }

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

        .serv-row{display:grid;gap:10px;align-items:end;grid-template-columns:1fr auto 140px 160px auto;padding:10px;border:1px solid #e5eaf0;border-radius:12px;background:#fff}
        .serv-row .field{display:flex;flex-direction:column;gap:6px}
        .serv-row .field .label{font-size:12px;color:#64748b}
        .serv-row .btns{display:flex;gap:8px;align-items:center}
        @media (max-width:880px){ .serv-row{grid-template-columns:1fr 1fr} .serv-row .btns{grid-column:1 / -1} }

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

      <div class="ens-shell">
        <div class="ens-wrap">
          <form id="form-ens" autocomplete="off">
            <div class="ens-main">
              <!-- esquerda -->
              <div class="card">
                <div class="card-head">Dados gerais da entrada</div>
                <div class="card-body">
                  <div class="top-grid">
                    <div>
                      <label class="label">Fornecedor*</label>
                      <div class="row-forn">
                        <input class="input" id="ens-forn" placeholder="F8 para pesquisar" data-lookup="fornecedores" data-target-id="ens-forn-id" />
                        <button type="button" class="button outline" id="ens-forn-lupa" title="Pesquisar (F8)">🔎</button>
                      </div>
                      <input type="hidden" id="ens-forn-id"/>
                    </div>
                    <div>
                      <label class="label">Total (R$)</label>
                      <input class="input numeric" id="ens-total" type="number" step="0.01" min="0" value="0" disabled />
                    </div>
                    <div style="grid-column:1 / -1">
                      <label class="label">Observações</label>
                      <textarea class="textarea" id="ens-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
                    </div>
                  </div>

                  <div style="margin-top:10px">
                    <label class="label">Serviço</label>
                    <div class="serv-row">
                      <div class="field">
                        <input class="input" id="ens-serv" placeholder="F8 para pesquisar" data-lookup="servicos" data-target-id="ens-serv-id" />
                        <input type="hidden" id="ens-serv-id" />
                      </div>
                      <div class="btns"><button type="button" class="button outline" id="ens-serv-lupa" title="Pesquisar (F8)">🔎</button></div>
                      <div class="field"><label class="label">Quantidade</label><input class="input numeric" id="ens-qtde" type="number" step="0.001" min="0.001" value="1" /></div>
                      <div class="field"><label class="label">Valor unitário (R$)</label><input class="input numeric" id="ens-vu" type="number" step="0.01" min="0" value="0" /></div>
                      <div class="btns"><button type="button" class="button" id="ens-add-serv" title="Adicionar (Enter)">Adicionar</button></div>
                    </div>
                  </div>

                  <div class="divider"></div>
                  <div class="actions">
                    <button type="submit" class="button">Salvar Entrada</button>
                    <button type="reset" class="button outline" id="ens-reset">Limpar</button>
                  </div>
                </div>
              </div>

              <!-- direita -->
              <div class="items-card">
                <h4>Itens de Serviço</h4>
                <div class="tbl-wrap">
                  <table class="tbl-grid">
                    <thead>
                      <tr><th style="min-width:280px">Serviço</th><th class="txt-right" style="width:120px">Qtd</th><th class="txt-right" style="width:140px">Vlr Unit</th><th class="txt-right" style="width:140px">Total</th><th style="width:110px">Ação</th></tr>
                    </thead>
                    <tbody id="ens-itens"></tbody>
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
      let fornecedorId=null, entradaChave=null;
      const itens=[];

      const $=(id)=>document.getElementById(id);
      const f2=(n)=>Number(n||0).toFixed(2);
      const f3=(n)=>Number(n||0).toFixed(3);

      // === Robustez IPC: tenta aliases só quando não houver handler registrado ===
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
              try { return await ipcRenderer.invoke(alt, payload); } catch { /* tenta próximo alias */ }
            }
          }
          throw err; // propaga erros reais (ex.: banco)
        }
      }

      function recalc(){ $('ens-total').value=f2(itens.reduce((a,i)=>a+Number(i.vt||0),0)); }
      function render(){
        const body=$('ens-itens');
        if(!itens.length){ body.innerHTML='<tr><td class="empty-row" colspan="5">Itens adicionados serão exibidos nessa tabela</td></tr>'; return recalc(); }
        body.innerHTML=itens.map(it=>`
          <tr>
            <td>${it.label}</td><td class="txt-right">${f3(it.qtde)}</td><td class="txt-right">${f2(it.vu)}</td><td class="txt-right">${f2(it.vt)}</td>
            <td><button type="button" class="btn-ghost btn-rem" data-id="${it.rowId}">Remover</button></td>
          </tr>`).join('');
        body.querySelectorAll('.btn-rem').forEach(b=>b.onclick=async()=>{
          try{
            const rowId=Number(b.dataset.id);
            await safeInvoke('movs:entrada:remServ',
              { itementradaserv_chave: rowId },
              ['movsentrada:remServ','movs:entrada:removeServ']
            );
            const ix=itens.findIndex(x=>x.rowId===rowId); if(ix>=0) itens.splice(ix,1);
            render();
          }catch(e){ toast('Erro ao remover: '+e.message,true); }
        });
        recalc();
      }
      function reset(){
        $('form-ens').reset(); fornecedorId=null; entradaChave=null; itens.length=0;
        ['ens-forn','ens-forn-id','ens-serv','ens-serv-id'].forEach(i=>{$(i).value='';});
        $('ens-qtde').value='1'; $('ens-vu').value='0'; $('ens-total').value='0.00'; render(); $('ens-forn').focus();
      }
      async function ensure(){
        if(entradaChave) return entradaChave;
        if(!fornecedorId) throw new Error('Informe o fornecedor.');
        const {chave}=await safeInvoke(
          'movs:entrada:ensure',
          { chaveclifor:fornecedorId, ativo:1 },
          ['movsentrada:ensure','movs:entrada:createHeader']
        );
        entradaChave=chave; return chave;
      }

      // lookups
      $('ens-forn-lupa').onclick=()=>{
        if(typeof openLookup!=='function') return toast('Lookup não carregado.',true);
        openLookup('fornecedores',({id,label})=>{
          $('ens-forn-id').value=String(id); $('ens-forn').value=label; fornecedorId=id; $('ens-serv').focus();
        });
      };
      $('ens-serv-lupa').onclick=()=>{
        if(typeof openLookup!=='function') return toast('Lookup não carregado.',true);
        openLookup('servicos',({id,label})=>{
          $('ens-serv-id').value=String(id); $('ens-serv').value=label; $('ens-qtde').focus(); $('ens-qtde').select?.();
        });
      };
      $('ens-forn').addEventListener('change',()=>{ fornecedorId=Number($('ens-forn-id').value||'')||null; });

      const addKey=(ev)=>{ if(ev.key==='Enter'){ ev.preventDefault(); $('ens-add-serv').click(); } };
      ['ens-serv','ens-qtde','ens-vu'].forEach(id=>$(id).addEventListener('keydown',addKey));

      // Adicionar serviço (consumindo valorunit/valortotal retornados pelos triggers)
      $('ens-add-serv').onclick=async()=>{
        try{
          const sid=Number($('ens-serv-id').value||'');
          const label=($('ens-serv').value||'').trim();
          const qtde=Number($('ens-qtde').value||'0');
          const vu=Number($('ens-vu').value||'0');
          if(!sid) return toast('Selecione um serviço (F8 ou lupa).',true);
          if(!(qtde>0)) return toast('Informe uma quantidade válida.',true);
          if(!(vu>=0)) return toast('Informe um valor unitário válido.',true);

          await ensure();

          const res = await safeInvoke(
            'movs:entrada:addServ',
            { chaveentrada:entradaChave, chaveservico:sid, qtde, valorunit:vu },
            ['movsentrada:addServ','movs:entrada:addServico']
          );
          const rowId = res?.chave;
          const vuDb  = (res?.valorunit ?? vu);
          const vtDb  = (res?.valortotal ?? (qtde * vuDb));

          itens.push({id:sid,label,qtde,vu:vuDb,vt:vtDb,rowId});
          $('ens-serv').value=''; $('ens-serv-id').value=''; $('ens-serv').focus(); render(); toast('Item adicionado.');
        }catch(e){ toast('Erro ao adicionar: '+e.message,true); }
      };

      $('form-ens').onsubmit=async(e)=>{
        e.preventDefault();
        try{
          await ensure();
          const obs=($('ens-obs').value||'').trim()||null;
          await safeInvoke(
            'movs:entrada:finalizar',
            { chaveentrada:entradaChave, chaveclifor:fornecedorId, obs },
            ['movsentrada:finalizar','movs:entrada:close']
          );
          toast('Entrada (serviços) salva!'); reset();
        }catch(err){ toast('Erro ao salvar: '+err.message,true); }
      };
      $('ens-reset').onclick=reset;

      render(); $('ens-forn').focus();
    }
  };
};
