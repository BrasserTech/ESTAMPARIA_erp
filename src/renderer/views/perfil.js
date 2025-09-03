// src/renderer/views/perfil.js
window.renderPerfil = function(){
  return {
    title: 'Perfil',
    html: `
      <div class="card">
        <h3>Meu Perfil</h3>
        <div style="display:flex;gap:16px;align-items:center;margin:10px 0 18px">
          <div class="avatar" style="width:56px;height:56px;font-size:22px" id="perfil-avatar">U</div>
          <div>
            <div style="font-weight:700" id="perfil-nome">Usuário</div>
            <div style="color:#61788c" id="perfil-email">usuario@dominio.com</div>
          </div>
        </div>

        <form class="form" id="form-perfil">
          <div class="full">
            <label class="label">Nome</label>
            <input class="input" id="pf-nome" placeholder="Seu nome" />
          </div>
          <div class="full">
            <label class="label">Email</label>
            <input class="input" id="pf-email" placeholder="email@dominio.com" />
          </div>
          <div class="full actions">
            <button class="button" type="submit">Salvar</button>
            <button class="button outline" type="reset">Cancelar</button>
          </div>
        </form>

        <p style="color:#6c8197;margin-top:12px">* Neste MVP os dados de perfil ficam locais. Em versões futuras podemos integrar com usuários do banco.</p>
      </div>
    `,
    afterRender(){
      const { ipcRenderer } = require('electron');
      (async ()=>{
        try{
          const info = await ipcRenderer.invoke('app:info');
          const nome = info.user || 'Usuário';
          document.getElementById('perfil-nome').textContent = nome;
          document.getElementById('perfil-avatar').textContent = (nome[0]||'U').toUpperCase();
          document.getElementById('perfil-email').textContent = info.user_email || 'usuario@empresa.com';
          document.getElementById('pf-nome').value = nome;
          document.getElementById('pf-email').value = info.user_email || '';
        }catch{}
      })();

      document.getElementById('form-perfil').addEventListener('submit',(e)=>{
        e.preventDefault();
        toast('Perfil salvo (local).');
      });
    }
  }
}
