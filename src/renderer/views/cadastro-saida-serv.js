// ===============================
// cadastro-saida-serv.js
// ===============================
window.renderCadastroSaidaServ = function () {
  return {
    title: 'Saída (Serviços)',
    html: `
      <style>
        .sos-shell{border:1px solid #e5eaf0;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06);padding:14px}
        .sos-wrap{display:flex;flex-direction:column;gap:16px}
        .sos-main{display:grid;gap:16px;grid-template-columns:minmax(620px,1.2fr) minmax(420px,.8fr)}
        @media (max-width:1100px){ .sos-main{grid-template-columns:1fr} }

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

        .srv-row{
          display:grid;gap:10px;align-items:end;
          grid-template-columns:1fr auto 140px 160px auto;
          padding:10px;border:1px solid #e5eaf0;border-radius:12px;background:#fff
        }
        .srv-row .field{display:flex;flex-direction:column;gap:6px}
        .srv-row .field .label{font-size:12px;color:#64748b}
        .srv-row .btns{display:flex;gap:8px;align-items:center}
        @media (max-width:880px){ .srv-row{grid-template-columns:1fr 1fr} .srv-row .btns{grid-column:1 / -1} }

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

      <div class="sos-shell">
        <div class="sos-wrap">
          <form id="form-sos" autocomplete="off">
            <div class="sos-main">
              <div class="card">
                <div class="card-head">Dados gerais da saída</div>
                <div class="card-body">
                  <div class="top-grid">
                    <div>
                      <label class="label">Cliente*</label>
                      <div class="row-cli">
                        <input class="input" id="sos-cli" placeholder="F8 para pesquisar" data-lookup="clientes" data-target-id="sos-cli-id" />
                        <button type="button" class="button outline" id="sos-cli-lupa" title="Pesquisar (F8)">🔎</button>
                      </div>
                      <input type="hidden" id="sos-cli-id"/>
                    </div>
                    <div>
                      <label class="label">Total (R$)</label>
                      <input class="input numeric" id="sos-total" type="number" step="0.01" min="0" value="0" disabled />
                    </div>
                    <div style="grid-column:1 / -1">
                      <label class="label">Observações</label>
                      <textarea class="textarea" id="sos-obs" rows="3" maxlength="300" placeholder="Detalhes..."></textarea>
                    </div>
                  </div>

                  <div style="margin-top:10px">
                    <label class="label">Serviço</label>
                    <div class="srv-row">
                      <div class="field">
                        <input class="input" id="sos-serv" placeholder="F8 para pesquisar" data-lookup="servicos" data-target-id="sos-serv-id" />
                        <input type="hidden" id="sos-serv-id"/>
                      </div>
                      <div class="btns"><button type="button" class="button outline" id="sos-serv-lupa" title="Pesquisar (F8)">🔎</button></div>
                      <div class="field"><label class="label">Quantidade</label><input class="input numeric" id="sos-qtde" type="number" step="0.001" min="0.001" value="1" /></div>
                      <div class="field"><label class="label">Valor unitário (R$)</label><input class="input numeric" id="sos-vu" type="number" step="0.01" min="0" value="0" /></div>
                      <div class="btns"><button type="button" class="button" id="sos-add-serv" title="Adicionar (Enter)">Adicionar</button></div>
                    </div>
                  </div>

                  <div class="divider"></div>
                  <div class="actions">
                    <button type="submit" class="button" id="sos-salvar">Salvar Saída</button>
                    <button type="reset" class="button outline" id="sos-reset">Limpar</button>
                  </div>
                </div>
              </div>

              <div class="items-card">
                <h4>Itens de Serviço</h4>
                <div class="tbl-wrap">
                  <table class="tbl-grid">
                    <thead>
                      <tr>
                        <th style="min-width:280px">Serviço</th>
                        <th class="txt-right" style="width:120px">Qtd</th>
                        <th class="txt-right" style="width:140px">Vlr Unit</th>
                        <th class="txt-right" style="width:140px">Total</th>
                        <th style="width:110px">Ação</th>
                      </tr>
                    </thead>
                    <tbody id="sos-itens"></tbody>
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

      // Estados de UI
      let isSaving = false;
      let isAdding = false;
      const btnSalvar = $('sos-salvar');
      const btnAdd    = $('sos-add-serv');

      function setSaving(state){
        isSaving = state;
        btnSalvar.disabled = state;
        btnSalvar.textContent = state ? 'Salvando…' : 'Salvar Saída';
      }
      function setAdding(state){
        isAdding = state;
        btnAdd.disabled = state;
        btnAdd.textContent = state ? 'Adicionando…' : 'Adicionar';
      }

      // Canais (mantidos + aliases)
      const ENSURE_ALIASES = ['movssaida:ensure','movs:saida:createHeader','movs:saidaensure','movssaida:ensure','saidas:ensure','movs:ensure:saida'];
      const ADD_ALIASES    = ['movssaida:addServ','movs:saida:addServico','movs:saida:addserv','saidas:addServ'];
      const REM_ALIASES    = ['movssaida:remServ','movs:saida:removeServ','movs:saida:remServico','saidas:remServ'];
      const FINAL_ALIASES  = ['movssaida:finalizar','movs:saida:close','saidas:finalizar'];

      async function safeInvoke(channel, payload, aliases=[]) {
        try { return await ipcRenderer.invoke(channel, payload); }
        catch (err) {
          // tenta aliases apenas se falhar
          for (const alt of aliases) { try { return await ipcRenderer.invoke(alt, payload); } catch {} }
          throw err;
        }
      }

      let clienteId=null, saidaChave=null;
      const itens=[];

      function recalc(){ $('sos-total').value = f2(itens.reduce((a,i)=>a+Number(i.vt||0),0)); }
      function render(){
        const body=$('sos-itens');
        if(!itens.length){
          body.innerHTML='<tr><td class="empty-row" colspan="5">Itens adicionados serão exibidos nessa tabela</td></tr>';
          return recalc();
        }
        body.innerHTML=itens.map(it=>`
          <tr>
            <td>${it.label}</td>
            <td class="txt-right">${f3(it.qtde)}</td>
            <td class="txt-right">${f2(it.vu)}</td>
            <td class="txt-right">${f2(it.vt)}</td>
            <td><button type="button" class="btn-ghost btn-rem" data-id="${it.rowId}">Remover</button></td>
          </tr>`).join('');
        body.querySelectorAll('.btn-rem').forEach(b=>b.onclick=async()=>{
          try{
            const rowId=Number(b.dataset.id);
            await safeInvoke('movs:saida:remServ',{ itemsaidaserv_chave: rowId }, REM_ALIASES);
            const ix=itens.findIndex(x=>x.rowId===rowId); if(ix>=0) itens.splice(ix,1);
            render();
          }catch(e){ toast('Erro ao remover: '+(e?.message||String(e)),true); }
        });
        recalc();
      }
      function reset(){
        $('form-sos').reset(); clienteId=null; saidaChave=null; itens.length=0;
        ['sos-cli','sos-cli-id','sos-serv','sos-serv-id'].forEach(i=>$(i).value='');
        $('sos-qtde').value='1'; $('sos-vu').value='0'; $('sos-total').value='0.00';
        render(); $('sos-cli').focus();
      }
      async function ensure(){
        if(saidaChave) return saidaChave;
        if(!clienteId) throw new Error('Informe o cliente.');
        const {chave}=await safeInvoke('movs:saida:ensure',{ chaveclifor:clienteId, ativo:1 }, ENSURE_ALIASES);
        saidaChave=chave; return chave;
      }

      // Lookups
      $('sos-cli-lupa').onclick=()=>{
        if(typeof openLookup!=='function') return toast('Lookup não carregado.',true);
        openLookup('clientes',({id,label})=>{
          $('sos-cli-id').value=String(id); $('sos-cli').value=label; clienteId=id; $('sos-serv').focus();
        });
      };
      $('sos-serv-lupa').onclick=()=>{
        if(typeof openLookup!=='function') return toast('Lookup não carregado.',true);
        openLookup('servicos',({id,label})=>{
          $('sos-serv-id').value=String(id); $('sos-serv').value=label; $('sos-qtde').focus(); $('sos-qtde').select?.();
        });
      };
      $('sos-cli').addEventListener('change',()=>{ clienteId=Number($('sos-cli-id').value||'')||null; });

      // Atalho F8 abre lookup do campo focado
      window.addEventListener('keydown',(ev)=>{
        if(ev.key==='F8'){
          const el=document.activeElement;
          if(el && el.id==='sos-cli'){ ev.preventDefault(); $('sos-cli-lupa').click(); }
          else if(el && el.id==='sos-serv'){ ev.preventDefault(); $('sos-serv-lupa').click(); }
        }
      });

      const addKey=(ev)=>{ if(ev.key==='Enter'){ ev.preventDefault(); $('sos-add-serv').click(); } };
      ['sos-serv','sos-qtde','sos-vu'].forEach(id=>$(id).addEventListener('keydown',addKey));

      // Adicionar serviço
      $('sos-add-serv').onclick=async()=>{
        if(isAdding) return;
        try{
          const sid = Number($('sos-serv-id').value||'');
          const label = ($('sos-serv').value||'').trim();
          const qtde = Number($('sos-qtde').value||'0');
          const vu   = Number($('sos-vu').value||'0');
          if(!sid) return toast('Selecione um serviço (F8 ou lupa).',true);
          if(!(qtde>0)) return toast('Informe uma quantidade válida.',true);
          if(!(vu>=0))  return toast('Informe um valor unitário válido.',true);

          await ensure();
          setAdding(true);

          const res = await safeInvoke('movs:saida:addServ',
            { chavesaida:saidaChave, chaveservico:sid, qtde, valorunit:vu },
            ADD_ALIASES
          );
          const rowId = res?.chave;
          const vuDb  = (res?.valorunit ?? vu);
          const vtDb  = (res?.valortotal ?? (qtde * vuDb));

          itens.push({id:sid,label,qtde,vu:vuDb,vt:vtDb,rowId});
          $('sos-serv').value=''; $('sos-serv-id').value=''; $('sos-serv').focus();
          render();
          toast('Item adicionado.');
        }catch(e){
          toast('Erro ao adicionar: '+(e?.message||String(e)),true);
        }finally{
          setAdding(false);
        }
      };

      // Salvar / Finalizar
      $('form-sos').onsubmit=async(e)=>{
        e.preventDefault();
        if(isSaving) return;
        try{
          await ensure();
          const obs = ($('sos-obs').value||'').trim()||null;

          setSaving(true);
          await safeInvoke('movs:saida:finalizar',
            { chavesaida:saidaChave, chaveclifor:clienteId, obs },
            FINAL_ALIASES
          );
          toast('Saída (serviços) salva!');
          reset();
        }catch(err){
          toast('Erro ao salvar: '+(err?.message||String(err)),true);
        }finally{
          setSaving(false);
        }
      };

      // Limpar
      $('sos-reset').onclick=(e)=>{ e.preventDefault(); reset(); toast('Formulário limpo.'); };

      // Inicial
      render(); $('sos-cli').focus();
    }
  };
};
