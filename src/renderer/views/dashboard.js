window.renderDashboard = function(){
  return {
    title: 'Dashboard',
    html: `
      <div class="card">
        <h3>Banco de Dados</h3>
        <div class="actions" style="margin-top:8px">
          <button class="button" id="btn-init">Criar/Atualizar Tabelas</button>
          <button class="button outline" id="btn-ping">Testar Conexão</button>
        </div>
        <pre id="out" style="margin-top:10px; background:#f6f8fb; padding:10px; border-radius:8px;"></pre>
      </div>
    `,
    afterRender(){
      const { ipcRenderer } = require('electron');
      const out = document.getElementById('out');

      document.getElementById('btn-init').addEventListener('click', async () => {
        try {
          await ipcRenderer.invoke('db:init');
          out.textContent = 'Esquema aplicado com sucesso.';
        } catch (e) {
          out.textContent = 'Erro ao aplicar esquema: ' + e.message;
        }
      });

      document.getElementById('btn-ping').addEventListener('click', async () => {
        try {
          const r = await ipcRenderer.invoke('db:ping');
          out.textContent = JSON.stringify(r, null, 2);
        } catch (e) {
          out.textContent = 'Falha no ping: ' + e.message;
        }
      });
    }
  };
}
