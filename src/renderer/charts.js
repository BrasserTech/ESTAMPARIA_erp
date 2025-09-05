// ===== Canvas helpers (com hit-test + tooltip) =====

function ensureTooltip(canvas) {
  let tip = canvas._tip;
  if (!tip) {
    tip = document.createElement('div');
    tip.style.position = 'fixed';
    tip.style.zIndex = 9999;
    tip.style.pointerEvents = 'none';
    tip.style.background = 'rgba(15,23,42,.92)';
    tip.style.color = '#fff';
    tip.style.font = '12px Inter, system-ui, sans-serif';
    tip.style.padding = '6px 8px';
    tip.style.borderRadius = '6px';
    tip.style.boxShadow = '0 6px 18px rgba(0,0,0,.25)';
    tip.style.display = 'none';
    document.body.appendChild(tip);
    canvas._tip = tip;
  }
  return tip;
}
function showTip(canvas, x, y, html) {
  const tip = ensureTooltip(canvas);
  tip.innerHTML = html;
  tip.style.left = `${x + 12}px`;
  tip.style.top  = `${y + 12}px`;
  tip.style.display = 'block';
}
function hideTip(canvas) {
  const tip = ensureTooltip(canvas);
  tip.style.display = 'none';
}

function clearOldHandlers(canvas) {
  if (canvas._handlers) {
    canvas._handlers.forEach(({ type, fn }) => canvas.removeEventListener(type, fn));
  }
  canvas._handlers = [];
  canvas._hit = [];
}
function on(canvas, type, fn) {
  canvas.addEventListener(type, fn);
  canvas._handlers.push({ type, fn });
}

// Tamanho seguro do canvas (evita w/h = 0)
function setupCanvasSizeOrDefer(canvas, redrawFn) {
  const w = canvas.clientWidth || canvas.offsetWidth || 0;
  const h = canvas.clientHeight || canvas.offsetHeight || 0;
  if (w < 30 || h < 30) {
    // ainda sem layout: re-tenta em seguida
    setTimeout(() => redrawFn(), 50);
    return null;
  }
  canvas.width = w;
  canvas.height = h;
  return { w, h };
}

// Formatadores
function fmtMoneyBR(n) {
  return (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'BRL' });
}
function fmtPct(p) {
  return `${(p * 100).toFixed(1)}%`;
}

// ============ 1) Barras AGRUPADAS (Entradas × Saídas) ============
window.drawGroupedBars = function (canvas, labels, serieA, serieB) {
  clearOldHandlers(canvas);
  const size = setupCanvasSizeOrDefer(canvas, () => window.drawGroupedBars(canvas, labels, serieA, serieB));
  if (!size) return;
  const { w, h } = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const max = Math.max(1, ...labels.map((_, i) => Math.max(serieA[i] || 0, serieB[i] || 0))) * 1.15;

  const padL = 40, padR = 10, padT = 10, padB = 28;
  const gw = w - padL - padR;
  const gh = h - padT - padB;

  const n = Math.max(1, labels.length);
  const groupW = gw / n;
  const barW = Math.max(8, groupW * 0.30);
  const gapBars = Math.min(10, groupW * 0.06);

  ctx.font = '12px Inter, system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';

  labels.forEach((lb, i) => {
    const x = padL + i * groupW + groupW / 2;
    ctx.fillText(lb, x, h - 8);
  });

  ctx.strokeStyle = '#eef2f7';
  ctx.lineWidth = 1;
  const steps = 4;
  for (let s = 1; s <= steps; s++) {
    const y = h - padB - (gh / steps) * s;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
  }

  function bar(xCenter, value, colorTop, colorBottom, seriesName, label) {
    const v = Math.max(0, Number(value || 0));
    const barH = (v / max) * gh;
    const x = xCenter - barW / 2;
    const y = h - padB - barH;
    const g = ctx.createLinearGradient(0, y, 0, y + barH);
    g.addColorStop(0, colorTop);
    g.addColorStop(1, colorBottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, barW, barH);
    canvas._hit.push({ type: 'bar', x, y, w: barW, h: barH, payload: { seriesName, label, value: v } });
  }

  for (let i = 0; i < n; i++) {
    const base = padL + i * groupW + groupW / 2;
    bar(base - (barW / 2 + gapBars), serieA[i], '#60a5fa', '#3b82f6', 'Entradas', labels[i]);
    bar(base + (barW / 2 + gapBars), serieB[i], '#34d399', '#22c55e', 'Saídas', labels[i]);
  }

  on(canvas, 'mousemove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    const hit = canvas._hit.find(z => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h);
    if (hit) {
      const p = hit.payload;
      showTip(canvas, ev.clientX, ev.clientY, `<strong>${p.seriesName}</strong><br>${p.label}<br>${fmtMoneyBR(p.value)}`);
    } else hideTip(canvas);
  });
  on(canvas, 'mouseleave', () => hideTip(canvas));
};

// ============ 2) Barras horizontais (Top 5 clientes) ============
window.drawHBarChart = function (canvas, labels, values) {
  clearOldHandlers(canvas);
  const size = setupCanvasSizeOrDefer(canvas, () => window.drawHBarChart(canvas, labels, values));
  if (!size) return;
  const { w, h } = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const padL = 140, padR = 16, padT = 10, padB = 10;
  const gw = w - padL - padR;
  const gh = h - padT - padB;

  const n = Math.max(1, labels.length);
  const row = gh / n;
  const barH = Math.max(12, row * 0.55);
  const gap = row - barH;

  const max = Math.max(1, ...values);

  ctx.font = '12px Inter, system-ui';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';

  for (let i = 0; i < n; i++) {
    const y = padT + i * (barH + gap);
    const lblY = y + barH * 0.75;
    ctx.fillText(labels[i] ?? '', padL - 8, lblY);

    const v = Number(values[i] || 0);
    const vw = (v / max) * gw;
    const g = ctx.createLinearGradient(padL, y, padL + vw, y);
    g.addColorStop(0, '#93c5fd'); g.addColorStop(1, '#3b82f6');

    ctx.fillStyle = g;
    ctx.fillRect(padL, y, vw, barH);

    canvas._hit.push({ type: 'hbar', x: padL, y, w: vw, h: barH, payload: { label: labels[i], value: v } });
  }

  on(canvas, 'mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const hit = canvas._hit.find(z => mx>=z.x && mx<=z.x+z.w && my>=z.y && my<=z.y+z.h);
    if (hit) {
      const p = hit.payload;
      showTip(canvas, ev.clientX, ev.clientY, `<strong>${p.label}</strong><br>${fmtMoneyBR(p.value)}`);
    } else hideTip(canvas);
  });
  on(canvas, 'mouseleave', () => hideTip(canvas));
};

// ============ 3) Donut (Composição) ============
window.drawDonutChart = function (canvas, labels, values) {
  clearOldHandlers(canvas);
  const size = setupCanvasSizeOrDefer(canvas, () => window.drawDonutChart(canvas, labels, values));
  if (!size) return;
  const { w, h } = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const total = values.reduce((a, b) => a + (Number(b) || 0), 0);
  if (total <= 0) {
    // nada a desenhar, mas mantemos o canvas válido
    return;
  }

  const cx = w / 2, cy = h / 2;
  const r = Math.max(12, Math.min(w, h) / 2 - 10);    // nunca negativo
  const inner = Math.max(0, Math.min(r - 4, r * 0.60)); // sempre < r

  const palette = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

  let start = -Math.PI / 2;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i]) || 0;
    if (v <= 0) continue;
    const ang = (v / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + ang, false);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();

    canvas._hit.push({
      type: 'arc',
      cx, cy, r, inner, start, end: start + ang,
      payload: { label: labels[i], value: v, pct: v / total }
    });

    start += ang;
  }

  // “furo”
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  function isPointInArc(mx, my, a) {
    const dx = mx - a.cx, dy = my - a.cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > a.r || dist < a.inner) return false;
    let ang = Math.atan2(dy, dx);
    if (ang < -Math.PI/2) ang += Math.PI*2;
    return ang >= a.start && ang <= a.end;
  }

  on(canvas, 'mousemove', (ev) => {
    const rct = canvas.getBoundingClientRect();
    const mx = ev.clientX - rct.left, my = ev.clientY - rct.top;
    const hit = canvas._hit.find(z => z.type === 'arc' && isPointInArc(mx, my, z));
    if (hit) {
      const p = hit.payload;
      showTip(canvas, ev.clientX, ev.clientY,
        `<strong>${p.label}</strong><br>Qtd: ${p.value}<br>${fmtPct(p.pct)}`
      );
    } else hideTip(canvas);
  });
  on(canvas, 'mouseleave', () => hideTip(canvas));
};

// ============ 4) Lucro/Prejuízo por mês (colunas com zero) ============
window.drawProfitColumns = function (canvas, labels, lucroPorMes) {
  clearOldHandlers(canvas);
  const size = setupCanvasSizeOrDefer(canvas, () => window.drawProfitColumns(canvas, labels, lucroPorMes));
  if (!size) return;
  const { w, h } = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const minVal = Math.min(0, ...lucroPorMes);
  const maxVal = Math.max(0, ...lucroPorMes);
  const range = (maxVal - minVal) || 1;

  const padL = 40, padR = 10, padT = 10, padB = 28;
  const gw = w - padL - padR;
  const gh = h - padT - padB;

  const n = Math.max(1, labels.length);
  const colW = Math.max(8, (gw / n) * 0.5);

  ctx.font = '12px Inter, system-ui';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';

  labels.forEach((lb, i) => {
    const x = padL + (i + 0.5) * (gw / n);
    ctx.fillText(lb, x, h - 8);
  });

  const zeroY = padT + gh * (1 - (0 - minVal) / range);
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke();

  for (let i = 0; i < n; i++) {
    const v = Number(lucroPorMes[i] || 0);
    const xCenter = padL + (i + 0.5) * (gw / n);
    const barH = (Math.abs(v) / range) * gh;
    const x = xCenter - colW / 2;

    let y, gradTop, gradBottom;
    if (v >= 0) {
      y = zeroY - barH; gradTop = '#34d399'; gradBottom = '#22c55e';
    } else {
      y = zeroY;        gradTop = '#f87171'; gradBottom = '#ef4444';
    }
    const g = ctx.createLinearGradient(0, y, 0, y + barH);
    g.addColorStop(0, gradTop); g.addColorStop(1, gradBottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, colW, barH);

    canvas._hit.push({
      type: 'bar',
      x, y: Math.min(y, zeroY), w: colW, h: barH,
      payload: { label: labels[i], value: v }
    });
  }

  on(canvas, 'mousemove', (ev) => {
    const r = canvas.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const hit = canvas._hit.find(z => mx>=z.x && mx<=z.x+z.w && my>=z.y && my<=z.y+z.h);
    if (hit) {
      const v = hit.payload.value;
      const tag = v >= 0 ? 'Lucro' : 'Prejuízo';
      showTip(canvas, ev.clientX, ev.clientY, `<strong>${hit.payload.label}</strong><br>${tag}: ${fmtMoneyBR(v)}`);
    } else hideTip(canvas);
  });
  on(canvas, 'mouseleave', () => hideTip(canvas));
};
