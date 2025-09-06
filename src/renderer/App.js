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

// ===== Sidebar responsiva: desktop = collapse; mobile = off-canvas =====
(function () {
  const app = document.getElementById('app');
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');

  if (!app || !sidebar || !toggleBtn) return;

  // cria backdrop (uma vez)
  let backdrop = document.querySelector('.backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    document.body.appendChild(backdrop);
  }

  const isMobile = () => window.innerWidth <= 1200;

  function openMobileSidebar() {
    app.classList.add('sidebar-open');
  }
  function closeMobileSidebar() {
    app.classList.remove('sidebar-open');
  }
  function toggleSidebar() {
    if (isMobile()) {
      app.classList.toggle('sidebar-open');
    } else {
      app.classList.toggle('collapsed');
    }
  }

  // clique no botão abre/fecha
  toggleBtn.addEventListener('click', toggleSidebar);

  // clique no backdrop fecha
  backdrop.addEventListener('click', closeMobileSidebar);

  // ao mudar de rota, fecha sidebar mobile
  window.addEventListener('hashchange', closeMobileSidebar);

  // se redimensionar para desktop, garante que o off-canvas esteja fechado
  window.addEventListener('resize', () => {
    if (!isMobile()) closeMobileSidebar();
  });

  // se clicar em qualquer link da sidebar no mobile, fecha o menu
  sidebar.addEventListener('click', (ev) => {
    const a = ev.target.closest('a');
    if (a && isMobile()) closeMobileSidebar();
  });

  // fecha com ESC no mobile
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && isMobile()) closeMobileSidebar();
  });
})();

// ===== FAB / Acessibilidade extra para mobile (sempre abre o menu) =====
(function () {
  const app = document.getElementById('app');
  const isMobile = () => window.innerWidth <= 1200;

  // cria FAB uma única vez
  let fab = document.getElementById('menu-fab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'menu-fab';
    fab.className = 'menu-fab';
    fab.setAttribute('aria-label', 'Abrir menu');
    fab.title = 'Abrir menu (Ctrl+B)';
    fab.textContent = '☰';
    document.body.appendChild(fab);
  }

  fab.addEventListener('click', () => {
    if (isMobile()) app.classList.add('sidebar-open');
  });

  // atalho de teclado: Ctrl + B abre/fecha no mobile
  document.addEventListener('keydown', (ev) => {
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (ctrl && (ev.key.toLowerCase() === 'b')) {
      if (isMobile()) {
        ev.preventDefault();
        app.classList.toggle('sidebar-open');
      }
    }
  });

  // quando redimensionar para desktop, ocultamos qualquer resquício de estado
  window.addEventListener('resize', () => {
    if (!isMobile()) app.classList.remove('sidebar-open');
  });
})();
