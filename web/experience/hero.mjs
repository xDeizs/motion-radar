// Motion Radar 5 · hero scene: glossy keycaps that navigate the site, plus iridescent soap bubbles.
// Everything is generated in code: geometry, legends (CanvasTexture) and the bubble shader.
import {
  Scene, PerspectiveCamera, WebGLRenderer, BoxGeometry, SphereGeometry, Mesh, Group,
  MeshPhysicalMaterial, ShaderMaterial, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping,
  PMREMGenerator, DirectionalLight, PointLight, Raycaster, Vector2, Vector3, MathUtils, Float32BufferAttribute,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const GLYPHS = {
  radar: { s: [circle(12, 12, 8.5), circle(12, 12, 4.2), 'M12 12 18 6'], f: [circle(12, 12, 1.3)] },
  code: { s: ['m8 8-4 4 4 4M16 8l4 4-4 4', 'M13.6 5 10.4 19'] },
  eye: { s: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z', circle(12, 12, 3)] },
  flask: { s: ['M9 3h6M10 3v6.2l-5.2 8.9A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.9L14 9.2V3'], f: [circle(10, 16.5, 1.1), circle(14, 18, 0.9)] },
  book: { s: ['M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z', 'M9 9h6M9 12.5h4'] },
  unlock: { s: ['M7 10.5h10a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 18v-5A2.5 2.5 0 0 1 7 10.5z', 'M8 10.5V7.5a4 4 0 0 1 7.6-1.8'], f: [circle(12, 15.5, 1.3)] },
  smile: { s: [circle(12, 12, 9), 'M8.3 14a4.7 4.7 0 0 0 7.4 0'], f: [circle(9, 9.8, 1.1), circle(15, 9.8, 1.1)] },
};

// id = library view; "wave" is a pure delight key
const KEYS = [
  { id: 'feed', label: 'Лента', glyph: 'radar', color: '#3d5bff', ink: '#ffffff', led: '#c8ff2e' },
  { id: 'code', label: 'Код', glyph: 'code', color: '#16161f', ink: '#c8ff2e' },
  { id: 'references', label: 'Рефы', glyph: 'eye', color: '#ff4fb3', ink: '#ffffff' },
  { id: 'lab', label: 'Лаб', glyph: 'flask', color: '#c8ff2e', ink: '#0b0d00' },
  { id: 'knowledge', label: 'Знания', glyph: 'book', color: '#eceef6', ink: '#0b0d1f' },
  { id: 'free', label: 'Бесплатно', glyph: 'unlock', color: '#ff8a1f', ink: '#160900' },
  { id: 'wave', label: '', glyph: 'smile', color: '#9b6bff', ink: '#ffffff' },
];
// Wide screens: keys continue the headline lines, like a staggered keyboard row.
// Row 0 follows "Идеи.", row 1 follows "Код.", row 2 follows "Движение.", row 3 sits after the CTAs.
const ROW_PLAN = [['feed', 'code', 'references'], ['lab', 'knowledge', 'free'], ['wave'], []];
// [dx, dy] in key sizes, z in world units, rotZ
const JITTER = {
  feed: [0.02, 0.05, 0.15, 0.2], code: [-0.03, -0.09, -0.4, -0.13], references: [0.04, 0.03, 0.1, 0.24],
  lab: [0, -0.04, 0.45, -0.2], knowledge: [-0.03, 0.07, -0.05, 0.1], free: [0.05, -0.05, -0.3, -0.17], wave: [0, 0, 0.3, 0.28],
};
// Tall screens: [x, y, z, rotZ] in key units, before cluster scaling
const LAYOUT_TALL = {
  feed: [-1.2, 0.55, 0.1, 0.18], code: [0.05, 0.9, -0.3, -0.12], references: [1.25, 0.45, 0.1, 0.22],
  lab: [-0.62, -0.62, 0.45, -0.2], wave: [0.72, -0.55, 0.3, 0.26],
};
const EXTENT_TALL = [3.5, 2.6];

function keycapGeometry({ w = 1, d = 1, h = 0.62, r = 0.14, taper = 0.8, dish = 0.04, seg = 18 } = {}) {
  const box = new BoxGeometry(1, 1, 1, seg, 8, seg);
  const pos = box.attributes.position;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const k = 0.62;
  const remap = (c, half) => {
    const a = Math.abs(c), s = Math.sign(c);
    return a < 0.5 * k ? (c / (0.5 * k)) * (half - r) : s * (half - r + ((a - 0.5 * k) / (0.5 - 0.5 * k)) * r);
  };
  const uv = new Float32Array(pos.count * 2);
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let x = remap(v.x, hx), y = remap(v.y, hy), z = remap(v.z, hz);
    const qx = MathUtils.clamp(x, -(hx - r), hx - r), qy = MathUtils.clamp(y, -(hy - r), hy - r), qz = MathUtils.clamp(z, -(hz - r), hz - r);
    const dx = x - qx, dy = y - qy, dz = z - qz, len = Math.hypot(dx, dy, dz);
    if (len > 1e-9) { x = qx + (dx / len) * r; y = qy + (dy / len) * r; z = qz + (dz / len) * r; }
    if (y > hy - 1e-6) { const R = Math.min(hx, hz) - r; y -= dish * Math.max(0, 1 - (x * x + z * z) / (R * R)); }
    uv[i * 2] = x / w + 0.5; uv[i * 2 + 1] = 0.5 - z / d;
    const s = 1 + (taper - 1) * ((y + hy) / h);
    pos.setXYZ(i, x * s, y, z * s);
  }
  box.deleteAttribute('normal');
  box.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  const g = mergeVertices(box, 1e-5);
  g.computeVertexNormals();
  return g;
}

function legendCanvas(key) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const draw = () => {
    g.clearRect(0, 0, S, S);
    g.fillStyle = key.color; g.fillRect(0, 0, S, S);
    const sheen = g.createLinearGradient(0, 0, 0, S);
    sheen.addColorStop(0, 'rgba(255,255,255,0.07)'); sheen.addColorStop(1, 'rgba(0,0,0,0.08)');
    g.fillStyle = sheen; g.fillRect(0, 0, S, S);
    const glyph = GLYPHS[key.glyph], big = !key.label, size = big ? 250 : 150, cy = big ? S / 2 : S * 0.41;
    g.save();
    g.translate(S / 2 - size / 2, cy - size / 2); g.scale(size / 24, size / 24);
    g.lineWidth = big ? 1.5 : 1.75; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = key.ink; g.fillStyle = key.ink;
    glyph.s.forEach((d) => g.stroke(new Path2D(d)));
    (glyph.f || []).forEach((d) => g.fill(new Path2D(d)));
    g.restore();
    if (key.label) {
      g.fillStyle = key.ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = `600 ${key.label.length > 6 ? 46 : 56}px Onest, "Segoe UI", system-ui, sans-serif`;
      g.fillText(key.label, S / 2, S * 0.7);
    }
    if (key.led) {
      g.save(); g.shadowColor = key.led; g.shadowBlur = 18; g.fillStyle = key.led;
      g.beginPath(); g.arc(S * 0.74, S * 0.26, 11, 0, Math.PI * 2); g.fill(); g.restore();
    }
  };
  draw();
  return { canvas: c, draw };
}

const bubbleVertex = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const bubbleFragment = /* glsl */ `
uniform float uTime; uniform float uOpacity;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
vec3 film(float t){ return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t)); }
void main(){
  vec3 n = normalize(vN); vec3 v = normalize(vV);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float fr = pow(1.0 - ndv, 2.4);
  float swirl = sin(vW.y * 3.1 + uTime * 0.6) * 0.16 + sin(vW.x * 2.3 - uTime * 0.45) * 0.12;
  vec3 col = film(fr * 1.2 + swirl + 0.1);
  vec3 L = normalize(vec3(-0.45, 0.8, 0.6));
  float spec = pow(max(dot(n, normalize(L + v)), 0.0), 120.0) * 1.8;
  vec3 L2 = normalize(vec3(0.8, -0.35, 0.7));
  float spec2 = pow(max(dot(n, normalize(L2 + v)), 0.0), 36.0) * 0.45;
  float a = clamp(fr * 0.85 + 0.03 + spec + spec2, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col * (0.5 + fr * 0.9) + vec3(spec + spec2), a);
}`;

export function createHero({ canvas, host, stage, gsap, onGo, motion = true }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.8;
  pmrem.dispose();

  const keyLight = new DirectionalLight(0xffffff, 1.7); keyLight.position.set(4, 6, 8);
  const rim = new DirectionalLight(0x4d6bff, 3.4); rim.position.set(-7, 3, -5);
  const pink = new PointLight(0xff4fb3, 26, 22, 2); pink.position.set(5.5, -3.5, 3);
  const lime = new PointLight(0xc8ff2e, 9, 16, 2); lime.position.set(-5, -4, 4);
  scene.add(keyLight, rim, pink, lime);

  const world = new Group();
  const cluster = new Group();
  world.add(cluster); scene.add(world);

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const geometry = keycapGeometry();
  const keys = KEYS.map((key, i) => {
    const legend = legendCanvas(key);
    const tex = new CanvasTexture(legend.canvas);
    tex.colorSpace = SRGBColorSpace; tex.anisotropy = maxAniso;
    const material = new MeshPhysicalMaterial({
      map: tex, roughness: key.id === 'code' ? 0.42 : 0.3, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.13, sheen: 0.25, sheenRoughness: 0.5, envMapIntensity: 1,
    });
    const mesh = new Mesh(geometry, material);
    mesh.userData.key = key.id;
    const pivot = new Group(); pivot.add(mesh); cluster.add(pivot);
    const rnd = (n) => (Math.sin((i + 1) * 12.9898 * n) * 43758.5453) % 1;
    return {
      ...key, mesh, pivot, tex, legend, phase: i * 1.37,
      base: { x: 0, y: 0, z: 0, rx: 1.0 + rnd(1) * 0.12, ry: rnd(2) * 0.2, rz: 0 },
      dir: new Vector3(rnd(3) * 1.4 + (i % 2 ? 0.6 : -0.6), 0.6 + Math.abs(rnd(4)), rnd(5)),
      spin: new Vector3(rnd(6) * 2, rnd(7) * 2, rnd(8) * 2),
      hover: 0, hoverT: 0, press: 0, intro: motion ? 0 : 1, jump: 0, visible: true,
    };
  });
  const keyMeshes = keys.map((k) => k.mesh);

  const bubbleMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    vertexShader: bubbleVertex, fragmentShader: bubbleFragment, transparent: true, depthWrite: false,
  });
  const bubbleGeo = new SphereGeometry(1, 48, 32);
  const BUBBLES = [[-0.15, 0.55, 1.4, 0.42], [0.62, 0.15, 0.6, 0.28], [0.86, 0.72, -0.8, 0.55], [-0.62, -0.42, 1.8, 0.2], [0.35, -0.75, 0.9, 0.34], [-0.92, 0.82, -1.2, 0.3]];
  const bubbles = BUBBLES.map(([x, y, z, r], i) => {
    const m = new Mesh(bubbleGeo, bubbleMat);
    m.renderOrder = 2;
    world.add(m);
    return { m, nx: x, ny: y, z, r, phase: i * 2.1, speed: 0.05 + (i % 3) * 0.025, yOff: 0 };
  });

  let hw = 4, hh = 3, tall = false, scroll = 0, t = 0;
  const pointer = new Vector2(), ndc = new Vector2(-9, -9), tilt = new Vector2();
  const raycaster = new Raycaster();
  let hovered = null, running = false, visible = true, raf = 0, last = 0, ready = false;

  // Free horizontal slots to the right of each headline line and of the CTA row, in host pixels.
  function measureSlots(w) {
    const hostR = host.getBoundingClientRect();
    const title = stage.querySelector('.hero-title');
    if (!title) return [];
    const tR = title.getBoundingClientRect();
    const right = w - Math.max(28, w * 0.035);
    const slots = [...title.querySelectorAll('.ht-line')].slice(0, 3).map((line) => {
      const word = line.querySelector('.ht-word') || line;
      return {
        x0: tR.left - hostR.left + word.offsetLeft + word.offsetWidth, x1: right,
        y: tR.top - hostR.top + line.offsetTop + line.offsetHeight * 0.5, h: line.offsetHeight,
      };
    });
    const under = stage.querySelector('.hero-under');
    const last = stage.querySelector('.hero-actions > :last-child');
    if (under && last) {
      const r = last.getBoundingClientRect();
      const ty = gsap ? Number(gsap.getProperty(under, 'y')) || 0 : 0;
      slots[3] = { x0: r.right - hostR.left, x1: right, y: r.top - hostR.top - ty + r.height * 0.5, h: r.height };
    }
    return slots;
  }

  let keyWorld = 1;
  function layoutWide(w, h) {
    const slots = measureSlots(w);
    const pitch = slots[0] ? slots[0].h : h * 0.15;
    const K = MathUtils.clamp(Math.min(pitch * 0.96, w * 0.095, h * 0.2), 58, 168);
    const gapMin = K * 0.3;
    const placed = [];
    let carry = [];
    ROW_PLAN.forEach((ids, i) => {
      const want = [...carry, ...ids];
      carry = [];
      const slot = slots[i];
      if (!slot) { carry = want; return; }
      const avail = slot.x1 - slot.x0 - gapMin;
      const cap = Math.max(0, Math.floor((avail + gapMin) / (K + gapMin)));
      const row = want.slice(0, cap);
      carry = want.slice(cap);
      const n = row.length;
      if (!n) return;
      const gap = n > 1 ? Math.min(K * 0.6, Math.max(gapMin, (avail - n * K) / (n + 0.5))) : 0;
      const total = n * K + (n - 1) * gap;
      const start = slot.x0 + gapMin + Math.max(0, avail - total) * (i === 3 ? 0.5 : 0.42);
      row.forEach((id, j) => placed.push({ id, cx: start + K / 2 + j * (K + gap), cy: slot.y }));
    });
    const dist0 = camera.position.z, ppu0 = h / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * dist0);
    keyWorld = K / ppu0;
    keys.forEach((k) => {
      const p = placed.find((q) => q.id === k.id);
      k.visible = !!p; k.pivot.visible = !!p;
      if (!p) return;
      const [jx, jy, z, rz] = JITTER[k.id] || [0, 0, 0, 0];
      const ppu = h / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * (dist0 - z));
      Object.assign(k.base, {
        x: (p.cx + jx * K - w / 2) / ppu, y: (h / 2 - (p.cy + jy * K)) / ppu, z, rz,
      });
      k.size = keyWorld;
    });
    cluster.position.set(0, 0, 0);
    cluster.scale.setScalar(1);
    return keyWorld;
  }

  function layout() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.6 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    hh = Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z; hw = hh * camera.aspect;
    tall = w < 700 || camera.aspect < 0.9;
    let s;
    if (tall) {
      keys.forEach((k) => {
        const p = LAYOUT_TALL[k.id]; k.visible = !!p; k.pivot.visible = !!p; k.size = 1;
        if (p) Object.assign(k.base, { x: p[0], y: p[1], z: p[2], rz: p[3] });
      });
      // fit the cluster into the free band between the header and the headline
      const ppu0 = h / (2 * hh);
      const title = stage.querySelector('.hero-title');
      const top = (parseFloat(getComputedStyle(stage).paddingTop) || 80) + 4;
      let bottom = h * 0.45;
      if (title) bottom = title.getBoundingClientRect().top - host.getBoundingClientRect().top - 10;
      const band = MathUtils.clamp(bottom - top, h * 0.16, h * 0.6);
      s = Math.min((hw * 1.86) / EXTENT_TALL[0], (band / ppu0) / EXTENT_TALL[1]);
      cluster.position.set(0, (h / 2 - (top + band / 2)) / ppu0, 0);
      cluster.scale.setScalar(s);
    } else {
      s = layoutWide(w, h);
    }
    bubbles.forEach((b, i) => {
      b.visible = !tall || i < 4; b.m.visible = b.visible;
      b.baseX = tall ? b.nx * hw * 0.9 : hw * (0.54 + b.nx * 0.42);
      b.baseY = tall ? hh * 0.4 + b.ny * hh * 0.5 : b.ny * hh * 0.85;
      b.scale = b.r * (tall ? 0.75 : 1) * Math.min(1.2, s * 1.1);
    });
    invalidate();
  }

  function update(dt) {
    const fl = motion ? 1 : 0;
    tilt.x += (pointer.x * 0.14 * fl - tilt.x) * Math.min(1, dt * 4);
    tilt.y += (pointer.y * 0.09 * fl - tilt.y) * Math.min(1, dt * 4);
    world.rotation.y = tilt.x; world.rotation.x = -tilt.y;
    const sc = scroll * scroll * (3 - 2 * scroll);
    world.position.y = sc * hh * 0.35;
    for (const k of keys) {
      if (!k.visible) continue;
      k.hover += (k.hoverT - k.hover) * (motion ? Math.min(1, dt * 12) : 1);
      const iy = (1 - k.intro) * 7, ir = (1 - k.intro) * 1.4, b = k.base;
      k.pivot.position.set(
        b.x + k.dir.x * sc * 4.2,
        b.y + Math.sin(t * 0.9 + k.phase) * 0.08 * fl + iy + k.dir.y * sc * 4 + k.jump * 0.7,
        b.z + k.hover * 0.5 - k.press * 0.32 + k.dir.z * sc * 2.5,
      );
      k.pivot.rotation.set(
        b.rx + Math.sin(t * 0.7 + k.phase) * 0.06 * fl - k.hover * 0.3 + k.spin.x * sc * 2.4 + ir,
        b.ry + Math.cos(t * 0.5 + k.phase) * 0.09 * fl + k.spin.y * sc * 2.4 + k.jump * 0.5,
        b.rz + Math.cos(t * 0.6 + k.phase) * 0.05 * fl + k.spin.z * sc * 2.4 + ir * 0.5,
      );
      k.pivot.scale.setScalar((k.size || 1) * (1 + k.hover * 0.05 - k.press * 0.07));
    }
    bubbleMat.uniforms.uTime.value = t;
    bubbleMat.uniforms.uOpacity.value = 1 - sc * 0.8;
    for (const b of bubbles) {
      if (!b.visible) continue;
      b.yOff += b.speed * dt * fl;
      const span = hh * 2.6, y = ((b.baseY + b.yOff + hh * 1.3) % span + span) % span - hh * 1.3;
      const wob = Math.sin(t * 1.8 + b.phase) * 0.035 * fl;
      b.m.position.set(b.baseX + Math.sin(t * 0.35 + b.phase) * 0.25 * fl, y, b.z);
      b.m.scale.set(b.scale * (1 + wob), b.scale * (1 - wob), b.scale);
    }
  }

  function render() {
    renderer.render(scene, camera);
    if (!ready) { ready = true; stage.classList.add('is-3d'); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    t += dt;
    update(dt); render();
  }
  function start() { if (running || !motion) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function sync() { (visible && motion && !document.hidden) ? start() : stop(); }
  function invalidate() { if (!running) requestAnimationFrame(() => { if (!running) { update(0.016); render(); } }); }

  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(keyMeshes.filter((m) => m.parent.visible), false)[0];
    return hit ? keys.find((k) => k.mesh === hit.object) : null;
  }
  function setHovered(k) {
    if (hovered === k) return;
    if (hovered) hovered.hoverT = 0;
    hovered = k;
    if (k) k.hoverT = 1;
    stage.classList.toggle('is-hover', !!k);
    invalidate();
  }
  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    setHovered(pick(e));
  };
  const onLeave = () => setHovered(null);
  const onWindowMove = (e) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  };
  const onClick = (e) => {
    const k = pick(e);
    if (!k) return;
    press(k);
  };
  function press(k) {
    if (motion && gsap) {
      gsap.timeline()
        .to(k, { press: 1, duration: 0.09, ease: 'power2.in', onUpdate: invalidate })
        .to(k, { press: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)', onUpdate: invalidate });
    }
    if (k.id === 'wave') { wave(); return; }
    setTimeout(() => onGo && onGo(k.id), motion ? 170 : 0);
  }
  function wave() {
    if (!motion || !gsap) return;
    const order = keys.filter((k) => k.visible).sort((a, b) => a.base.x - b.base.x);
    gsap.to(order, { keyframes: [{ jump: 1, duration: 0.22, ease: 'power2.out' }, { jump: 0, duration: 0.55, ease: 'bounce.out' }], stagger: 0.07 });
  }
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', onLeave, { passive: true });
  canvas.addEventListener('click', onClick);
  window.addEventListener('pointermove', onWindowMove, { passive: true });
  const ro = new ResizeObserver(() => layout());
  ro.observe(host);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; sync(); }, { rootMargin: '80px' });
  io.observe(host);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); stage.classList.remove('is-3d'); });

  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layout()).catch(() => {});
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('600 56px Onest'), document.fonts.load('600 46px Onest')]).then(() => {
      keys.forEach((k) => { k.legend.draw(); k.tex.needsUpdate = true; });
      invalidate();
    }).catch(() => {});
  }

  function intro() {
    if (!motion || !gsap) { keys.forEach((k) => { k.intro = 1; }); invalidate(); return; }
    keys.forEach((k) => { k.intro = 0; });
    gsap.to(keys, { intro: 1, duration: 1.5, ease: 'elastic.out(1, 0.62)', stagger: { each: 0.08, from: 'random' }, delay: 0.25 });
  }
  intro();
  sync();
  invalidate();

  return {
    setScroll(p) { scroll = MathUtils.clamp(p, 0, 1); invalidate(); },
    setMotion(on) {
      motion = on;
      if (!on) { keys.forEach((k) => { k.intro = 1; k.jump = 0; k.press = 0; }); tilt.set(0, 0); }
      sync(); invalidate();
    },
    wave,
    press: (id) => { const k = keys.find((x) => x.id === id); if (k) press(k); },
    dispose() {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onWindowMove);
      keys.forEach((k) => { k.tex.dispose(); k.mesh.material.dispose(); });
      geometry.dispose(); bubbleGeo.dispose(); bubbleMat.dispose(); envRT.dispose(); renderer.dispose();
    },
  };
}
