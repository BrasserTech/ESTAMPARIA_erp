// Barras simples
window.drawBarChart = function(canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth;
  const h = canvas.height = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  const max = Math.max(...values) * 1.2 || 1;
  const pad = 28;
  const gw = w - pad*2;
  const gh = h - pad*2;
  const bw = gw / values.length * 0.6;
  const gap = (gw / values.length) - bw;

  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'center';
  ctx.font = '12px Inter, system-ui';

  values.forEach((v, i) => {
    const x = pad + i*(bw+gap) + gap/2;
    const barH = (v / max) * gh;
    const y = h - pad - barH;

    // barra
    const grad = ctx.createLinearGradient(0, y, 0, y+barH);
    grad.addColorStop(0, '#3b82f6');   // topo
    grad.addColorStop(1, '#2f6fed');   // base
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, bw, barH);

    // rótulo
    ctx.fillStyle = '#475569';
    ctx.fillText(labels[i], x + bw/2, h - pad + 14);
  });
};

// Rosca simples
window.drawDonutChart = function(canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth;
  const h = canvas.height = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);

  const total = values.reduce((a,b)=>a+b,0) || 1;
  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)/2 - 10;
  const inner = r*0.6;

  const palette = ['#2f6fed','#60a5fa','#93c5fd','#bfdbfe','#3b82f6','#1d4ed8'];

  let start = -Math.PI/2;
  values.forEach((v, i) => {
    const ang = (v/total) * Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start+ang);
    ctx.closePath();
    ctx.fillStyle = palette[i % palette.length];
    ctx.fill();

    start += ang;
  });

  // “furo”
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // legenda
  ctx.font = '12px Inter, system-ui'; ctx.fillStyle = '#334155';
  let ly = 16;
  labels.forEach((lb, i) => {
    ctx.fillStyle = palette[i % palette.length];
    ctx.fillRect(10, ly-9, 10, 10);
    ctx.fillStyle = '#334155';
    ctx.fillText(`${lb} (${values[i]})`, 26, ly);
    ly += 16;
  });
};
