// src/renderer/views/cadastro-servicos.js
window.renderCadastroServicos = function(){
  return {
    title: 'Cadastro de Serviços',
    html: `
      <div class="card">
        <form class="form" id="form-serv">
          <div>
            <label class="label">Código*</label>
            <input class="input" id="s-cod" required placeholder="EST-001" />
          </div>
          <div>
            <label class="label">Tipo</label>
            <input class="input" id="s-tipo" placeholder="Silk, Sublimação, DTF..." />
          </div>
          <div class="full">
            <label class="label">Descrição*</label>
            <textarea class="textarea" id="s-desc" rows="3" required placeholder="Ex.: Estampa 1 cor"></textarea>
          </div>
          <div>
            <label class="label">Valor (R$)*</label>
            <input class="input" id="s-valor" type="number" step="0.01" value="0" required />
          </div>
          <div>
            <label class="label">Quantidade padrão</label>
            <input class="input" id="s-qtde" type="number" step="1" value="1" />
          </div>
          <div>
            <label class="label">Prazo (dias)</label>
            <input class="input" id="s-prazo" type="number" step="1" />
          </div>
          <div class="full actions" style="margin-top:6px">
            <button type="submit" class="button">Salvar</button>
            <button type="reset" class="button outline">Limpar</button>
          </div>
        </form>
      </div>
    `,
    afterRender(){
      const { ipcRenderer } = require('electron');
      const form = document.getElementById('form-serv');

      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        try{
          const payload = {
            codigo: document.getElementById('s-cod').value.trim(),
            tipo: document.getElementById('s-tipo').value || null,
            descricao: document.getElementById('s-desc').value.trim(),
            valor: parseFloat(document.getElementById('s-valor').value || '0'),
            quantidade_padrao: parseInt(document.getElementById('s-qtde').value || '1',10),
            prazo_dias: document.getElementById('s-prazo').value ? parseInt(document.getElementById('s-prazo').value,10) : null
          };
          if(!payload.codigo || !payload.descricao){ return toast('Preencha Código e Descrição', true); }
          await ipcRenderer.invoke('servicos:criar', payload);
          toast('Serviço salvo!');
          form.reset();
        }catch(err){
          toast('Erro ao salvar: '+err.message, true);
        }
      });
    }
  }
}
