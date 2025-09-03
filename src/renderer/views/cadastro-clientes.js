// src/renderer/views/cadastro-clientes.js
window.renderCadastroClientes = function(){
  return {
    title: 'Cadastro de Clientes',
    html: `
      <div class="card">
        <form class="form" id="form-cli">
          <div>
            <label class="label">Nome*</label>
            <input class="input" id="c-nome" required placeholder="Cliente Exemplo" />
          </div>
          <div>
            <label class="label">Documento</label>
            <input class="input" id="c-doc" placeholder="CPF/CNPJ" />
          </div>
          <div>
            <label class="label">Email</label>
            <input class="input" id="c-email" type="email" placeholder="contato@email.com" />
          </div>
          <div>
            <label class="label">Telefone</label>
            <input class="input" id="c-tel" placeholder="(00) 00000-0000" />
          </div>
          <div class="full">
            <label class="label">Endereço</label>
            <input class="input" id="c-end" placeholder="Rua, nº, bairro, cidade" />
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
      const form = document.getElementById('form-cli');
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        try{
          const payload = {
            nome: document.getElementById('c-nome').value.trim(),
            documento: document.getElementById('c-doc').value || null,
            email: document.getElementById('c-email').value || null,
            telefone: document.getElementById('c-tel').value || null,
            endereco: document.getElementById('c-end').value || null
          };
          if(!payload.nome){ return toast('Informe o nome do cliente', true); }
          await ipcRenderer.invoke('clientes:criar', payload);
          toast('Cliente salvo!');
          form.reset();
        }catch(err){
          toast('Erro ao salvar: '+err.message, true);
        }
      });
    }
  }
}
