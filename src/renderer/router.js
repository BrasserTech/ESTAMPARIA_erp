// src/renderer/router.js
const ROUTE_MAP = {
  '#/': 'renderDashboard',

  // Cadastros
  '#/cadastro/produtos': 'renderCadastroProdutos',
  '#/cadastro/clientes': 'renderCadastroClientes',
  '#/cadastro/servicos': 'renderCadastroServicos',

  // Entradas (separadas)
  '#/cadastro/entradas/produtos': 'renderCadastroEntradaProd',
  '#/cadastro/entradas/servicos': 'renderCadastroEntradaServ',

  // Saídas (separadas)
  '#/cadastro/saidas/produtos': 'renderCadastroSaidaProd',
  '#/cadastro/saidas/servicos': 'renderCadastroSaidaServ',

  // Consultas existentes
  '#/consulta/produtos': 'renderConsultaProdutos',
  '#/consulta/clientes': 'renderConsultaClientes',
  '#/consulta/servicos': 'renderConsultaServicos',

  // Consultar Entradas/Saídas (se sua UI usa essas telas)
  '#/consulta/entradas': 'renderConsultarEntradas',
  '#/consulta/saidas': 'renderConsultarSaidas',

  // ================= Relatórios (separados por arquivo) =================
  // Faturamento (novo nome)
  '#/relatorios/faturamento': 'renderRelFaturamento',
  // Alias de compatibilidade (links antigos ainda funcionam)
  '#/relatorios/fat-diario': 'renderRelFaturamento',

  // Faturamento por Cliente
  '#/relatorios/fat-por-cliente': 'renderRelFatPorCliente',
  // Alias opcional para compatibilidade
  '#/relatorios/por-cliente': 'renderRelFatPorCliente',

  // Histórico Comercial
  '#/relatorios/historico-comercial': 'renderRelHistoricoComercial',

  // Página de lista de relatórios (se existir)
  '#/relatorios': 'renderRelatorios',

  // Gerais
  '#/configuracoes': 'renderConfiguracoes',
  '#/perfil': 'renderPerfil'
};

window.navigate = function (hash) {
  if (!hash) hash = '#/';
  if (location.hash !== hash) {
    location.hash = hash;
  } else {
    renderRoute();
  }
};

function renderRoute() {
  const root = document.getElementById('view-root');
  const title = document.getElementById('page-title');

  // Normaliza hash (remove possíveis barras finais duplicadas)
  let hash = location.hash || '#/';
  if (hash.length > 2 && hash.endsWith('/')) hash = hash.slice(0, -1);

  const fnName = ROUTE_MAP[hash] || 'renderDashboard';
  const fn = window[fnName];

  if (typeof fn !== 'function') {
    title.textContent = 'ERP';
    root.innerHTML = '<div class="card"><h3>Rota não encontrada</h3></div>';
    return;
  }

  const { title: pageTitle, html, afterRender } = fn() || {};
  title.textContent = pageTitle || 'ERP';
  root.innerHTML = html || '';
  if (typeof afterRender === 'function') afterRender();
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('load', () => {
  if (!location.hash) location.hash = '#/';
  renderRoute();
});
