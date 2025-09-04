// src/renderer/views/dashboard.js
window.renderDashboard = function () {
  return {
    title: 'Dashboard',
    html: `
      <style>
        /* layout do dashboard sem scroll: 2x2 cards */
        .dash-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .dash-summary{background:#f5f8fe;border:1px solid #e6eef9;border-radius:12px;padding:10px 12px;color:#0f2544}

        .dash-grid{
          display:grid;
          grid-template-columns: 1fr 1fr;
          grid-auto-rows: 280px;       /* altura suficiente para caber em uma tela 768p sem rolagem */
          gap:16px;
        }
        .chart-card{
          background:#fff;border:1px solid #e8eef7;border-radius:14px;box-shadow:0 8px 18px rgba(21,78,210,.06);
          display:flex;flex-direction:column;min-height:0;
        }
        .chart-title{font-weight:800;color:#0f2544;padding:10px 12px 4px}
        .chart-wrap{flex:1;min-height:0;padding:8px}
        .chart-wrap canvas{width:100%;height:100%}

        .legend{display:flex;gap:14px;align-items:center;padding:4px 12px 10px}
        .dot{width:10px;height:10px;border-radius:3px;display:inline-block}
        .dot.blue{background:#3b82f6}
        .dot.green{background:#22c55e}
      </style>

      <div class="card">
        <div class="dash-toolbar">
          <label class="label" style="margin:0">Período</label>
          <select class="select" id="kpi-period" style="width:180px">
            <option value="3">Últimos 3 meses</option>
            <option value="6" selected>Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
          </select>
          <button class="button" id="btn-reload">Atualizar</button>
        </div>
        <div class="dash-summary" id="kpi-summary">Resultado no período: --</div>
      </div>

      <div class="dash-grid" style="margin-top:12px">
        <!-- 1) Entradas x Saídas -->
        <div class="chart-card">
          <div class="chart-title">Entradas × Saídas (por mês)</div>
          <div class="chart-wrap"><canvas id="ch-ems"></canvas></div>
          <div class="legend">
            <span class="dot blue"></span><span>Entradas</span>
            <span class="dot green" style="margin-left:8px"></span><span>Saídas</span>
          </div>
        </div>

        <!-- 2) Top 5 clientes por faturamento -->
        <div class="chart-card">
          <div class="chart-title">Top 5 clientes por faturamento</div>
          <div class="chart-wrap"><canvas id="ch-topcli"></canvas></div>
        </div>

        <!-- 3) Composição do faturamento -->
        <div class="chart-card">
          <div class="chart-title">Composição do faturamento</div>
          <div class="chart-wrap"><canvas id="ch-mix"></canvas></div>
          <div class="legend" id="mix-legend" style="gap:18px"></div>
        </div>

        <!-- 4) Espaço livre (reserva para futuro gráfico; mantém 2×2 sem rolagem) -->
        <div class="chart-card" style="display:flex;align-items:center;justify-content:center;color:#94a3b8">
          <div style="padding:8px 12px;text-align:center">
            <div style="font-weight:700;margin-bottom:4px">Área disponível</div>
            <div style="font-size:12px">Você pode colocar aqui outro indicador futuramente (ex.: Lucro x Prejuízo por mês).</div>
          </div>
        </div>
      </div>
    `,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // refs
      const sel = document.getElementById('kpi-period');
      const btn = document.getElementById('btn-reload');
      const out = document.getElementById('kpi-summary');

      const cvEMS = document.getElementById('ch-ems');
      const cvTOP = document.getElementById('ch-topcli');
      const cvMIX = document.getElementById('ch-mix');
      const mixLegend = document.getElementById('mix-legend');

      let cache = {
        labels: [],
        entradas: [],
        saidas: [],
        toplabels: [],
        topvalues: [],
        mix: { produtos: 0, servicos: 0 },
      };

      function fmtMoney(n) {
        return (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' });
      }

      function renderSummary(k) {
        const res = (k.totalSaidas || 0) - (k.totalEntradas || 0);
        const text = `Resultado no período: ${fmtMoney(res)} ${res >= 0 ? '(Lucro)' : '(Prejuízo)'}`;
        out.textContent = text;
        out.style.color = res >= 0 ? '#14532d' : '#b91c1c';
      }

      function renderCharts() {
        // 1) Entradas × Saídas
        window.drawGroupedBars(cvEMS, cache.labels, cache.entradas, cache.saidas);

        // 2) Top 5 clientes
        window.drawHBarChart(cvTOP, cache.toplabels, cache.topvalues);

        // 3) Mix (donut)
        window.drawDonutChart(cvMIX, ['Produtos', 'Serviços'], [cache.mix.produtos, cache.mix.servicos]);
        mixLegend.innerHTML = `
          <span><span class="dot blue"></span> Produtos: <strong>${(cache.mix.produtos || 0)}</strong></span>
          <span><span class="dot green"></span> Serviços: <strong>${(cache.mix.servicos || 0)}</strong></span>
        `;
      }

      async function carregar() {
        try {
          const meses = parseInt(sel.value, 10) || 6;

          // kpis (entradas × saídas)
          const kpis = await ipcRenderer.invoke('dashboard:kpis', { meses });
          cache.labels = (kpis.labels || []).map(ym => {
            // exibe como AAAA-MM no eixo; se quiser MMM/AA troque aqui
            return ym;
          });
          cache.entradas = kpis.entradas || [];
          cache.saidas = kpis.saidas || [];

          renderSummary(kpis);

          // top clientes
          const top = await ipcRenderer.invoke('dashboard:topclientes', { meses });
          cache.toplabels = top.labels || [];
          cache.topvalues = top.values || [];

          // mix (produtos × serviços)
          cache.mix = await ipcRenderer.invoke('dashboard:mix', { meses });

          renderCharts();
        } catch (err) {
          toast('Erro ao carregar gráficos: ' + err.message, true);
        }
      }

      btn.addEventListener('click', carregar);
      sel.addEventListener('change', carregar);

      // Redesenha ao redimensionar janela (para manter responsivo e sem scroll)
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderCharts, 120);
      });

      carregar();
    }
  };
};
