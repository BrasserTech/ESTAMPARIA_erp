// src/renderer/views/configuracoes.js
window.renderConfiguracoes = function(){
  return {
    title: 'Configurações',
    html: `
      <div class="card">
        <h3>Banco de Dados</h3>

        <div class="actions" style="margin:10px 0">
          <button class="button" id="btn-ping">Testar Conexão</button>
          <button class="button outline" id="btn-init">Criar/Atualizar Tabelas</button>
        </div>

        <div class="card" style="margin-top:12px">
          <h4>Conexão Ativa</h4>
          <pre id="db-info" style="background:#f6f8fb;padding:10px;border-radius:8px;"></pre>
        </div>

        <div class="card" style="margin-top:12px">
          <h4>Saída</h4>
          <pre id="db-out" style="background:#f6f8fb;padding:10px;border-radius:8px;min-height:80px"></pre>
        </div>

        <p style="margin-top:14px;color:#555;">
          <strong>O que faz “Criar/Atualizar Tabelas”?</strong><br/>
          Executa o script <code>src/database/schema.sql</code> de forma idempotente para
          criar/ajustar o esquema do ERP (clientes, fornecedores, produtos, serviços,
          entradas/saídas, itens e movimentos de estoque) preservando dados existentes.
        </p>
      </div>
    `,
    afterRender(){
      const { ipcRenderer } = require('electron');
      const $ = (id) => document.getElementById(id);

      async function loadInfo(){
        try {
          const info = await ipcRenderer.invoke('db:info');
          $('db-info').textContent = JSON.stringify(info, null, 2);
        } catch(e){
          $('db-info').textContent = 'Não foi possível obter informações da conexão: ' + e.message;
        }
      }

      $('btn-ping').addEventListener('click', async () => {
        $('db-out').textContent = 'Testando...';
        try {
          const r = await ipcRenderer.invoke('db:ping');
          $('db-out').textContent = JSON.stringify(r, null, 2);
        } catch (e) {
          $('db-out').textContent = 'Falha no ping: ' + e.message;
        }
      });

      $('btn-init').addEventListener('click', async () => {
        $('db-out').textContent = 'Aplicando schema...';
        try {
          await ipcRenderer.invoke('db:init');
          $('db-out').textContent = 'Esquema aplicado com sucesso.';
        } catch (e) {
          $('db-out').textContent = 'Erro ao aplicar schema: ' + e.message;
        }
      });

      loadInfo();
    }
  }
}
