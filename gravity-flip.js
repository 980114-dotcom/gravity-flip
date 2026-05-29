/* =========================================================
   GRAVITY FLIP — MAIN
   game state, region/gate progression, camera, spawning,
   collisions, HUD, main loop.
   ========================================================= */
(() => {
'use strict';
const GF = window.GF;
const { ctx, W, H, FLOOR_Y, CEILING_Y, rand, clamp, camera, player, ROMAN } = GF;

const REGION_W = GF.REGION_W;

GF.bounds = { left: 0, right: REGION_W };

const game = GF.game = {
  running: false, gameOver: false,
  score: 0,
  regionIndex: 0,
  regionStart: 0, gateX: REGION_W,
  killsInRegion: 0, gateQuota: 12, gateOpen: false,
  spawnTimer: 1, powerupTimer: 8,
  elapsed: 0, wave: 0,
  deepest: 0,
};

// ---------- Start / restart ----------
GF.startGame = () => {
  game.running = true; game.gameOver = false;
  game.score = 0; game.regionIndex = 0;
  game.regionStart = 0; game.gateX = REGION_W;
  game.killsInRegion = 0; game.gateOpen = false;
  game.gateQuota = GF.regionDef(0).quota;
  game.spawnTimer = 1.0; game.powerupTimer = 8;
  game.elapsed = 0; game.wave = 0; game.deepest = 0;

  GF.enemies.length = 0; GF.powerups.length = 0;
  GF.particles.length = 0; GF.floats.length = 0;

  GF.setRegionPalette(GF.regionDef(0), true);
  GF.bounds.left = game.regionStart + 24;
  GF.bounds.right = game.gateX - 40;

  player.reset(game.regionStart + 380);
  GF.updateCamera(true);

  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('startBtn').blur();
  showRegionBanner();
  updateLivesUI();
  updateHUD();
};

function showRegionBanner() {
  const def = GF.regionDef(game.regionIndex);
  const accent = def.accent;
  GF.floats.push({ txt: `REGION ${ROMAN(game.regionIndex + 1)}`, x: W/2, y: H/2 - 18,
    color: accent, life: 2.6, maxLife: 2.6, big: true, worldFixed: true });
  GF.floats.push({ txt: def.name, x: W/2, y: H/2 + 30,
    color: '#d7d3c2', life: 2.6, maxLife: 2.6, big: false, worldFixed: true });
}

function advanceRegion() {
  game.regionIndex++;
  game.deepest = Math.max(game.deepest, game.regionIndex);
  game.regionStart = game.gateX;
  game.gateX = game.regionStart + REGION_W;
  game.killsInRegion = 0;
  game.gateOpen = false;
  const def = GF.regionDef(game.regionIndex);
  game.gateQuota = def.quota + Math.floor(game.regionIndex / GF.REGIONS.length) * 6;
  GF.setRegionPalette(def, false);
  GF.bounds.left = game.regionStart + 24;
  GF.bounds.right = game.gateX - 40;
  showRegionBanner();
  GF.shake();
}

function openGate() {
  game.gateOpen = true;
  GF.bounds.right = game.gateX + 280;
  const accent = GF.pal().accent;
  GF.floats.push({ txt: 'THE WAY OPENS', x: W/2, y: 150,
    color: accent, life: 2.0, maxLife: 2.0, big: false, worldFixed: true });
  // burst at gate
  GF.spawnParticles(game.gateX, (FLOOR_Y + CEILING_Y) / 2, {
    n: 30, color: accent, life: 1.0, speedMin: 60, speedMax: 280,
    angle: rand(0, Math.PI*2), spread: Math.PI, gravity: 0, drag: 2, size: 2.6 });
  GF.shake();
}

// ---------- Game over ----------
function endGame() {
  game.running = false; game.gameOver = true;
  for (let i = 0; i < 40; i++) {
    GF.spawnParticles(player.x, player.y - player.h * 0.4, {
      n: 1, color: i % 3 === 0 ? '#f08aa8' : GF.pal().accent, size: rand(2, 4),
      life: rand(0.6, 1.2), speedMin: 80, speedMax: 320, angle: rand(0, Math.PI*2), gravity: 200, drag: 1.6 });
  }
  GF.shake();
  setTimeout(() => {
    if (!game.gameOver) return;   // a restart happened; ignore stale timer
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('finalWave').textContent = ROMAN(game.deepest + 1);
    document.getElementById('ovEyebrow').textContent = 'The cavern claims another';
    document.getElementById('ovTitle').textContent = 'Lost to the Dark';
    document.getElementById('ovTag').textContent = 'Your soul scatters into the deep. Try again.';
    document.getElementById('ovStats').style.display = 'grid';
    document.querySelector('#ovStats .stat:last-child .stat-label').textContent = 'Deepest region';
    document.getElementById('startBtn').textContent = 'Descend Again';
    document.getElementById('ovFoot').textContent = '— press space to return —';
    document.getElementById('overlay').classList.remove('hidden');
  }, 600);
}

document.getElementById('startBtn').addEventListener('click', GF.startGame);

// ---------- Camera ----------
GF.updateCamera = (instant) => {
  const targetX = clamp(player.x - W * 0.42, game.regionStart - 30, 1e9);
  if (instant) camera.x = targetX;
  else camera.x += (targetX - camera.x) * 0.12;
  if (camera.x < game.regionStart - 30) camera.x = game.regionStart - 30;
};

// ---------- HUD ----------
function updateLivesUI() {
  const wrap = document.getElementById('lives');
  wrap.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'life' + (i >= player.lives ? ' lost' : '');
    wrap.appendChild(d);
  }
}
GF.updateLivesUI = updateLivesUI;

function updateHUD() {
  document.getElementById('score').textContent = game.score;
  document.getElementById('wave').textContent = ROMAN(game.regionIndex + 1);
  const si = document.getElementById('shieldInd');
  si.classList.toggle('on', player.shield);
  const mi = document.getElementById('multInd');
  if (player.multTime > 0) { mi.classList.add('on'); document.getElementById('multT').textContent = player.multTime.toFixed(1); }
  else mi.classList.remove('on');
}

// ---------- Collisions ----------
function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function processCollisions() {
  if (!game.running || game.gameOver) return;
  const pb = player.bbox();
  const enemies = GF.enemies;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dying > 0) continue;
    if (!aabb(pb, GF.enemyBox(e))) continue;
    const eb = GF.enemyBox(e);

    if (player.dashing) { damageEnemy(e, 99); continue; }

    let isStomp = false;
    if (e.surface === 'floor') {
      if (player.gravDir === 1 && player.vy > 60 && player.y <= eb.y + eb.h * 0.55) isStomp = true;
    } else {
      if (player.gravDir === -1 && player.vy < -60 && player.y >= eb.y + eb.h * 0.45) isStomp = true;
    }

    if (isStomp) {
      damageEnemy(e, 1);
      player.vy = player.gravDir === 1 ? -680 : 680;
      player.onSurface = false;
      continue;
    }
    hitPlayer();
    break;
  }

  // power-ups
  const powerups = GF.powerups;
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    const dx = p.x - player.x;
    const dy = p.y - (player.y + (player.gravDir === 1 ? -player.h/2 : player.h/2));
    if (dx*dx + dy*dy < 28*28) {
      applyPowerup(p.type);
      const col = p.type === 'shield' ? '#7df0e3' : p.type === 'mult' ? '#f0c46d' : '#f08aa8';
      GF.spawnParticles(p.x, p.y, { n: 18, color: col, life: 0.7, speedMin: 60, speedMax: 220,
        angle: rand(0, Math.PI*2), spread: Math.PI, gravity: 0, drag: 2.5, size: rand(1.5, 3) });
      p.collected = true;
    }
  }
}

function damageEnemy(e, dmg) {
  e.hp -= dmg; e.flash = 0.15;
  if (e.hp <= 0) {
    const pts = e.points * (player.multTime > 0 ? 2 : 1);
    game.score += pts;
    game.killsInRegion++;
    GF.floatText(`+${pts}`, e.x, e.surface === 'floor' ? e.y - e.h - 4 : e.y + e.h + 14, '#cffaf3');
    const col = e.type === 'normal' ? '#5b6692' : e.type === 'ceiling' ? '#e98a4a' : e.type === 'tank' ? '#b48ce6' : '#f0e36d';
    GF.spawnParticles(e.x, e.surface === 'floor' ? e.y - e.h/2 : e.y + e.h/2, {
      n: 14, color: col, life: rand(0.4, 0.8), speedMin: 60, speedMax: 220,
      angle: rand(0, Math.PI*2), spread: Math.PI, gravity: e.surface === 'floor' ? 500 : -500, drag: 2.2, size: 2.4 });
    e.dying = 0.4; e.vy = e.surface === 'floor' ? -160 : 160;
    if (!game.gateOpen && game.killsInRegion >= game.gateQuota) openGate();
  } else {
    e.vx *= 0.5;
    GF.floatText('!', e.x, e.surface === 'floor' ? e.y - e.h - 4 : e.y + e.h + 14, '#f08aa8');
  }
}

function hitPlayer() {
  if (player.invincible > 0) return;
  if (player.shield) {
    player.shield = false; player.invincible = 1.0;
    GF.spawnParticles(player.x, player.y - player.h/2, { n: 22, color: '#7df0e3', life: 0.8,
      speedMin: 80, speedMax: 260, angle: rand(0, Math.PI*2), spread: Math.PI, gravity: 0, drag: 2.4, size: 2.6 });
    GF.floatText('warded', player.x, player.y - player.h - 8, '#7df0e3'); GF.shake();
    return;
  }
  player.lives--; player.invincible = 1.6;
  updateLivesUI(); GF.shake();
  GF.floatText('—1', player.x, player.y - player.h - 8, '#f08aa8');
  GF.spawnParticles(player.x, player.y - player.h/2, { n: 16, color: '#f08aa8', life: 0.8,
    speedMin: 80, speedMax: 220, angle: rand(0, Math.PI*2), spread: Math.PI, gravity: 0, drag: 2.4, size: 2.4 });
  if (player.lives <= 0) endGame();
}

function applyPowerup(type) {
  if (type === 'shield') { player.shield = true; GF.floatText('warding', player.x, player.y - player.h - 8, '#7df0e3'); }
  else if (type === 'mult') { player.multTime = 8; GF.floatText('×2 souls', player.x, player.y - player.h - 8, '#f0c46d'); }
  else if (type === 'life') {
    if (player.lives < 3) { player.lives++; updateLivesUI(); GF.floatText('+mask', player.x, player.y - player.h - 8, '#f08aa8'); }
    else { game.score += 5; GF.floatText('+5 souls', player.x, player.y - player.h - 8, '#f08aa8'); }
  }
}

// ---------- Spawning & region tick ----------
function updateGameState(dt) {
  if (!game.running || game.gameOver) return;
  game.elapsed += dt;
  game.wave = game.regionIndex * 2 + Math.floor(game.elapsed / 20);

  game.spawnTimer -= dt;
  game.powerupTimer -= dt;

  const interval = Math.max(0.5, 1.5 - game.regionIndex * 0.1 - game.elapsed * 0.004);
  if (game.spawnTimer <= 0) {
    GF.spawnEnemy();
    if (game.regionIndex >= 2 && Math.random() < 0.35) GF.spawnEnemy();
    game.spawnTimer = interval * rand(0.7, 1.3);
  }
  if (game.powerupTimer <= 0) { GF.spawnPowerup(); game.powerupTimer = rand(9, 16); }

  // passage through open gate
  if (game.gateOpen && player.x > game.gateX + 30) advanceRegion();
}

// ---------- Gate progress bar ----------
function drawGateProgress() {
  const w = 200, h = 2, x = W/2 - w/2, y = 60;
  const accent = GF.pal().accent;
  const argb = GF.rgbStr(GF.hexToRgb(accent));
  const pct = clamp(game.killsInRegion / game.gateQuota, 0, 1);
  ctx.save();
  ctx.fillStyle = `rgba(${argb}, 0.12)`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `rgba(${argb}, 0.6)`;
  ctx.shadowBlur = 8; ctx.shadowColor = accent;
  ctx.fillRect(x, y, w * (game.gateOpen ? 1 : pct), h);
  ctx.restore();
}

// ---------- Main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;

  GF.updatePalette(dt);
  GF.drawBackground();
  GF.updateMotes(dt); GF.drawMotes();
  GF.drawDecor();
  GF.drawFloorCeil();

  updateGameState(dt);
  if (game.running && !game.gameOver) player.update(dt);
  GF.updateCamera(false);
  GF.updateEnemies(dt);
  GF.updatePowerups(dt);
  GF.updateParticles(dt);
  GF.updateFloats(dt);

  processCollisions();

  GF.drawPowerups();
  GF.drawGate();
  GF.drawEnemies();
  if (game.running || game.gameOver) player.draw();
  GF.drawParticles();
  GF.drawFloats();
  if (game.running && !game.gameOver) drawGateProgress();

  updateHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame((t) => { last = t; loop(t); });

window.__game = GF;
})();
