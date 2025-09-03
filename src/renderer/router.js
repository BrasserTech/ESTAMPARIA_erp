// src/renderer/router.js
const ROUTE_MAP = {
  '#/': 'renderDashboard',
  '#/cadastro/produtos': 'renderCadastroProdutos',
  '#/cadastro/clientes': 'renderCadastroClientes',
  '#/cadastro/servicos': 'renderCadastroServicos',
  '#/consulta/produtos': 'renderConsultaProdutos',
  '#/consulta/clientes': 'renderConsultaClientes',
  '#/consulta/servicos': 'renderConsultaServicos',
  '#/relatorios': 'renderRelatorios',
  '#/configuracoes': 'renderConfiguracoes',
  '#/perfil': 'renderPerfil' // NOVA
};

window.navigate = function (hash) {
  if (!hash) hash = '#/';
  if (location.hash !== hash) location.hash = hash;
  else renderRoute();
};

function renderRoute() {
  const root = document.getElementById('view-root');
  const title = document.getElementById('page-title');

  const hash = location.hash || '#/';
  const fnName = ROUTE_MAP[hash] || 'renderDashboard';
  const fn = window[fnName];

  if (typeof fn !== 'function') {
    title.textContent = 'ERP';
    root.innerHTML = '<div class="card"><h3>Rota não encontrada</h3></div>';
    return;
  }

  const { title: pageTitle, html, afterRender } = fn();
  title.textContent = pageTitle || 'ERP';
  root.innerHTML = html || '';
  if (typeof afterRender === 'function') afterRender();
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('load', () => {
  if (!location.hash) location.hash = '#/';
  renderRoute();
});
