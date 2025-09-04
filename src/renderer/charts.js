// ===== Canvas helpers simples para os gráficos do ERP =====

// Barras AGRUPADAS (duas séries lado a lado)
window.drawGroupedBars = function (canvas, labels, serieA, serieB) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  ctx.clearRect(0, 0, w, h);

  const max = Math.max(1, ...labels.map((_, i) => (serieA[i] || 0) + (serieB[i] || 0), ...serieA, ...serieB)) * 1.15;

  const padL = 40, padR = 10, padT = 10, padB = 28;
  const gw = w - padL - padR;
  const gh = h - padT - padB;

  const n = Math.max(1, labels.length);
  const groupW = gw / n;
  const barW = groupW * 0.32; // largura de cada barra (2 por grupo)
  const gapBars = groupW * 0.06; // separação entre as duas barras do grupo

  ctx.font = '12px Inter, system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';

  // rótulos do eixo X
  labels.forEach((lb, i) => {
    const x = padL + i * groupW + groupW / 2;
    ctx.fillText(lb, x, h - 8);
  });

  function bar(xCenter, value, gradTop, gradBottom) {
    const v = Math.max(0, Number(value || 0));
    const barH = (v / max) * gh;
    const x = xCenter - barW / 2;
    const y = h - padB - barH;

    const g = ctx.createLinearGradient(0, y, 0, y + barH);
    g.addColorStop(0, gradTop);
    g.addColorStop(1, gradBottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, barW, barH);
  }

  for (let i = 0; i < n; i++) {
    const base = padL + i * groupW + groupW / 2;
    // Entradas (azul) fica à esquerda do grupo
    bar(base - (barW / 2 + gapBars), serieA[i], '#3b82f6', '#2f6fed');
    // Saídas (verde) à direita
    bar(base + (barW / 2 + gapBars), serieB[i], '#22c55e', '#16a34a');
  }
};

// Barras horizontais (Top 5)
window.drawHBarChart = function (canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  ctx.clearRect(0, 0, w, h);

  const padL = 140, padR = 16, padT = 10, padB = 10;
  const gw = w - padL - padR;
  const gh = h - padT - padB;

  const n = Math.max(1, labels.length);
  const row = gh / n;
  const barH = row * 0.58;
  const gap = row - barH;

  const max = Math.max(1, ...values);

  ctx.font = '12px Inter, system-ui';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';

  for (let i = 0; i < n; i++) {
    const y = padT + i * (barH + gap);
    const lblY = y + barH * 0.75;
    ctx.fillText(labels[i] ?? '', padL - 8, lblY);

    const vw = (Number(values[i] || 0) / max) * gw;
    const g = ctx.createLinearGradient(padL, y, padL + vw, y);
    g.addColorStop(0, '#93c5fd');
    g.addColorStop(1, '#3b82f6');

    ctx.fillStyle = g;
    ctx.fillRect(padL, y, vw, barH);
  }
};

// Rosca (donut) para composição Produtos × Serviços
window.drawDonutChart = function (canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  ctx.clearRect(0, 0, w, h);

  const total = values.reduce((a, b) => a + (Number(b) || 0), 0) || 1;
  const cx = w / 2,
    cy = h / 2;
  const r = Math.min(w, h) / 2 - 8;
  const inner = r * 0.60;

  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

  let start = -Math.PI / 2;
  values.forEach((v, i) => {
    const ang = ((Number(v) || 0) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + ang);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();
    start += ang;
  });

  // “furo”
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // legenda (opcional — normalmente faremos fora do canvas)
};
