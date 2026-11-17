'use strict';
/* ============================================================
   INFRAESTRUCTURA: utilidades, SaveManager, AudioManager,
   ParticleSystem, InputManager, Camera, Renderer
   ============================================================ */
const U = CFG.UNIT;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = ['#7dff00', '#00e5ff', '#ffd800', '#ff2fb3', '#ff6a00', '#ff2d2d', '#a24bff', '#2f6bff', '#ffffff', '#00ffa8', '#ffb3e6', '#9aa4b2'];
const SHAPES = 6;
const VARIANTS = 6;
const VEHICLES = [['ship', 'de la nave'], ['ufo', 'del UFO'], ['wave', 'del wave'], ['ball', 'de la ball'], ['spider', 'de la spider']];
const PHYS_PARAMS = [
  { path: ['CUBE', 'gravity'], label: 'Gravedad del cubo (u/s²)', min: 1500, max: 6000, step: 10 },
  { path: ['CUBE', 'jump'], label: 'Impulso de salto (u/s)', min: 300, max: 1100, step: 5 },
  { path: ['CUBE', 'maxFall'], label: 'Velocidad máx. de caída (u/s)', min: 300, max: 1600, step: 10 },
  { path: ['UFO', 'jump'], label: 'UFO: impulso (u/s)', min: 250, max: 800, step: 5 },
  { path: ['UFO', 'gravity'], label: 'UFO: gravedad (u/s²)', min: 1000, max: 4500, step: 10 },
  { path: ['BALL', 'gravity'], label: 'Ball: gravedad (u/s²)', min: 1200, max: 6000, step: 10 },
  { path: ['WAVE', 'size'], label: 'Wave: tamaño de colisión (u)', min: 8, max: 30, step: 1 },
  { path: ['SPEED'], label: 'Velocidad horizontal (u/s)', min: 150, max: 600, step: 1 },
  { path: ['SHIP', 'up'], label: 'Nave: aceleración al pulsar (u/s²)', min: 800, max: 5000, step: 10 },
  { path: ['SHIP', 'down'], label: 'Nave: aceleración al soltar (u/s²)', min: 800, max: 5000, step: 10 },
  { path: ['SHIP', 'maxUp'], label: 'Nave: velocidad máx. de subida (u/s)', min: 150, max: 900, step: 5 },
  { path: ['SHIP', 'maxDown'], label: 'Nave: velocidad máx. de bajada (u/s)', min: 150, max: 900, step: 5 },
];
const getPath = (obj, path) => path.reduce((o, k) => o[k], obj);
const setPath = (obj, path, v) => { const last = path.length - 1; path.slice(0, last).reduce((o, k) => o[k], obj)[path[last]] = v; };

/* ---------- SaveManager ---------- */
const SaveManager = {
  KEY: 'gdweb.v1',
  data: null,
  persistent: true,
  defaults() {
    return {
      settings: { music: 0.7, sfx: 0.8, particles: true, hitboxes: false, autoRestart: true, decor: true, physics: {} },
      icon: { shape: 0, c1: COLORS[0], c2: COLORS[1], fx: COLORS[1], v: { ship: 0, ufo: 0, wave: 0, ball: 0, spider: 0 } },
      profile: { name: 'Jugador', deaths: 0, playTime: 0 },
      progress: {}, levels: {}, lastEdited: null,
    };
  },
  load() {
    const d = this.defaults();
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) { this.persistent = false; }
    let saved = null;
    try { saved = raw ? JSON.parse(raw) : null; } catch (e) { saved = null; }
    if (saved && typeof saved === 'object') {
      Object.assign(d.settings, saved.settings || {});
      if (!d.settings.physics || typeof d.settings.physics !== 'object') d.settings.physics = {};
      if (saved.icon && Number.isInteger(saved.icon.shape) && saved.icon.shape >= 0 && saved.icon.shape < SHAPES) d.icon.shape = saved.icon.shape;
      if (saved.icon && saved.icon.v && typeof saved.icon.v === 'object') {
        for (const [k] of VEHICLES) if (Number.isInteger(saved.icon.v[k]) && saved.icon.v[k] >= 0 && saved.icon.v[k] < VARIANTS) d.icon.v[k] = saved.icon.v[k];
      }
      if (saved.icon && /^#[0-9a-f]{6}$/i.test(saved.icon.c1)) d.icon.c1 = saved.icon.c1;
      if (saved.icon && /^#[0-9a-f]{6}$/i.test(saved.icon.c2)) d.icon.c2 = saved.icon.c2;
      if (saved.icon && /^#[0-9a-f]{6}$/i.test(saved.icon.fx)) d.icon.fx = saved.icon.fx; else d.icon.fx = d.icon.c2;
      if (saved.profile && typeof saved.profile === 'object') {
        const n = this.cleanName(saved.profile.name);
        if (n) d.profile.name = n;
        if (Number.isFinite(saved.profile.deaths) && saved.profile.deaths >= 0) d.profile.deaths = Math.floor(saved.profile.deaths);
        if (Number.isFinite(saved.profile.playTime) && saved.profile.playTime >= 0) d.profile.playTime = saved.profile.playTime;
      }
      if (typeof d.settings.decor !== 'boolean') d.settings.decor = true;
      if (saved.progress && typeof saved.progress === 'object') d.progress = saved.progress;
      if (saved.levels && typeof saved.levels === 'object') {
        for (const id of Object.keys(saved.levels)) {
          const v = LevelManager.validate(saved.levels[id]);
          if (v.ok) d.levels[v.data.id] = v.data;
        }
      }
      if (typeof saved.lastEdited === 'string' && d.levels[saved.lastEdited]) d.lastEdited = saved.lastEdited;
    }
    this.data = d;
    this.applyPhysics();
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); this.persistent = true; }
    catch (e) { this.persistent = false; }
  },
  applyPhysics() {
    for (const p of PHYS_PARAMS) {
      const v = this.data.settings.physics[p.path.join('.')];
      setPath(CFG, p.path, typeof v === 'number' && Number.isFinite(v) ? clamp(v, p.min, p.max) : getPath(CFG_DEFAULTS, p.path));
    }
  },
  cleanName(v) {
    if (typeof v !== 'string') return '';
    return v.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  },
  validateName(v) {
    const n = this.cleanName(v);
    if (!n) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (n.length < 2) return { ok: false, error: 'Usa al menos 2 caracteres.' };
    return { ok: true, name: n };
  },
  setName(v) {
    const r = this.validateName(v);
    if (r.ok) { this.data.profile.name = r.name; this.save(); }
    return r;
  },
  addDeath() { this.data.profile.deaths++; },
  addPlayTime(sec) { this.data.profile.playTime += sec; },
  totals() {
    let attempts = 0, completed = 0;
    for (const id of Object.keys(this.data.progress)) {
      const p = this.data.progress[id];
      attempts += Number.isFinite(p.attempts) ? p.attempts : 0;
      if (p.completed) completed++;
    }
    return { attempts, completed, deaths: this.data.profile.deaths, playTime: this.data.profile.playTime };
  },
  physicsModified() { return PHYS_PARAMS.some((p) => getPath(CFG, p.path) !== getPath(CFG_DEFAULTS, p.path)); },
  setPhysics(path, v) {
    const key = path.join('.');
    if (v === getPath(CFG_DEFAULTS, path)) delete this.data.settings.physics[key]; else this.data.settings.physics[key] = v;
    setPath(CFG, path, v);
    this.save();
  },
  progress(id) { return this.data.progress[id] || { best: 0, attempts: 0, completed: false, bestTime: null }; },
  addAttempt(id) {
    const p = this.progress(id); p.attempts++; this.data.progress[id] = p; this.save();
  },
  recordResult(id, pct, won, time) {
    const p = this.progress(id);
    p.best = Math.max(p.best, pct);
    if (won) { p.completed = true; p.best = 100; p.bestTime = p.bestTime === null ? time : Math.min(p.bestTime, time); }
    this.data.progress[id] = p; this.save();
  },
  saveLevel(levelData) { this.data.levels[levelData.id] = levelData; this.data.lastEdited = levelData.id; this.save(); },
  deleteLevel(id) {
    delete this.data.levels[id]; delete this.data.progress[id];
    if (this.data.lastEdited === id) this.data.lastEdited = null;
    this.save();
  },
};

/* ---------- AudioManager: música y efectos sintetizados (originales) ---------- */
class AudioManager {
  constructor() {
    this.ctx = null; this.master = null; this.musicG = null; this.sfxG = null; this.run = null;
    this.playing = false; this.step = 0; this.t0 = 0; this.noiseBuf = null;
    this.bpm = 140;
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
        this.musicG = this.ctx.createGain(); this.musicG.connect(this.master);
        this.sfxG = this.ctx.createGain(); this.sfxG.connect(this.master);
        const n = this.ctx.sampleRate * 0.5, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = b;
        this.applyVolumes();
      } catch (e) { this.ctx = null; return; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  applyVolumes() {
    if (!this.ctx) return;
    const s = SaveManager.data.settings;
    this.musicG.gain.value = 0.55 * s.music;
    this.sfxG.gain.value = 0.9 * s.sfx;
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }
  startMusic() {
    if (!this.ctx) return;
    this.stopMusic();
    this.run = this.ctx.createGain(); this.run.connect(this.musicG);
    this.playing = true; this.step = 0; this.t0 = this.ctx.currentTime + 0.08;
  }
  stopMusic() {
    this.playing = false;
    if (this.run) {
      const r = this.run, t = this.ctx.currentTime;
      r.gain.cancelScheduledValues(t); r.gain.setValueAtTime(r.gain.value, t); r.gain.linearRampToValueAtTime(0, t + 0.06);
      setTimeout(() => { try { r.disconnect(); } catch (e) { /* ya desconectado */ } }, 120);
      this.run = null;
    }
  }
  pump(progress) {
    if (!this.playing || !this.ctx) return;
    const dur = 60 / this.bpm / 4, now = this.ctx.currentTime;
    while (this.t0 + this.step * dur < now + 0.25) {
      const t = this.t0 + this.step * dur;
      if (t > now - 0.05) this.schedule(this.step, t, progress);
      this.step++;
    }
  }
  tone(type, f0, t, dur, vol, dest, f1, lp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(t, dur, vol, hp, dest) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.02);
  }
  schedule(step, t, prog) {
    const d = this.run; if (!d) return;
    const s = step % 16, bar = Math.floor(step / 16) % 4;
    const roots = [-12, -16, -9, -14], third = [3, 4, 4, 4];
    const rootF = 220 * Math.pow(2, roots[bar] / 12);
    if (s % 4 === 0) this.tone('sine', 150, t, 0.16, 0.9, d, 45);
    if (s === 4 || s === 12) this.noise(t, 0.12, 0.35, 1800, d);
    if (s % 2 === 0) this.noise(t, 0.04, s % 4 === 2 ? 0.16 : 0.08, 7000, d);
    if (s % 2 === 0) this.tone('square', s % 8 === 6 ? rootF : rootF / 2, t, 0.16, 0.22, d, null, 500);
    if (prog > 0.1) {
      const iv = [0, third[bar], 7, 12, 7, third[bar]], n = iv[s % 6];
      this.tone('sawtooth', rootF * 2 * Math.pow(2, n / 12), t, 0.1, 0.07, d, null, 2200);
    }
    if (prog > 0.45 && s % 4 === 0) this.tone('triangle', rootF * 4 * Math.pow(2, (s % 8 ? third[bar] : 7) / 12), t, 0.3, 0.08, d);
  }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  jump() { if (this.ctx) this.tone('triangle', 330, this.now(), 0.12, 0.25, this.sfxG, 620); }
  death() {
    if (!this.ctx) return;
    const t = this.now();
    this.noise(t, 0.35, 0.8, 300, this.sfxG);
    this.tone('sawtooth', 300, t, 0.4, 0.4, this.sfxG, 40, 1200);
  }
  portal() { if (this.ctx) this.tone('sine', 220, this.now(), 0.35, 0.3, this.sfxG, 880); }
  click() { if (this.ctx) this.tone('square', 520, this.now(), 0.05, 0.12, this.sfxG, 780, 3000); }
  win() {
    if (!this.ctx) return;
    const t = this.now();
    [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => this.tone('triangle', 261.6 * Math.pow(2, n / 12), t + i * 0.09, 0.4, 0.3, this.sfxG));
  }
}

/* ---------- ParticleSystem ---------- */
class ParticleSystem {
  constructor() { this.list = []; this.enabled = true; }
  clear() { this.list.length = 0; }
  add(p) {
    if (!this.enabled && !p.force) return;
    if (this.list.length > 700) this.list.shift();
    p.max = p.life; p.rot = p.rot || 0; p.vr = p.vr || 0; p.g = p.g || 0; p.shape = p.shape || 'sq';
    this.list.push(p);
  }
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 200) * (0.3 + Math.random() * 0.9);
      this.add({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (o.life || 0.6) * (0.6 + Math.random() * 0.6),
        size: (o.size || 6) * (0.6 + Math.random() * 0.8), color: o.colors[i % o.colors.length], g: o.g || 0,
        rot: Math.random() * 360, vr: (Math.random() - 0.5) * 600, shape: o.shape, force: o.force,
      });
    }
  }
  death(x, y, c1, c2) { this.burst(x, y, 34, { speed: 380, life: 0.8, size: 8, colors: [c1, c2, '#fff'], g: -500, force: true }); this.add({ x, y, vx: 0, vy: 0, life: 0.45, size: 10, color: '#fff', shape: 'ring', force: true }); }
  jump(x, y, c) { this.burst(x, y, 6, { speed: 90, life: 0.3, size: 4, colors: [c, '#fff'], g: -200 }); }
  trail(x, y, c) { this.add({ x, y, vx: -60 - Math.random() * 40, vy: 20 + Math.random() * 60, life: 0.35, size: 4 + Math.random() * 3, color: c, g: -100 }); }
  exhaust(x, y, c, n) { for (let i = 0; i < n; i++) this.add({ x, y: y + (Math.random() - 0.5) * 8, vx: -140 - Math.random() * 120, vy: (Math.random() - 0.5) * 70, life: 0.35 + Math.random() * 0.2, size: 3 + Math.random() * 3.5, color: Math.random() < 0.4 ? '#fff' : c, g: 0 }); }
  portal(x, y, c) { this.add({ x, y, vx: 0, vy: 0, life: 0.5, size: 12, color: c, shape: 'ring', force: true }); this.burst(x, y, 14, { speed: 160, life: 0.5, size: 5, colors: [c, '#fff'], force: true }); }
  confetti(x, y) {
    const cs = COLORS;
    for (let i = 0; i < 90; i++) this.add({ x: x + (Math.random() - 0.5) * 200, y: y + 20, vx: (Math.random() - 0.5) * 360, vy: 200 + Math.random() * 380, life: 1.6 + Math.random(), size: 5 + Math.random() * 5, color: cs[i % cs.length], g: -420, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 700, force: true });
  }
  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l[i] = l[l.length - 1]; l.pop(); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
  }
  draw(r, v) {
    const c = r.ctx;
    for (const p of this.list) {
      const k = p.life / p.max, sx = r.X(v, p.x), sy = r.Y(v, p.y), sz = p.size * v.s;
      c.globalAlpha = clamp(k * 1.4, 0, 1);
      if (p.shape === 'ring') {
        c.strokeStyle = p.color; c.lineWidth = Math.max(1, 3 * v.s * k);
        c.beginPath(); c.arc(sx, sy, sz * (1 + (1 - k) * 7), 0, Math.PI * 2); c.stroke();
      } else {
        c.fillStyle = p.color;
        c.save(); c.translate(sx, sy); c.rotate(p.rot * Math.PI / 180);
        c.fillRect(-sz / 2, -sz / 2, sz, sz); c.restore();
      }
    }
    c.globalAlpha = 1;
  }
}

/* ---------- InputManager ---------- */
class InputManager {
  constructor() { this.keys = new Set(); this.ptrs = new Set(); }
  get held() { return this.keys.size > 0 || this.ptrs.size > 0; }
  reset() { this.keys.clear(); this.ptrs.clear(); }
}
InputManager.JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

/* ---------- Camera ---------- */
class Camera {
  constructor() { this.x = 0; this.y = -60; this.shake = 0; }
  targetY(py, mode) { return mode !== 'cube' ? -45 : Math.max(-60, py + 30 - 220); }
  snap(px, py, mode, vw) { this.x = px - vw * 0.3; this.y = this.targetY(py, mode); this.shake = 0; }
  update(px, py, mode, vw, dt) {
    this.x = px - vw * 0.3;
    this.y += (this.targetY(py, mode) - this.y) * (1 - Math.exp(-dt * 6));
    this.shake = Math.max(0, this.shake - dt);
  }
}

/* ---------- Renderer ---------- */
class Renderer {
  get am() { return this._am === undefined ? 1 : this._am; }
  set am(v) { this._am = v; }
  constructor(cv) { this.cv = cv; this.ctx = cv.getContext('2d'); this.dpr = 1; this.w = 1; this.h = 1; this.resize(); }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.cv.getBoundingClientRect();
    this.cv.width = Math.max(2, Math.round(r.width * this.dpr));
    this.cv.height = Math.max(2, Math.round(r.height * this.dpr));
    this.w = this.cv.width; this.h = this.cv.height;
  }
  X(v, wx) { return (wx - v.x) * v.s; }
  Y(v, wy) { return this.h - (wy - v.y) * v.s; }
  theme(hue) {
    return { hue, edge: `hsl(${hue},100%,72%)`, ground: `hsl(${hue},60%,14%)`, ground2: `hsl(${hue},60%,10%)`, line: `hsl(${hue},100%,68%)` };
  }
  /* Tema a partir de los canales de color (y sus triggers) en el instante t. */
  themeFx(fx, t) {
    const col = (n) => fx.colorAt(n, t), bg = col('bg'), gr = col('ground'), ln = col('line'), ob = col('obj');
    return { hue: ob[0], bg, obj: ob, edge: this.H(ob, 100, 72), ground: this.H(gr, 60, 14), ground2: this.H(gr, 60, 10), line: this.H(ln, 100, 68), fx, t };
  }
  /* Color hsl con la saturación y claridad relativas del canal ([h, s, l]; 100 y 50 = aspecto base). */
  H(c, s, l) { return `hsl(${c[0]},${s * c[1] / 100}%,${Math.min(100, l * c[2] / 50)}%)`; }
  scale() { return Math.min(this.h / CFG.VIEW_H, this.w / 420); }
  gameView(cam) { return { x: cam.x, y: cam.y, s: this.scale() }; }
  viewWidth() { return this.w / this.scale(); }

  background(v, hue, style) {
    if (style && style !== 'classic' && this['bg_' + style] && SaveManager.data.settings.decor) return this['bg_' + style](v, hue);
    const c = this.ctx, w = this.w, h = this.h;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.hb(hue, 78, 46)); g.addColorStop(1, this.hb(hue, 85, 24));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const step = 96, par = 0.25, k0 = Math.floor(v.x * par / step);
    const cols = Math.ceil(w / (step * v.s)) + 2;
    c.fillStyle = '#fff';
    for (let i = -1; i < cols; i++) {
      const k = k0 + i, sx = (k * step - v.x * par) * v.s;
      for (let j = 0; j < 3; j++) {
        const hh = Math.sin(k * 12.9898 + j * 78.233) * 43758.5453, f = hh - Math.floor(hh);
        const size = (16 + f * 44) * v.s, y = ((f * 997) % 1) * h * 0.9;
        c.globalAlpha = (0.04 + f * 0.07) * this.am;
        c.fillRect(sx + j * 31 * v.s, y, size, size);
      }
    }
    c.globalAlpha = this.am;
  }
  ground(v, th) {
    const c = this.ctx, y = this.Y(v, 0);
    if (y > this.h) return;
    const g = c.createLinearGradient(0, y, 0, this.h);
    g.addColorStop(0, th.ground); g.addColorStop(1, th.ground2);
    c.fillStyle = g; c.fillRect(0, y, this.w, this.h - y);
    c.fillStyle = th.line; c.fillRect(0, y - 1, this.w, Math.max(2, 3 * v.s));
    c.globalAlpha = (0.18) * this.am; c.fillStyle = th.edge;
    const k0 = Math.floor(v.x / U);
    for (let k = k0; k < k0 + this.w / (U * v.s) + 2; k++) {
      const sx = (k * U - v.x) * v.s;
      c.fillRect(sx, y + 6 * v.s, Math.max(1, v.s), this.h - y);
    }
    c.globalAlpha = this.am;
  }
  ceiling(v, th, ceilY) {
    const c = this.ctx, y = this.Y(v, ceilY);
    if (y < 0) return;
    c.fillStyle = th.ground2; c.fillRect(0, 0, this.w, y);
    c.fillStyle = th.line; c.fillRect(0, y, this.w, Math.max(2, 3 * v.s));
    c.globalAlpha = (0.18) * this.am; c.fillStyle = th.edge;
    const k0 = Math.floor(v.x / U);
    for (let k = k0; k < k0 + this.w / (U * v.s) + 2; k++) c.fillRect((k * U - v.x) * v.s, 0, Math.max(1, v.s), y - 6 * v.s);
    c.globalAlpha = this.am;
  }

  objects(v, level, th) {
    const list = level.sorted, vw = this.w / v.s, left = v.x - 9 * U, right = v.x + vw + U;
    let lo = 0, hi = list.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].x * U < left) lo = m + 1; else hi = m; }
    let end = lo;
    while (end < list.length && list[end].x * U <= right) end++;
    const decor = SaveManager.data.settings.decor;
    if (decor) for (let i = lo; i < end; i++) if (list[i].kind === 'deco') this.gameObject(v, list[i], th);
    for (let i = lo; i < end; i++) if (list[i].kind !== 'deco' && list[i].kind !== 'trigger') this.gameObject(v, list[i], th);
  }
  /* Dibuja un objeto aplicando grupo (alpha, toggle, pulso) y canal de color propio. */
  gameObject(v, o, th) {
    const fx = th.fx;
    if (!fx || !fx.active || (!o.groups.length && !o.ch)) return this.object(v, o, th, false);
    if (fx.isOff(o)) return;
    const a = fx.objAlpha(o, th.t);
    if (a <= 0) return;
    let c = o.ch ? fx.colorAt(o.ch, th.t) : th.obj;
    const pu = o.groups.length ? fx.groupPulse(o.groups, th.t) : null;
    if (pu) c = FxUtil.lerp(c, pu.c, pu.k);
    const t2 = c === th.obj ? th : Object.assign({}, th, { edge: this.H(c, 100, 72) });
    const prev = this.am; this.am = prev * a;
    this.object(v, o, t2, false);
    this.am = prev;
  }
  object(v, o, th, editor) {
    const c = this.ctx, s = v.s, d = o.def, lw = Math.max(1, 1.5 * s);
    const x = this.X(v, o.x * U), y = this.Y(v, (o.y + d.h) * U), w = d.w * U * s, h = d.h * U * s;
    switch (d.kind) {
      case 'orb': this.orb(o, x, y, w, h, s); break;
      case 'pad': this.pad(o, x, y, w, h, s); break;
      case 'solid':
        if (o.type !== 'block') { this.solidVariant(o.type, x, y, w, h, th, s, lw); break; }
        c.fillStyle = 'rgba(4,8,26,0.93)'; c.fillRect(x, y, w, h);
        c.strokeStyle = th.edge; c.lineWidth = lw; c.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
        c.globalAlpha = (0.35) * this.am; c.strokeRect(x + w * 0.2, y + h * 0.2, w * 0.6, h * 0.6); c.globalAlpha = this.am;
        break;
      case 'hazard':
        for (let i = 0; i < d.spikes; i++) this.spike(x + i * U * s, this.Y(v, (o.y + 1) * U), U * s, o.rot, th, lw);
        break;
      case 'deco': this.deco(o.type, x, y, w, h, o.rot, th, s, o.x * 1.3 + o.y * 2.1); break;
      case 'portal': this.portal(o, x, y, w, h, s); break;
      case 'marker':
        if (editor) {
          c.strokeStyle = '#00e5ff'; c.fillStyle = 'rgba(0,229,255,.25)'; c.lineWidth = lw * 1.5;
          c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
          c.fillStyle = '#00e5ff'; c.beginPath(); c.moveTo(x + w * 0.3, y + h * 0.25); c.lineTo(x + w * 0.75, y + h / 2); c.lineTo(x + w * 0.3, y + h * 0.75); c.fill();
        }
        break;
      case 'end': this.endGate(v, o, th, editor); break;
      case 'trigger': if (editor) this.triggerIcon(o, x, y, w, h, s); break;
    }
  }
  spike(x, y, size, rot, th, lw) {
    const c = this.ctx;
    c.save(); c.translate(x + size / 2, y + size / 2); c.rotate(rot * Math.PI / 180);
    const h = size / 2;
    c.beginPath(); c.moveTo(-h, h); c.lineTo(0, -h); c.lineTo(h, h); c.closePath();
    c.fillStyle = 'rgba(4,8,26,0.95)'; c.fill();
    c.strokeStyle = th.edge; c.lineWidth = lw * 1.2; c.lineJoin = 'round'; c.stroke();
    c.restore();
  }
  deco(type, x, y, w, h, rot, th, s) {
    const c = this.ctx;
    c.save(); c.globalAlpha = (0.28) * this.am; c.strokeStyle = th.edge; c.fillStyle = th.edge; c.lineWidth = Math.max(1, 2 * s);
    if (type === 'deco_tri') {
      c.translate(x + w / 2, y + h / 2); c.rotate(rot * Math.PI / 180);
      c.beginPath(); c.moveTo(-w / 2, h / 2); c.lineTo(0, -h / 2); c.lineTo(w / 2, h / 2); c.closePath(); c.stroke();
    } else if (type === 'deco_ring') {
      c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.38, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.16, 0, Math.PI * 2); c.fill();
    } else {
      c.fillRect(x + w * 0.2, y, w * 0.22, h); c.fillRect(x + w * 0.58, y + h * 0.2, w * 0.22, h * 0.8);
    }
    c.restore();
  }
  portal(o, x, y, w, h, s) {
    const c = this.ctx, d = o.def, cx = x + w / 2, cy = y + h / 2;
    if (d.mode) {
      const col = d.mode === 'ship' ? '#ff2fb3' : '#7dff00';
      c.fillStyle = col; c.globalAlpha = (0.16) * this.am; c.beginPath(); c.ellipse(cx, cy, w * 0.52, h / 2, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = (0.35) * this.am; c.strokeStyle = col; c.lineWidth = 9 * s; c.beginPath(); c.ellipse(cx, cy, w * 0.42, h / 2 - 4 * s, 0, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = this.am; c.lineWidth = 3.5 * s; c.stroke();
    } else {
      const n = { slow: 1, normal: 2, fast: 3, faster: 4 }[d.speed];
      const col = { slow: '#ffb000', normal: '#00e5ff', fast: '#7dff00', faster: '#ff2fb3' }[d.speed];
      c.fillStyle = col; c.globalAlpha = (0.14) * this.am; c.fillRect(x, y, w, h); c.globalAlpha = this.am;
      c.strokeStyle = col; c.lineWidth = 3 * s; c.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        const px = x + w * (0.14 + 0.2 * i);
        c.beginPath(); c.moveTo(px, cy - h * 0.22); c.lineTo(px + w * 0.3, cy); c.lineTo(px, cy + h * 0.22); c.stroke();
      }
    }
  }
  endGate(v, o, th, editor) {
    const c = this.ctx, s = v.s, x = this.X(v, o.x * U), w = 2 * U * s;
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0.15)');
    c.fillStyle = g; c.fillRect(x, 0, w, this.h);
    c.fillStyle = '#fff'; c.fillRect(x + w * 0.45, 0, Math.max(2, 4 * s), this.h);
    c.fillStyle = th.edge; c.globalAlpha = (0.7) * this.am;
    const cell = 15 * s;
    for (let yy = 0, i = 0; yy < this.h; yy += cell, i++) c.fillRect(x + (i % 2 ? 0 : cell), yy, cell, cell);
    c.globalAlpha = this.am;
    if (editor) { c.fillStyle = '#fff'; c.font = `${Math.max(10, 12 * s)}px sans-serif`; c.fillText('META', x, this.Y(v, 40)); }
  }
  /* Jugador */
  cube(cx, cy, size, rotDeg, icon) {
    const c = this.ctx, h = size / 2, lw = Math.max(1.5, size * 0.07);
    c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180);
    c.fillStyle = icon.c1; c.fillRect(-h, -h, size, size);
    c.fillStyle = icon.c2; const m = size * 0.2; c.fillRect(-h + m, -h + m, size - 2 * m, size - 2 * m);
    c.strokeStyle = '#000'; c.lineWidth = lw; c.lineJoin = 'miter';
    c.strokeRect(-h + lw / 2, -h + lw / 2, size - lw, size - lw);
    c.fillStyle = '#000'; c.strokeStyle = '#000';
    const u = size / 10;
    switch (icon.shape) {
      case 0: c.fillRect(-3.2 * u, -2 * u, 1.8 * u, 2.6 * u); c.fillRect(1.4 * u, -2 * u, 1.8 * u, 2.6 * u); c.fillRect(-2.6 * u, 2 * u, 5.2 * u, 1.2 * u); break;
      case 1: c.fillRect(-1.5 * u, -1.5 * u, 3 * u, 3 * u); break;
      case 2: c.lineWidth = u * 1.2; c.beginPath(); c.moveTo(-3 * u, 3 * u); c.lineTo(3 * u, -3 * u); c.stroke(); break;
      case 3: c.lineWidth = u * 1.1; c.beginPath(); c.moveTo(-3 * u, -3 * u); c.lineTo(3 * u, 3 * u); c.moveTo(3 * u, -3 * u); c.lineTo(-3 * u, 3 * u); c.stroke(); break;
      case 4: c.lineWidth = u * 1.1; c.beginPath(); c.arc(0, 0, 2.6 * u, 0, Math.PI * 2); c.stroke(); break;
      default: c.fillRect(-3.2 * u, -2.4 * u, 6.4 * u, 1 * u); c.fillRect(-3.2 * u, -0.5 * u, 6.4 * u, 1 * u); c.fillRect(-3.2 * u, 1.4 * u, 6.4 * u, 1 * u);
    }
    c.restore();
  }
  ship(cx, cy, size, rotDeg, icon) {
    const c = this.ctx, k = size / 30, lw = Math.max(1.5, 2 * k);
    c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k, k);
    c.lineJoin = 'round'; c.strokeStyle = '#000'; c.lineWidth = lw / k;
    c.fillStyle = icon.c1; c.fillRect(-4, -15, 16, 16); c.strokeRect(-4, -15, 16, 16);
    c.fillStyle = icon.c2; c.fillRect(-1, -12, 10, 10);
    c.fillStyle = '#000'; c.fillRect(1, -9, 2.2, 3.6); c.fillRect(5.4, -9, 2.2, 3.6);
    c.beginPath(); c.moveTo(-22, 8); c.lineTo(-15, -2); c.lineTo(13, -2); c.lineTo(23, 5); c.lineTo(16, 13); c.lineTo(-17, 13); c.closePath();
    c.fillStyle = icon.c2; c.fill(); c.stroke();
    c.fillStyle = icon.c1; c.fillRect(-13, 5, 22, 3);
    c.restore();
  }
  player(v, x, y, rot, mode, icon) {
    const cx = this.X(v, x + 15), cy = this.Y(v, y + 15), size = 30 * v.s;
    if (mode === 'ship') this.ship(cx, cy, size, rot, icon); else this.cube(cx, cy, size, rot, icon);
  }
  hitboxes(v, level, sim) {
    const c = this.ctx, vw = this.w / v.s;
    c.lineWidth = Math.max(1, v.s);
    const col = { solid: '#4aa3ff', hazard: '#ff3b3b', portal: '#6dff6d', orb: '#ffd800', pad: '#ff9f2e' };
    for (const o of level.sorted) {
      if (!o.rects.length || o.x * U > v.x + vw + U) continue;
      if (o.x * U + o.def.w * U < v.x - U) continue;
      c.strokeStyle = col[o.kind];
      for (const r of o.rects) c.strokeRect(this.X(v, r.x), this.Y(v, r.y + r.h), r.w * v.s, r.h * v.s);
    }
    const p = sim.player;
    const pr = p.rect(); c.strokeStyle = '#fff'; c.strokeRect(this.X(v, pr.x), this.Y(v, pr.y + pr.h), pr.w * v.s, pr.h * v.s);
    const i = p.inner(); c.strokeStyle = '#ffd800'; c.strokeRect(this.X(v, i.x), this.Y(v, i.y + i.h), i.w * v.s, i.h * v.s);
  }
}
