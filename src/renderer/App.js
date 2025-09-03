// Abre/fecha submenus
function setupSubmenus(){
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-toggle');
      const el = document.getElementById(id);
      const isOpen = el.style.display === 'block';
      document.querySelectorAll('.submenu').forEach(s => s.style.display = 'none');
      el.style.display = isOpen ? 'none' : 'block';
    });
  });

  // fecha submenus ao clicar fora do nav
  document.addEventListener('click', (e) => {
    const isNav = e.target.closest('.nav');
    if (!isNav) document.querySelectorAll('.submenu').forEach(s => s.style.display = 'none');
  });
}

// Colapsa/expande a sidebar
function setupSidebarToggle(){
  const btn = document.getElementById('btn-toggle-sidebar');
  const app = document.getElementById('app');
  btn.addEventListener('click', () => {
    app.classList.toggle('collapsed');
  });
}

// Inicialização
window.addEventListener('load', () => {
  setupSubmenus();
  setupSidebarToggle();
});
