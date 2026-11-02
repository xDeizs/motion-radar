// Renders the procedural LED wall loop that sits behind the manifesto:
// assets/video/led-wall.mp4 (H.264), led-wall.webm (VP9) and led-wall-poster.webp.
// Everything is drawn in code (no stock footage): a 160×90 LED matrix with plasma, radar rings,
// twinkles and two scrolling tickers, upscaled with a round-dot mask and bloom. The loop is seamless.
// Usage: npm run video   (needs ffmpeg with libx264, libvpx-vp9 and libwebp on PATH)
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const nodePaths = (process.env.MR_NODE_PATH || '').split(path.delimiter).filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths: [root, ...nodePaths] }));

const W = 1280, H = 720, FPS = 30, FRAMES = 240; // 8 s
const outDir = path.join(root, 'assets/video');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'led-wall-'));
const font = (name) => fs.readFileSync(path.join(root, 'assets/fonts', name)).toString('base64');
const fonts = [['LedU', font('unbounded-latin.woff2')], ['LedC', font('unbounded-cyrillic.woff2')]];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent('<!doctype html><body style="margin:0;background:#000"><canvas id="c"></canvas></body>');
await page.evaluate(async ({ W, H, FRAMES, fonts }) => {
  for (const [family, b64] of fonts) {
    const face = new FontFace(family, `url(data:font/woff2;base64,${b64})`, { weight: '400 900' });
    await face.load(); document.fonts.add(face);
  }
  const COLS = 160, ROWS = 90, P = W / COLS, TAU = Math.PI * 2;
  const c = document.getElementById('c'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const L = document.createElement('canvas'); L.width = COLS; L.height = ROWS;
  const lx = L.getContext('2d');
  const T = document.createElement('canvas'); T.width = COLS; T.height = ROWS;
  const tx = T.getContext('2d', { willReadFrequently: true });
  const img = lx.createImageData(COLS, ROWS);

  // one LED: a soft round dot inside a dark cell
  const tile = document.createElement('canvas'); tile.width = tile.height = P;
  const tc = tile.getContext('2d');
  tc.fillStyle = '#000'; tc.fillRect(0, 0, P, P);
  const g = tc.createRadialGradient(P / 2, P / 2, 0, P / 2, P / 2, P * 0.47);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#f4f4f4'); g.addColorStop(0.78, '#7a7a7a'); g.addColorStop(1, '#000');
  tc.fillStyle = g; tc.beginPath(); tc.arc(P / 2, P / 2, P * 0.47, 0, TAU); tc.fill();
  const dots = ctx.createPattern(tile, 'repeat');

  const PAL = [[61, 92, 255], [155, 107, 255], [255, 79, 179]]; // cobalt, violet, pink
  const LIME = [200, 255, 46], CYAN = [41, 211, 255];
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // tickers: each period is exactly 240 LED pixels so a 1 px/frame scroll loops in 240 frames
  const BAND_A = 'ИДЕИ • КОД • ДВИЖЕНИЕ • ', BAND_B = 'RADAR ON • 6H • OPEN FEEDS • :) • ';
  const PERIOD = 240;
  const bands = [
    { text: BAND_A, y: 9, h: 13, size: 11, dir: -1, color: LIME },
    { text: BAND_B, y: 69, h: 13, size: 10, dir: 1, color: [255, 120, 200] },
  ];
  function drawBands(i) {
    tx.clearRect(0, 0, COLS, ROWS);
    for (const b of bands) {
      tx.font = `800 ${b.size}px LedU, LedC`;
      tx.textBaseline = 'alphabetic';
      tx.fillStyle = '#fff';
      const fit = (PERIOD - 8) / tx.measureText(b.text).width; // stretch the ticker to fill its period
      const off = ((b.dir < 0 ? -i : i) % PERIOD + PERIOD) % PERIOD;
      for (let x = off - PERIOD; x < COLS + PERIOD; x += PERIOD) {
        tx.save(); tx.translate(x, b.y + b.h - 3); tx.scale(fit, 1); tx.fillText(b.text, 0, 0); tx.restore();
      }
    }
    return tx.getImageData(0, 0, COLS, ROWS).data;
  }

  window.frame = (i) => {
    const t = i / FRAMES, ph = t * TAU;
    const text = drawBands(i);
    const d = img.data;
    const sweep = ph * 1; // one revolution per loop
    for (let y = 0; y < ROWS; y++) {
      const inBand = bands.find((b) => y >= b.y && y < b.y + b.h);
      for (let x = 0; x < COLS; x++) {
        const k = (y * COLS + x) * 4;
        let r = 10, gg = 11, bl = 24; // unlit LED
        if (inBand) {
          const a = smooth(0.32, 0.62, text[k + 3] / 255);
          const base = 0.05 + 0.03 * Math.sin(x * 0.4 + ph * 2);
          r += inBand.color[0] * (a + base); gg += inBand.color[1] * (a + base); bl += inBand.color[2] * (a + base);
        } else {
          // plasma field (all time terms are whole cycles per loop)
          const dx = x - 80, dy = (y - 45) * 1.25, dist = Math.hypot(dx, dy);
          const v = Math.sin(x * 0.055 + ph) + Math.sin((x * 0.45 + y) * 0.085 - ph * 2) + Math.sin(dist * 0.11 - ph);
          const n = (v + 3) / 6;
          const col = n < 0.5 ? mix(PAL[0], PAL[1], n * 2) : mix(PAL[1], PAL[2], (n - 0.5) * 2);
          let lum = 0.07 + 0.3 * n * n;
          // radar rings expanding from the centre, two per loop
          for (let j = 0; j < 2; j++) {
            const rr = ((t * 2 + j * 0.5) % 1) * 110;
            const ring = Math.max(0, 1 - Math.abs(dist - rr) / 1.6) * (1 - rr / 110);
            r += CYAN[0] * ring * 0.55; gg += CYAN[1] * ring * 0.55; bl += CYAN[2] * ring * 0.55;
          }
          // sweep wedge
          let ang = Math.atan2(dy, dx) - sweep; ang = ((ang % TAU) + TAU) % TAU;
          const wedge = Math.pow(1 - ang / TAU, 10) * smooth(70, 8, dist) * 0.55;
          r += LIME[0] * wedge * 0.6; gg += LIME[1] * wedge * 0.6; bl += LIME[2] * wedge * 0.6;
          // twinkles
          const h = hash(x, y);
          if (h > 0.965) { const tw = Math.pow(Math.max(0, Math.sin(ph * (1 + Math.floor(h * 1000) % 3) + h * 40)), 24); lum += tw * 0.9; }
          r += col[0] * lum; gg += col[1] * lum; bl += col[2] * lum;
        }
        d[k] = Math.min(255, r); d[k + 1] = Math.min(255, gg); d[k + 2] = Math.min(255, bl); d[k + 3] = 255;
      }
    }
    lx.putImageData(img, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L, 0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = dots; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
    ctx.filter = 'blur(7px)'; ctx.globalAlpha = 0.42; ctx.drawImage(L, 0, 0, W, H);
    ctx.filter = 'blur(28px)'; ctx.globalAlpha = 0.3; ctx.drawImage(L, 0, 0, W, H);
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    return c.toDataURL('image/png');
  };
}, { W, H, FRAMES, fonts });

for (let i = 0; i < FRAMES; i++) {
  const url = await page.evaluate((n) => window.frame(n), i);
  fs.writeFileSync(path.join(tmp, `f${String(i).padStart(4, '0')}.png`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
}
await browser.close();

const frames = path.join(tmp, 'f%04d.png');
const run = (args) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
run(['-framerate', String(FPS), '-i', frames, '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.LED_CRF || '27', '-pix_fmt', 'yuv420p', '-g', String(FPS), '-movflags', '+faststart', '-an', path.join(outDir, 'led-wall.mp4')]);
run(['-framerate', String(FPS), '-i', frames, '-c:v', 'libvpx-vp9', '-crf', process.env.LED_VP9_CRF || '40', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', path.join(outDir, 'led-wall.webm')]);
run(['-i', path.join(tmp, 'f0000.png'), '-c:v', 'libwebp', '-quality', '70', path.join(outDir, 'led-wall-poster.webp')]);
fs.copyFileSync(path.join(tmp, 'f0060.png'), path.join(os.tmpdir(), 'led-wall-sample.png'));
fs.rmSync(tmp, { recursive: true, force: true });
for (const f of ['led-wall.mp4', 'led-wall.webm', 'led-wall-poster.webp']) {
  console.log(f, (fs.statSync(path.join(outDir, f)).size / 1024).toFixed(0) + ' KB');
}
