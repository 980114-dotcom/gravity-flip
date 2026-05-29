/* =========================================================
   GRAVITY FLIP — ENGINE
   namespace, utils, input, camera, regions, palette,
   scrolling background, floor/ceiling, gates, motes,
   particles, floating text.
   Look preserved from the original single-screen build.
   ========================================================= */
(() => {
'use strict';

const GF = window.GF = window.GF || {};

// ---------- Canvas ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 1280, H = 720;
const FLOOR_Y   = H - 92;
const CEILING_Y = 92;

GF.canvas = canvas; GF.ctx = ctx;
GF.W = W; GF.H = H;
GF.FLOOR_Y = FLOOR_Y; GF.CEILING_Y = CEILING_Y;

function fitFrame() {
  const frame = document.getElementById('frame');
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  frame.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fitFrame);
fitFrame();
GF.fitFrame = fitFrame;

// ---------- Utility ----------
const rand  = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
GF.rand = rand; GF.irand = irand; GF.clamp = clamp;

GF.ROMAN = (n) => {
  const map = [['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]];
  let s = '', x = n;
  for (const [r, v] of map) { while (x >= v) { s += r; x -= v; } }
  return s || 'I';
};

function hexToRgb(h) {
  h = h.replace('#','');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbStr(rgb) { return `${rgb[0]|0},${rgb[1]|0},${rgb[2]|0}`; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRgb(a, b, t) { return [lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t)]; }
function lerpHex(a, b, t) { return '#' + lerpRgb(hexToRgb(a), hexToRgb(b), t).map(v => clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join(''); }
GF.hexToRgb = hexToRgb; GF.rgbStr = rgbStr; GF.lerpHex = lerpHex;

// ---------- Input ----------
const keys = {};
const tap  = { left:false, right:false };
GF.keys = keys; GF.tap = tap;

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright',' ','w','a','s','d'].includes(k)) e.preventDefault();
  if (!GF.game.running && !GF.game.gameOver && (k === ' ' || k === 'enter' || k.length === 1)) { GF.startGame(); return; }
  if (GF.game.gameOver && (k === ' ' || k === 'enter' || k === 'r')) { GF.startGame(); return; }
  keys[k] = true;
  if (k === 'w' || k === 'arrowup')    GF.player.tryFlip(-1);
  if (k === 's' || k === 'arrowdown')  GF.player.tryFlip(+1);
  if (k === ' ')                       GF.player.tryDash();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

document.querySelectorAll('.tbtn').forEach(btn => {
  const act = btn.dataset.act;
  const press = (down) => {
    if (act === 'left')  tap.left  = down;
    if (act === 'right') tap.right = down;
    if (down && act === 'up')   GF.player.tryFlip(-1);
    if (down && act === 'down') GF.player.tryFlip(+1);
    if (down && act === 'dash') GF.player.tryDash();
  };
  btn.addEventListener('touchstart', e => { e.preventDefault(); press(true);  }, {passive:false});
  btn.addEventListener('touchend',   e => { e.preventDefault(); press(false); }, {passive:false});
  btn.addEventListener('mousedown',  () => press(true));
  btn.addEventListener('mouseup',    () => press(false));
  btn.addEventListener('mouseleave', () => press(false));
});

// ---------- Camera ----------
const camera = { x: 0 };
GF.camera = camera;

// ---------- Regions ----------
// Each region keeps the SAME structural look; only the palette + enemy mix shifts.
// Region 0 is the EXACT original indigo/teal look.
const REGIONS = [
  { name: 'The Hollow Reach', sky: ['#0a0816','#0b1126','#0a0e22','#070611'],
    glow: '110,190,210', ridgeFar: '#0a1126', ridgeNear: '#070b1c',
    mote: '#a9e9e0', rock: '#070912', accent: '#7df0e3', quota: 12 },

  { name: 'The Ashen Hollows', sky: ['#140d0a','#241410','#1c0f0a','#0d0706'],
    glow: '210,150,90', ridgeFar: '#251510', ridgeNear: '#160b08',
    mote: '#f0c89a', rock: '#0e0908', accent: '#f0a85a', quota: 16 },

  { name: 'The Verdant Rot', sky: ['#0a1410','#0e2418','#0a1c12','#060d09'],
    glow: '120,210,150', ridgeFar: '#0e2418', ridgeNear: '#081610',
    mote: '#a9e9b8', rock: '#070f0a', accent: '#7df0a0', quota: 20 },

  { name: 'The Crimson Deep', sky: ['#16080c','#2a0e16','#1c0a10','#0d0608'],
    glow: '220,90,110', ridgeFar: '#2a0e16', ridgeNear: '#160810',
    mote: '#f0a9bc', rock: '#0f070a', accent: '#f08aa8', quota: 24 },

  { name: 'The Void Below', sky: ['#0c0a16','#150f2a','#0e0a1e','#06050d'],
    glow: '150,120,220', ridgeFar: '#150f2a', ridgeNear: '#0c0816',
    mote: '#c9b8f0', rock: '#08070f', accent: '#b48ce6', quota: 28 },
];
GF.REGIONS = REGIONS;
GF.REGION_W = 3000;

GF.regionDef = (i) => REGIONS[i % REGIONS.length];

// Palette crossfade state
const palState = { from: REGIONS[0], to: REGIONS[0], t: 1 };
GF.palState = palState;

GF.setRegionPalette = (toDef, instant) => {
  palState.from = GF.pal();          // snapshot current blended palette
  palState.to = toDef;
  palState.t = instant ? 1 : 0;
};

GF.updatePalette = (dt) => {
  if (palState.t < 1) palState.t = Math.min(1, palState.t + dt * 0.8);
};

// Returns a fully-resolved (blended) palette object
GF.pal = () => {
  const a = palState.from, b = palState.to, t = palState.t;
  if (t >= 1) return b;
  return {
    name: b.name,
    sky: [0,1,2,3].map(i => lerpHex(a.sky[i], b.sky[i], t)),
    glow: rgbStr(lerpRgb(a.glow.split(',').map(Number), b.glow.split(',').map(Number), t)),
    ridgeFar: lerpHex(a.ridgeFar, b.ridgeFar, t),
    ridgeNear: lerpHex(a.ridgeNear, b.ridgeNear, t),
    mote: lerpHex(a.mote, b.mote, t),
    rock: lerpHex(a.rock, b.rock, t),
    accent: lerpHex(a.accent, b.accent, t),
    quota: b.quota,
  };
};

// ---------- Procedural ridge noise (world-space, scrolls with camera) ----------
function ridgeNoise(x, seed) {
  return Math.sin(seed + x * 0.0042) * 0.5 + Math.sin(seed * 1.7 + x * 0.011) * 0.5;
}

// ---------- Background (drawn each frame, parallax + palette) ----------
GF.drawBackground = () => {
  const p = GF.pal();
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0.00, p.sky[0]);
  grad.addColorStop(0.35, p.sky[1]);
  grad.addColorStop(0.65, p.sky[2]);
  grad.addColorStop(1.00, p.sky[3]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Central glow column
  const glow = ctx.createRadialGradient(W/2, H/2, 60, W/2, H/2, 720);
  glow.addColorStop(0.00, `rgba(${p.glow}, 0.07)`);
  glow.addColorStop(0.55, `rgba(${p.glow}, 0.03)`);
  glow.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Parallax ridges (bottom)
  drawRidge(H * 0.55, 70, p.ridgeFar, 0.6, 0.25, 13.37);
  drawRidge(H * 0.65, 90, p.ridgeNear, 0.7, 0.4, 7.7);
  // Parallax ridges (top, inverted)
  drawRidgeTop(H * 0.45, 60, p.ridgeFar, 0.55, 0.25, 5.5);
  drawRidgeTop(H * 0.34, 80, p.ridgeNear, 0.7, 0.4, 9.9);
};

function drawRidge(yBase, amp, color, alpha, parallax, seed) {
  const off = camera.x * parallax;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, yBase + ridgeNoise(off, seed) * amp);
  for (let sx = 0; sx <= W; sx += 48) {
    const wx = sx + off;
    ctx.lineTo(sx, yBase + ridgeNoise(wx, seed) * amp);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawRidgeTop(yBase, amp, color, alpha, parallax, seed) {
  const off = camera.x * parallax;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, yBase + ridgeNoise(off, seed) * amp);
  for (let sx = 0; sx <= W; sx += 48) {
    const wx = sx + off;
    ctx.lineTo(sx, yBase + ridgeNoise(wx, seed) * amp);
  }
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------- Floor & ceiling (jagged, scrolling) ----------
function edgeY(worldX, base, dir) {
  return base + dir * (Math.sin(worldX * 0.04) * 3 + Math.sin(worldX * 0.13 + 1.7) * 2);
}
GF.drawFloorCeil = () => {
  const p = GF.pal();
  const accent = GF.hexToRgb(p.accent);
  const ar = rgbStr(accent);

  // Floor
  ctx.fillStyle = p.rock;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, edgeY(camera.x, FLOOR_Y, 1));
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, edgeY(sx + camera.x, FLOOR_Y, 1));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${ar}, 0.10)`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 16) { const y = edgeY(sx + camera.x, FLOOR_Y, 1); sx ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); }
  ctx.stroke();

  // Ceiling
  ctx.fillStyle = p.rock;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, edgeY(camera.x, CEILING_Y, -1));
  for (let sx = 0; sx <= W; sx += 16) ctx.lineTo(sx, edgeY(sx + camera.x, CEILING_Y, -1));
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${ar}, 0.10)`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 16) { const y = edgeY(sx + camera.x, CEILING_Y, -1); sx ? ctx.lineTo(sx, y) : ctx.moveTo(sx, y); }
  ctx.stroke();

  // Inner shadows
  const g1 = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 30);
  g1.addColorStop(0, 'rgba(0,0,0,0)'); g1.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g1; ctx.fillRect(0, FLOOR_Y, W, 30);
  const g2 = ctx.createLinearGradient(0, CEILING_Y, 0, CEILING_Y - 30);
  g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g2; ctx.fillRect(0, CEILING_Y - 30, W, 30);
};

// ---------- Stalactites/stalagmites (parallax decor, world-anchored) ----------
GF.drawDecor = () => {
  const p = GF.pal();
  ctx.save();
  ctx.fillStyle = '#06080f';
  ctx.globalAlpha = 0.8;
  const spacing = 210;
  const startIdx = Math.floor((camera.x - 100) / spacing);
  const endIdx   = Math.ceil((camera.x + W + 100) / spacing);
  for (let i = startIdx; i <= endIdx; i++) {
    const seed = Math.sin(i * 12.9898) * 43758.5453;
    const fr = seed - Math.floor(seed);
    const seed2 = Math.sin(i * 78.233) * 12543.123;
    const fr2 = seed2 - Math.floor(seed2);
    const wx = i * spacing + fr * 120;
    const sx = wx - camera.x;
    if (i % 2 === 0) {
      const w = 28 + fr * 46, h = 60 + fr2 * 110;
      ctx.beginPath();
      ctx.moveTo(sx - w/2, CEILING_Y);
      ctx.quadraticCurveTo(sx, CEILING_Y + h * 0.4, sx, CEILING_Y + h);
      ctx.quadraticCurveTo(sx, CEILING_Y + h * 0.4, sx + w/2, CEILING_Y);
      ctx.closePath(); ctx.fill();
    } else {
      const w = 24 + fr * 40, h = 50 + fr2 * 90;
      ctx.beginPath();
      ctx.moveTo(sx - w/2, FLOOR_Y);
      ctx.quadraticCurveTo(sx, FLOOR_Y - h * 0.4, sx, FLOOR_Y - h);
      ctx.quadraticCurveTo(sx, FLOOR_Y - h * 0.4, sx + w/2, FLOOR_Y);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
};

// ---------- Motes ----------
const motes = [];
for (let i = 0; i < 80; i++) {
  motes.push({
    x: rand(0, W), y: rand(CEILING_Y + 20, FLOOR_Y - 20),
    r: rand(0.6, 1.8), vx: rand(-0.06, 0.06), vy: rand(-0.15, 0.05),
    a: rand(0.15, 0.6), pulse: rand(0, Math.PI * 2),
  });
}
GF.updateMotes = (dt) => {
  for (const m of motes) {
    m.x += m.vx * dt * 60; m.y += m.vy * dt * 60; m.pulse += dt * 1.4;
    if (m.y < CEILING_Y + 10) m.y = FLOOR_Y - 20;
    if (m.y > FLOOR_Y - 10)   m.y = CEILING_Y + 20;
    if (m.x < -10) m.x = W + 10;
    if (m.x > W + 10) m.x = -10;
  }
};
GF.drawMotes = () => {
  const p = GF.pal();
  ctx.save();
  ctx.fillStyle = p.mote;
  for (const m of motes) {
    const a = m.a * (0.55 + 0.45 * Math.sin(m.pulse));
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a * 0.25;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
};

// ---------- Particles ----------
const particles = [];
GF.particles = particles;
GF.spawnParticles = (x, y, opts) => {
  const n = opts.n || 12;
  for (let i = 0; i < n; i++) {
    const ang = opts.angle !== undefined
      ? opts.angle + rand(-(opts.spread || 0.7), opts.spread || 0.7)
      : rand(0, Math.PI * 2);
    const sp = rand(opts.speedMin || 60, opts.speedMax || 220);
    const life = opts.life || rand(0.35, 0.75);
    particles.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      life, maxLife: life, size: opts.size || rand(1.5, 3.5),
      color: opts.color || '#7df0e3', gravity: opts.gravity ?? 380,
      drag: opts.drag ?? 2.6, glow: opts.glow ?? true,
    });
  }
};
GF.updateParticles = (dt) => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    p.vx *= 1 - p.drag * dt;
    p.vy *= 1 - p.drag * dt * 0.5;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
};
GF.drawParticles = () => {
  ctx.save();
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = p.glow ? 12 : 0;
    if (p.glow) ctx.shadowColor = p.color;
    ctx.beginPath(); ctx.arc(p.x - camera.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
};

// ---------- Floating text ----------
const floats = [];
GF.floats = floats;
GF.floatText = (txt, x, y, color, big) => {
  floats.push({ txt, x, y, color, life: big ? 1.6 : 0.8, maxLife: big ? 1.6 : 0.8, big: !!big });
};
GF.updateFloats = (dt) => {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= dt; f.y -= (f.big ? 12 : 30) * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
};
GF.drawFloats = () => {
  ctx.save();
  ctx.textAlign = 'center';
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1) * (f.big ? Math.min(1, f.life * 1.4) : 1);
    ctx.font = f.big ? '600 46px Cinzel, serif' : '600 18px Cinzel, serif';
    ctx.fillStyle = f.color;
    ctx.shadowBlur = f.big ? 22 : 8;
    ctx.shadowColor = f.color;
    if (f.big) ctx.letterSpacing = '6px';
    ctx.fillText(f.txt, f.worldFixed ? f.x : f.x - camera.x, f.y);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
};

// ---------- Screen shake ----------
GF.shake = () => {
  const f = document.getElementById('frame');
  f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
};

})();
