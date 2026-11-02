// Motion Radar 5 · the peak: a radar screen whose sweep is driven by scroll.
// Blips are the real latest items from the snapshot; the list beside it lights up as they are found.
const TAU = Math.PI * 2;
const hashUnit = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };

export function createRadar({ canvas, root, list, onOpen, onHover }) {
  const g = canvas.getContext('2d');
  let W = 0, dpr = 1, blips = [], progress = 0, sweep = -Math.PI / 2, motion = true;
  let hot = -1, visible = false, running = false, raf = 0, t0 = performance.now();
  const ST = { found: new Set() };

  function setItems(items) {
    const n = Math.max(1, items.length);
    blips = items.map((it, i) => {
      const j = hashUnit(it.id || String(i));
      const a = -Math.PI / 2 + 0.32 + (i / n) * (TAU * 0.88) + (j - 0.5) * 0.22;
      const r = 0.3 + 0.58 * ((i * 0.618 + j * 0.37) % 1);
      return { ...it, i, a, r, foundAt: -1 };
    });
    ST.found.clear();
    apply(true);
  }
  function resize() {
    const w = canvas.clientWidth || 1;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(w * dpr);
    canvas.width = W; canvas.height = W;
    draw();
  }
  function apply(silent) {
    sweep = -Math.PI / 2 + progress * TAU * 1.12;
    const now = performance.now();
    blips.forEach((b) => {
      const isFound = !motion || sweep >= b.a;
      const had = ST.found.has(b.i);
      if (isFound && !had) { ST.found.add(b.i); b.foundAt = silent || !motion ? -1 : now; }
      if (!isFound && had) { ST.found.delete(b.i); }
      const row = list && list.querySelector(`[data-blip="${b.i}"]`);
      if (row) row.classList.toggle('is-found', isFound);
    });
    if (!running) draw();
  }
  function polar(b, R, cx, cy) { return [cx + Math.cos(b.a) * b.r * R, cy + Math.sin(b.a) * b.r * R]; }

  function draw() {
    if (!W) return;
    const now = performance.now(), time = (now - t0) / 1000;
    const cx = W / 2, cy = W / 2, R = W * 0.47;
    g.clearRect(0, 0, W, W);
    // screen
    const bg = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
    bg.addColorStop(0, '#0b1338'); bg.addColorStop(0.75, '#060a1d'); bg.addColorStop(1, '#04050d');
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    // rings and grid
    g.lineWidth = 1 * dpr;
    for (let k = 1; k <= 4; k++) {
      g.strokeStyle = k === 4 ? 'rgba(150,170,255,0.42)' : 'rgba(130,150,255,0.17)';
      g.beginPath(); g.arc(cx, cy, (R * k) / 4, 0, TAU); g.stroke();
    }
    g.strokeStyle = 'rgba(130,150,255,0.14)';
    g.beginPath();
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 4; g.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    g.stroke();
    // ticks + bearings
    for (let d = 0; d < 360; d += 5) {
      const a = (d * Math.PI) / 180 - Math.PI / 2, long = d % 30 === 0, l = (long ? 12 : 5) * dpr;
      g.strokeStyle = long ? 'rgba(210,220,255,0.55)' : 'rgba(210,220,255,0.22)';
      g.beginPath(); g.moveTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
      if (long) {
        g.fillStyle = 'rgba(190,200,240,0.6)'; g.font = `${10 * dpr}px ui-monospace, Menlo, monospace`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(d).padStart(3, '0'), cx + Math.cos(a) * (R - 26 * dpr), cy + Math.sin(a) * (R - 26 * dpr));
      }
    }
    // sweep wedge
    if (motion && g.createConicGradient) {
      const wedge = 1.15;
      const cg = g.createConicGradient(sweep - wedge, cx, cy);
      cg.addColorStop(0, 'rgba(200,255,46,0)');
      cg.addColorStop(wedge / TAU, 'rgba(200,255,46,0.3)');
      cg.addColorStop(Math.min(1, wedge / TAU + 0.0008), 'rgba(200,255,46,0)');
      cg.addColorStop(1, 'rgba(200,255,46,0)');
      g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
      g.save(); g.shadowColor = '#c8ff2e'; g.shadowBlur = 16 * dpr; g.strokeStyle = '#d8ff6a'; g.lineWidth = 2 * dpr;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R); g.stroke(); g.restore();
    }
    // blips
    let animating = false;
    blips.forEach((b) => {
      const [x, y] = polar(b, R, cx, cy), found = ST.found.has(b.i);
      if (!found) { g.fillStyle = 'rgba(255,255,255,0.13)'; g.beginPath(); g.arc(x, y, 2 * dpr, 0, TAU); g.fill(); return; }
      if (b.foundAt > 0) {
        const age = (now - b.foundAt) / 1000;
        if (age < 1.4) {
          animating = true;
          g.strokeStyle = b.color; g.globalAlpha = Math.max(0, 1 - age / 1.4); g.lineWidth = 2 * dpr;
          g.beginPath(); g.arc(x, y, (6 + age * 28) * dpr, 0, TAU); g.stroke(); g.globalAlpha = 1;
        }
      }
      const behind = motion ? ((sweep - b.a) % TAU + TAU) % TAU : 1;
      const glow = motion ? 0.55 + 0.45 * Math.max(0, 1 - behind / 2.2) : 1;
      g.save(); g.shadowColor = b.color; g.shadowBlur = 18 * dpr * glow; g.fillStyle = b.color; g.globalAlpha = 0.6 + 0.4 * glow;
      g.beginPath(); g.arc(x, y, (b.i === hot ? 7.5 : 5.5) * dpr, 0, TAU); g.fill(); g.restore();
      if (b.i === hot) {
        g.strokeStyle = b.color; g.lineWidth = 1.5 * dpr;
        g.beginPath(); g.arc(x, y, 14 * dpr, 0, TAU); g.stroke();
        const label = b.title.length > 38 ? b.title.slice(0, 37) + '…' : b.title;
        g.font = `600 ${13 * dpr}px Onest, system-ui, sans-serif`;
        const tw = g.measureText(label).width, pad = 10 * dpr, bh = 30 * dpr;
        let lx = x + 18 * dpr, ly = y - bh / 2;
        if (lx + tw + pad * 2 > W - 6 * dpr) lx = x - 18 * dpr - tw - pad * 2;
        g.fillStyle = 'rgba(5,6,14,0.88)'; g.strokeStyle = b.color;
        g.beginPath(); g.roundRect ? g.roundRect(lx, ly, tw + pad * 2, bh, 10 * dpr) : g.rect(lx, ly, tw + pad * 2, bh); g.fill(); g.stroke();
        g.fillStyle = '#eef0f8'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(label, lx + pad, ly + bh / 2);
      }
    });
    // centre
    const pulse = motion ? 0.5 + 0.5 * Math.sin(time * 2.4) : 1;
    g.fillStyle = '#c8ff2e'; g.beginPath(); g.arc(cx, cy, 4 * dpr, 0, TAU); g.fill();
    g.strokeStyle = `rgba(200,255,46,${0.25 + 0.35 * pulse})`; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.arc(cx, cy, (10 + 4 * pulse) * dpr, 0, TAU); g.stroke();
    return animating;
  }

  function loop() { raf = requestAnimationFrame(loop); draw(); }
  function sync() {
    const should = visible && motion && !document.hidden;
    if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
    if (!should && running) { running = false; cancelAnimationFrame(raf); draw(); }
  }
  function nearest(e) {
    const r = canvas.getBoundingClientRect(), s = W / r.width;
    const px = (e.clientX - r.left) * s, py = (e.clientY - r.top) * s, R = W * 0.47;
    let best = -1, bd = 22 * dpr;
    blips.forEach((b) => { if (!ST.found.has(b.i)) return; const [x, y] = polar(b, R, W / 2, W / 2); const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = b.i; } });
    return best;
  }
  function setHot(i) {
    if (hot === i) return; hot = i;
    list && list.querySelectorAll('.blip-row').forEach((row) => row.classList.toggle('is-hot', +row.dataset.blip === i));
    canvas.style.cursor = i >= 0 ? 'pointer' : '';
    if (!running) draw();
  }
  canvas.addEventListener('pointermove', (e) => setHot(nearest(e)), { passive: true });
  canvas.addEventListener('pointerleave', () => setHot(-1), { passive: true });
  canvas.addEventListener('click', (e) => { const i = nearest(e); if (i >= 0 && onOpen) onOpen(blips[i].id); });
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; sync(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  resize();

  return {
    setItems,
    setProgress(p) { progress = Math.max(0, Math.min(1, p)); apply(false); },
    setMotion(on) {
      motion = on; root && root.classList.toggle('is-scan', on);
      if (!on) progress = 1;
      apply(true); sync(); draw();
    },
    highlight: (i) => setHot(i),
    foundCount: () => ST.found.size,
  };
}
