/* =========================================================
   GRAVITY FLIP — ACTORS
   player, enemies, power-ups, gate. World-space positions,
   drawn at (worldX - camera.x). Visuals identical to the
   original single-screen build.
   ========================================================= */
(() => {
'use strict';
const GF = window.GF;
const { ctx, W, H, FLOOR_Y, CEILING_Y, rand, irand, clamp, camera, keys, tap } = GF;

// ============================================================
// PLAYER
// ============================================================
const player = GF.player = {
  x: 0, y: 0, vx: 0, vy: 0, w: 30, h: 36,
  onSurface: true, gravDir: 1, facing: 1, flipAnim: 1,
  dashCd: 0, dashTime: 0, dashDir: 1, dashing: false,
  invincible: 0, shield: false, multTime: 0, cape: 0, lives: 3,

  reset(x) {
    this.x = x; this.y = FLOOR_Y; this.vx = 0; this.vy = 0;
    this.gravDir = 1; this.flipAnim = 1; this.onSurface = true;
    this.dashCd = 0; this.dashTime = 0; this.dashing = false;
    this.invincible = 0; this.shield = false; this.multTime = 0;
    this.facing = 1; this.cape = 0; this.lives = 3;
  },
  tryFlip(dir) {
    if (!GF.game.running || GF.game.gameOver) return;
    if (this.gravDir !== dir) {
      this.gravDir = dir; this.onSurface = false;
      this.vy = dir * 60; this.flipAnim = 0;
      const fy = this.gravDir === 1 ? this.y - this.h : this.y + this.h;
      GF.spawnParticles(this.x, fy, {
        n: 10, color: GF.pal().accent, life: 0.5, speedMin: 60, speedMax: 180,
        angle: this.gravDir === 1 ? -Math.PI/2 : Math.PI/2, spread: 1.0, gravity: 0, drag: 3, size: 1.6,
      });
    }
  },
  tryDash() {
    if (!GF.game.running || GF.game.gameOver) return;
    if (this.dashCd > 0 || this.dashing) return;
    let dir = this.facing;
    if (keys['a'] || keys['arrowleft']  || tap.left)  dir = -1;
    if (keys['d'] || keys['arrowright'] || tap.right) dir = +1;
    this.dashing = true; this.dashTime = 0.22; this.dashCd = 1.1; this.dashDir = dir;
    this.invincible = Math.max(this.invincible, 0.22);
    for (let i = 0; i < 14; i++) {
      GF.spawnParticles(this.x - dir * i * 4, this.y - this.h * 0.3, {
        n: 1, color: GF.pal().accent, size: rand(2, 3.6), life: rand(0.18, 0.36),
        speedMin: 0, speedMax: 30, gravity: 0, drag: 4, angle: rand(0, Math.PI*2)
      });
    }
  },
  update(dt) {
    const left  = keys['a'] || keys['arrowleft']  || tap.left;
    const right = keys['d'] || keys['arrowright'] || tap.right;
    const target = (right ? 1 : 0) - (left ? 1 : 0);
    const moveSpeed = 320;
    if (this.dashing) {
      this.vx = this.dashDir * 920;
      this.dashTime -= dt;
      if (this.dashTime <= 0) { this.dashing = false; this.vx *= 0.3; }
      if (Math.random() < 0.7) {
        GF.spawnParticles(this.x, this.y - this.h * 0.4, {
          n: 1, color: GF.pal().accent, size: rand(1.6, 3), life: rand(0.18, 0.32),
          speedMin: 0, speedMax: 20, gravity: 0, drag: 4, angle: Math.PI/2
        });
      }
    } else {
      this.vx += (target * moveSpeed - this.vx) * Math.min(1, dt * 14);
    }
    if (target !== 0 && !this.dashing) this.facing = target;

    const G = 2400;
    this.vy = clamp(this.vy + this.gravDir * G * dt, -1500, 1500);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Horizontal world bounds (set by main: region travel limits)
    this.x = clamp(this.x, GF.bounds.left, GF.bounds.right);

    if (this.gravDir === 1) {
      if (this.y >= FLOOR_Y) {
        this.y = FLOOR_Y; this.vy = 0;
        if (!this.onSurface) { this.onSurface = true;
          GF.spawnParticles(this.x, FLOOR_Y, { n: 8, color: '#3a3247', life: 0.5,
            angle: -Math.PI/2, spread: 0.9, speedMin: 40, speedMax: 140, gravity: 600, drag: 3, size: 2 }); }
      } else this.onSurface = false;
    } else {
      if (this.y <= CEILING_Y) {
        this.y = CEILING_Y; this.vy = 0;
        if (!this.onSurface) { this.onSurface = true;
          GF.spawnParticles(this.x, CEILING_Y, { n: 8, color: '#3a3247', life: 0.5,
            angle: Math.PI/2, spread: 0.9, speedMin: 40, speedMax: 140, gravity: -600, drag: 3, size: 2 }); }
      } else this.onSurface = false;
    }

    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.multTime = Math.max(0, this.multTime - dt);
    if (this.flipAnim < 1) this.flipAnim = Math.min(1, this.flipAnim + dt * 7);
    this.cape += dt * 8;
  },
  bbox() {
    if (this.gravDir === 1) return { x: this.x - this.w/2, y: this.y - this.h, w: this.w, h: this.h };
    return { x: this.x - this.w/2, y: this.y, w: this.w, h: this.h };
  },
  draw() {
    const accent = GF.pal().accent;
    ctx.save();
    ctx.translate(this.x - camera.x, this.y);
    ctx.rotate(this.gravDir === 1 ? 0 : Math.PI);
    const squash = this.onSurface && this.flipAnim < 1 ? (1 + 0.3 * (1 - this.flipAnim)) : 1;
    ctx.scale(this.facing, 1 / squash);
    ctx.scale(1, squash);

    if (this.onSurface) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 2, 18, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    const visible = this.invincible <= 0 || Math.floor(this.invincible * 18) % 2 === 0;
    if (!visible) { ctx.restore(); this.drawDashCd(); return; }

    const cloakSway = Math.sin(this.cape) * 2;
    ctx.fillStyle = '#0c0d1c';
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.quadraticCurveTo(-18 + cloakSway, -8, -16 + cloakSway, -2);
    ctx.lineTo(-8, -2); ctx.lineTo(-8, -14); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#101226';
    ctx.beginPath();
    ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.lineTo(8, -18); ctx.lineTo(-8, -18);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#181a30';
    ctx.beginPath(); ctx.ellipse(0, -26, 11, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0b18';
    ctx.beginPath(); ctx.ellipse(0, -22, 11, 4, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#181a30';
    ctx.beginPath(); ctx.moveTo(-8, -32); ctx.quadraticCurveTo(-12, -40, -6, -36); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -32); ctx.quadraticCurveTo(12, -40, 6, -36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#03040a';
    ctx.fillRect(-7, -28, 14, 4);

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.shield ? '#aff' : accent;
    ctx.fillStyle = this.shield ? '#d8fff8' : '#cffaf3';
    ctx.beginPath(); ctx.arc(-3.5, -26, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.5, -26, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (this.shield) {
      ctx.save();
      ctx.strokeStyle = `rgba(${GF.rgbStr(GF.hexToRgb(accent))}, 0.6)`;
      ctx.lineWidth = 1.6; ctx.shadowBlur = 14; ctx.shadowColor = accent;
      ctx.globalAlpha = 0.65 + 0.35 * Math.sin(performance.now() * 0.005);
      ctx.beginPath(); ctx.arc(0, -18, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (this.dashing) {
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.fillStyle = accent;
      ctx.shadowBlur = 24; ctx.shadowColor = accent;
      ctx.beginPath(); ctx.ellipse(0, -18, 18, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    this.drawDashCd();
  },
  drawDashCd() {
    const accent = GF.pal().accent;
    const bw = 30, bh = 3, yOff = 8;
    const bx = this.x - camera.x - bw/2;
    const by = this.gravDir === 1 ? this.y + yOff : this.y - yOff - bh;
    const pct = this.dashCd > 0 ? 1 - (this.dashCd / 1.1) : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = this.dashCd > 0 ? '#3a8a82' : accent;
    if (this.dashCd === 0) { ctx.shadowBlur = 8; ctx.shadowColor = accent; }
    ctx.fillRect(bx, by, bw * pct, bh);
    ctx.restore();
  },
};

// ============================================================
// ENEMIES
// ============================================================
const enemies = GF.enemies = [];

GF.enemyDef = (type) => ({
  normal:  { w: 30, h: 22, speed: 80,  hp: 1, points: 1, color: '#5b6692', eye: '#ff6e6e', surface: 'floor' },
  ceiling: { w: 30, h: 22, speed: 110, hp: 1, points: 1, color: '#7a4a2f', eye: '#ffb96e', surface: 'ceiling' },
  tank:    { w: 46, h: 34, speed: 60,  hp: 2, points: 3, color: '#6f4ba6', eye: '#d8a8ff', surface: 'either' },
  fast:    { w: 22, h: 16, speed: 220, hp: 1, points: 2, color: '#c2a83a', eye: '#fff5a0', surface: 'either' },
}[type]);

GF.spawnEnemy = () => {
  const depth = GF.game.regionIndex;
  const pool = [['normal', 4], ['ceiling', 3]];
  if (depth >= 1) pool.push(['fast', Math.min(4, depth + 1)]);
  if (depth >= 1) pool.push(['tank', Math.min(3, depth)]);
  const total = pool.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total, type = 'normal';
  for (const [t, w] of pool) { r -= w; if (r <= 0) { type = t; break; } }

  const d = GF.enemyDef(type);
  const surface = d.surface === 'either' ? (Math.random() < 0.5 ? 'floor' : 'ceiling') : d.surface;
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? camera.x - 40 : camera.x + W + 40;
  const dir = fromLeft ? 1 : -1;
  const y = surface === 'floor' ? FLOOR_Y : CEILING_Y;
  const speedScale = 1 + depth * 0.1 + GF.game.wave * 0.015;

  enemies.push({
    type, x, y, dir, w: d.w, h: d.h, vx: dir * d.speed * speedScale,
    hp: d.hp, points: d.points, color: d.color, eye: d.eye, surface,
    wob: rand(0, Math.PI * 2), age: 0, dying: 0, flash: 0,
  });
};

GF.updateEnemies = (dt) => {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.age += dt; e.wob += dt * (e.type === 'fast' ? 14 : 7);
    e.flash = Math.max(0, e.flash - dt);
    if (e.dying > 0) {
      e.dying -= dt;
      e.vy = (e.vy || 0) + (e.surface === 'floor' ? 600 : -600) * dt;
      e.y += e.vy * dt; e.x += e.vx * 0.3 * dt;
      if (e.dying <= 0 || e.y > H + 40 || e.y < -40) enemies.splice(i, 1);
      continue;
    }
    e.x += e.vx * dt;
    if (e.dir > 0 && e.x > camera.x + W + 80) { enemies.splice(i, 1); continue; }
    if (e.dir < 0 && e.x < camera.x - 80)      { enemies.splice(i, 1); continue; }
  }
};

GF.enemyBox = (e) => e.surface === 'floor'
  ? { x: e.x - e.w/2, y: e.y - e.h, w: e.w, h: e.h }
  : { x: e.x - e.w/2, y: e.y, w: e.w, h: e.h };

GF.drawEnemies = () => {
  for (const e of enemies) {
    ctx.save();
    ctx.translate(e.x - camera.x, e.y);
    ctx.scale(e.dir, e.surface === 'ceiling' ? -1 : 1);
    if (e.dying <= 0) {
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 2, e.w * 0.45, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.translate(0, Math.sin(e.wob) * (e.type === 'fast' ? 1.5 : 0.7));
    if (e.type === 'normal') drawCrawler(e, '#1a1d33', '#3a4060', e.eye, false);
    else if (e.type === 'ceiling') drawCrawler(e, '#2a1810', '#5a2d18', e.eye, true);
    else if (e.type === 'tank') drawTank(e);
    else if (e.type === 'fast') drawFast(e);
    ctx.restore();
  }
};

function flashOverlay(e) {
  if (e.flash > 0) {
    ctx.save();
    ctx.globalAlpha = e.flash * 2;
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#fff';
    ctx.fillRect(-e.w, -e.h * 1.5, e.w * 2, e.h * 2);
    ctx.restore();
  }
}
function drawCrawler(e, darkCol, midCol, eyeCol, spiky) {
  ctx.fillStyle = darkCol;
  for (const lx of [-10, -4, 4, 10]) {
    const legPhase = Math.sin(e.wob * 2 + lx) * 2;
    ctx.beginPath(); ctx.moveTo(lx - 2, -1); ctx.lineTo(lx, 4 + Math.abs(legPhase)); ctx.lineTo(lx + 2, -1); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = darkCol;
  ctx.beginPath(); ctx.ellipse(0, -e.h/2, e.w/2, e.h/2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = midCol;
  ctx.beginPath(); ctx.ellipse(-2, -e.h * 0.65, e.w * 0.36, e.h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  if (spiky) {
    ctx.fillStyle = darkCol;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 7 - 2, -e.h + 2); ctx.lineTo(i * 7, -e.h - 6); ctx.lineTo(i * 7 + 2, -e.h + 2); ctx.closePath(); ctx.fill();
    }
  }
  ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = eyeCol; ctx.fillStyle = eyeCol;
  ctx.beginPath(); ctx.arc(e.w/2 - 8, -e.h/2 - 1, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.w/2 - 8, -e.h/2 + 3, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  flashOverlay(e);
}
function drawTank(e) {
  ctx.fillStyle = '#1e1330';
  for (let i = -2; i <= 2; i++) { const lx = i * 7; ctx.fillRect(lx - 2, -1, 4, 6 + Math.abs(Math.sin(e.wob * 1.5 + lx) * 2)); }
  ctx.fillStyle = '#1e1330';
  ctx.beginPath(); ctx.ellipse(0, -e.h/2, e.w/2, e.h/2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a275c';
  ctx.beginPath(); ctx.ellipse(0, -e.h * 0.7, e.w * 0.42, e.h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-e.w * 0.2, -e.h * 0.55); ctx.lineTo(e.w * 0.1, -e.h * 0.85); ctx.lineTo(e.w * 0.25, -e.h * 0.6); ctx.stroke();
  ctx.fillStyle = '#1e1330';
  ctx.beginPath(); ctx.moveTo(-e.w * 0.35, -e.h); ctx.lineTo(-e.w * 0.45, -e.h - 8); ctx.lineTo(-e.w * 0.25, -e.h - 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(e.w * 0.35, -e.h); ctx.lineTo(e.w * 0.45, -e.h - 8); ctx.lineTo(e.w * 0.25, -e.h - 2); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = e.eye; ctx.fillStyle = e.eye;
  ctx.beginPath(); ctx.arc(e.w/2 - 12, -e.h/2 - 2, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e.w/2 - 12, -e.h/2 + 4, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (e.hp < 2) { ctx.fillStyle = '#0a0612'; ctx.beginPath(); ctx.arc(-e.w * 0.1, -e.h * 0.5, 3, 0, Math.PI * 2); ctx.fill(); }
  flashOverlay(e);
}
function drawFast(e) {
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = e.eye; ctx.shadowBlur = 12; ctx.shadowColor = e.eye;
  ctx.beginPath(); ctx.ellipse(-10, -e.h/2, e.w/2 + 2, e.h/2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#3a3210';
  ctx.beginPath(); ctx.ellipse(0, -e.h/2, e.w/2, e.h/2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9c8a2a';
  ctx.beginPath(); ctx.ellipse(-1, -e.h * 0.7, e.w * 0.4, e.h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3210';
  ctx.beginPath(); ctx.moveTo(e.w/2 - 2, -e.h * 0.4); ctx.lineTo(e.w/2 + 6, -e.h * 0.5); ctx.lineTo(e.w/2 - 2, -e.h * 0.7); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = e.eye; ctx.fillStyle = e.eye;
  ctx.beginPath(); ctx.arc(e.w/2 - 6, -e.h/2, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  flashOverlay(e);
}

// ============================================================
// POWER-UPS
// ============================================================
const powerups = GF.powerups = [];
const POWERUP_TYPES = ['shield', 'mult', 'life'];

GF.spawnPowerup = () => {
  const type = POWERUP_TYPES[irand(0, 2)];
  const x = camera.x + rand(180, W - 180);
  const y = rand(CEILING_Y + 90, FLOOR_Y - 90);
  powerups.push({ type, x, y, age: 0, life: 13, pulse: rand(0, Math.PI * 2), collected: false });
};
GF.updatePowerups = (dt) => {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.age += dt; p.pulse += dt * 3;
    if (p.age > p.life || p.collected) powerups.splice(i, 1);
  }
};
GF.drawPowerups = () => {
  for (const p of powerups) {
    if (p.age > p.life - 2 && Math.floor(p.age * 8) % 2 === 0) continue;
    ctx.save();
    ctx.translate(p.x - camera.x, p.y + Math.sin(p.pulse) * 4);
    const sc = 1 + 0.08 * Math.sin(p.pulse * 2);
    ctx.scale(sc, sc);
    const col = p.type === 'shield' ? '#7df0e3' : p.type === 'mult' ? '#f0c46d' : '#f08aa8';
    ctx.shadowBlur = 22; ctx.shadowColor = col;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    const grd = ctx.createRadialGradient(-3, -3, 1, 0, 0, 14);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.3, col); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#0a0c18';
    if (p.type === 'shield') {
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, -3); ctx.lineTo(5, 2);
      ctx.quadraticCurveTo(5, 6, 0, 7); ctx.quadraticCurveTo(-5, 6, -5, 2); ctx.lineTo(-5, -3); ctx.closePath(); ctx.fill();
    } else if (p.type === 'mult') {
      ctx.font = 'bold 12px Cinzel, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×2', 0, 1);
    } else {
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, -1); ctx.lineTo(3, 6); ctx.lineTo(-3, 6); ctx.lineTo(-5, -1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
};

// ============================================================
// GATE — glowing barrier at region boundary
// ============================================================
GF.drawGate = () => {
  const g = GF.game;
  const gx = g.gateX - camera.x;
  if (gx < -120 || gx > W + 120) return;
  const accent = GF.pal().accent;
  const argb = GF.rgbStr(GF.hexToRgb(accent));
  const open = g.gateOpen;
  const t = performance.now() * 0.001;

  ctx.save();

  // Twin pillars
  const pw = 26;
  ctx.fillStyle = '#05060d';
  ctx.fillRect(gx - pw, CEILING_Y - 6, pw, FLOOR_Y - CEILING_Y + 12);
  ctx.fillRect(gx, CEILING_Y - 6, pw, FLOOR_Y - CEILING_Y + 12);
  // Pillar rune glow
  ctx.save();
  ctx.shadowBlur = 16; ctx.shadowColor = accent;
  ctx.fillStyle = `rgba(${argb}, ${open ? 0.9 : 0.5 + 0.2 * Math.sin(t * 3)})`;
  for (let yy = CEILING_Y + 40; yy < FLOOR_Y - 20; yy += 70) {
    ctx.beginPath(); ctx.arc(gx - pw/2, yy, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(gx + pw/2, yy, 3, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Barrier shimmer
  if (!open) {
    ctx.save();
    const bx = gx + pw/2 - pw/2; // center between pillars ~ gx
    const grad = ctx.createLinearGradient(gx - 8, 0, gx + pw + 8, 0);
    grad.addColorStop(0, `rgba(${argb}, 0)`);
    grad.addColorStop(0.5, `rgba(${argb}, ${0.16 + 0.06 * Math.sin(t * 4)})`);
    grad.addColorStop(1, `rgba(${argb}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(gx - 4, CEILING_Y, pw + 8, FLOOR_Y - CEILING_Y);
    // moving energy lines
    ctx.strokeStyle = `rgba(${argb}, 0.28)`;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 4; k++) {
      const yy = CEILING_Y + ((t * 60 + k * 160) % (FLOOR_Y - CEILING_Y));
      ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + pw, yy + 10); ctx.stroke();
    }
    ctx.restore();

    // Lock label: kills toward quota
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 13px Cinzel, serif';
    ctx.fillStyle = `rgba(${argb}, 0.85)`;
    ctx.shadowBlur = 8; ctx.shadowColor = accent;
    ctx.fillText('SEALED', gx + pw/2, CEILING_Y - 30);
    ctx.font = '600 11px Cinzel, serif';
    ctx.fillStyle = 'rgba(215,211,194,0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText(`${g.killsInRegion} / ${g.gateQuota} SLAIN`, gx + pw/2, CEILING_Y - 14);
    ctx.restore();
  } else {
    // Open: glowing archway invitation
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 13px Cinzel, serif';
    ctx.fillStyle = `rgba(${argb}, ${0.7 + 0.3 * Math.sin(t * 4)})`;
    ctx.shadowBlur = 12; ctx.shadowColor = accent;
    ctx.fillText('▶ ONWARD', gx + pw/2, CEILING_Y - 22);
    ctx.restore();
  }

  ctx.restore();
};

})();
