// src/renderer/views/cadastro-produtos.js
window.renderCadastroProdutos = function(){
  return {
    title: 'Cadastro de Produtos',
    html: `
      <div class="card">
        <form class="form" id="form-prod">
          <div>
            <label class="label">SKU*</label>
            <input class="input" id="p-sku" required placeholder="CAM-001" />
          </div>
          <div>
            <label class="label">Nome*</label>
            <input class="input" id="p-nome" required placeholder="Camiseta Algodão" />
          </div>
          <div class="full">
            <label class="label">Descrição</label>
            <textarea class="textarea" id="p-desc" rows="3" placeholder="Detalhes do produto..."></textarea>
          </div>
          <div>
            <label class="label">Categoria</label>
            <input class="input" id="p-cat" placeholder="Camisas" />
          </div>
          <div>
            <label class="label">Unidade</label>
            <input class="input" id="p-und" placeholder="UN, PCT, CX..." value="UN" />
          </div>
          <div>
            <label class="label">Validade</label>
            <input class="input" id="p-valid" type="date" />
          </div>
          <div>
            <label class="label">Preço Custo (R$)</label>
            <input class="input" id="p-custo" type="number" step="0.01" value="0" />
          </div>
          <div>
            <label class="label">Preço Venda (R$)</label>
            <input class="input" id="p-venda" type="number" step="0.01" value="0" />
          </div>
          <div>
            <label class="label">Estoque Mínimo</label>
            <input class="input" id="p-min" type="number" step="1" value="0" />
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
      const form = document.getElementById('form-prod');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try{
          const payload = {
            sku: document.getElementById('p-sku').value.trim(),
            nome: document.getElementById('p-nome').value.trim(),
            descricao: document.getElementById('p-desc').value || null,
            categoria: document.getElementById('p-cat').value || null,
            unidade: document.getElementById('p-und').value || 'UN',
            validade: document.getElementById('p-valid').value || null,
            preco_custo: parseFloat(document.getElementById('p-custo').value || '0'),
            preco_venda: parseFloat(document.getElementById('p-venda').value || '0'),
            estoque_minimo: parseInt(document.getElementById('p-min').value || '0',10)
          };
          if(!payload.sku || !payload.nome){ return toast('Preencha SKU e Nome', true); }
          await ipcRenderer.invoke('produtos:criar', payload);
          toast('Produto salvo!');
          form.reset();
        }catch(err){
          toast('Erro ao salvar: '+err.message, true);
        }
      });
    }
  }
}
