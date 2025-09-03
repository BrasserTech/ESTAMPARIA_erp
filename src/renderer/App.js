// src/renderer/App.js
(function(){
  const appEl = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const btnSidebar = document.getElementById('btn-sidebar');

  // Alterna modo recolhido, ajustando a coluna da grade (.app)
  btnSidebar.addEventListener('click', () => {
    appEl.classList.toggle('collapsed');
  });

  // Expansão/colapso dos submenus quando o menu está expandido
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const id = btn.getAttribute('data-toggle');
      const submenu = document.getElementById(id);

      // Se app está recolhido, abrir flyout lateral
      if (appEl.classList.contains('collapsed')) {
        openFlyoutFor(btn, submenu);
        ev.stopPropagation();
        return;
      }

      // Modo expandido: abre/fecha normalmente
      submenu.classList.toggle('open');
    });
  });

  // ====== Flyout para submenus no modo recolhido ======
  let flyout;
  function ensureFlyout(){
    if (!flyout) {
      flyout = document.createElement('div');
      flyout.className = 'flyout';
      document.body.appendChild(flyout);
      document.addEventListener('click', () => flyout.classList.remove('open'));
      window.addEventListener('resize', () => flyout.classList.remove('open'));
    }
  }

  function openFlyoutFor(anchorBtn, submenuEl){
    ensureFlyout();
    // Copia os links
    flyout.innerHTML = '';
    submenuEl.querySelectorAll('a').forEach(a => {
      const clone = a.cloneNode(true);
      clone.addEventListener('click', () => { flyout.classList.remove('open'); });
      flyout.appendChild(clone);
    });

    // Posiciona próximo ao botão, verticalmente alinhado
    const rect = anchorBtn.getBoundingClientRect();
    flyout.style.top = `${Math.max(10, rect.top)}px`;
    flyout.classList.add('open');
  }

  // Footer: data / dia / versão
  const { ipcRenderer } = require('electron');
  async function setupFooter(){
    try{
      const info = await ipcRenderer.invoke('app:info');
      document.getElementById('footer-version').textContent = `v${info.version || '0.0.0'}`;
      const user = info.user || 'Operador';
      document.getElementById('user-name').textContent = user;
      document.getElementById('user-avatar').textContent = (user[0] || 'O').toUpperCase();
    }catch{}
    const elDate = document.getElementById('footer-date');
    const elWeek = document.getElementById('footer-weekday');
    function tick(){
      const now = new Date();
      elDate.textContent = now.toLocaleDateString();
      elWeek.textContent = now.toLocaleDateString(undefined, { weekday: 'long' });
    }
    tick();
    setInterval(tick, 1000*30);
  }
  setupFooter();

  // Toast util
  window.toast = (msg, isErr=false) => {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr?' err':'');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.remove(); }, 3000);
  };
})();
