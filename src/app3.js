'use strict';
/* ============================================================
   UIManager y GameEngine (bucle, estados, pantallas)
   ============================================================ */
const MODE_NAMES = { cube: 'Cubo', ship: 'Nave', ufo: 'UFO', wave: 'Wave', ball: 'Ball', spider: 'Spider' };

/* Identificador visual de dificultad: cara que se vuelve más fiera con el rango */
function drawDiffFace(cv, id) {
  const c = cv.getContext('2d'), d = DIFFS[id], r = cv.width / 2, k = r / 28, rank = d.rank;
  c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.translate(r, r + 2 * k); c.lineJoin = 'round'; c.lineCap = 'round';
  if (rank === 5) {
    c.fillStyle = d.color; c.strokeStyle = '#000'; c.lineWidth = 3 * k;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 10 * k, -16 * k); c.lineTo(s * 19 * k, -29 * k); c.lineTo(s * 20 * k, -12 * k); c.closePath(); c.fill(); c.stroke(); }
  }
  c.beginPath(); c.arc(0, 0, 21 * k, 0, Math.PI * 2); c.fillStyle = d.color; c.fill();
  c.lineWidth = 3 * k; c.strokeStyle = '#000'; c.stroke();
  c.fillStyle = '#000'; c.lineWidth = 2.6 * k;
  if (rank === 4) {
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 8 * k, -5 * k, 6 * k, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.stroke(); c.beginPath(); c.arc(s * 8 * k + s * k, -4 * k, 2.4 * k, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill(); }
  } else {
    c.fillRect(-10 * k, -8 * k, 5 * k, 7 * k); c.fillRect(5 * k, -8 * k, 5 * k, 7 * k);
  }
  c.beginPath();
  if (rank <= 1) { c.arc(0, 2 * k, (rank === 0 ? 10 : 8) * k, 0.15 * Math.PI, 0.85 * Math.PI); }
  else if (rank === 2) { c.moveTo(-8 * k, 10 * k); c.lineTo(8 * k, 10 * k); }
  else if (rank === 3) { c.arc(0, 16 * k, 8 * k, 1.15 * Math.PI, 1.85 * Math.PI); }
  else { c.moveTo(-11 * k, 10 * k); for (let i = 0; i < 6; i++) c.lineTo((-11 + (i + 1) * 4.4) * k, (i % 2 ? 10 : 15) * k); }
  c.stroke();
  if (rank >= 3) { c.lineWidth = 3 * k; c.beginPath(); c.moveTo(-14 * k, -13 * k); c.lineTo(-3 * k, -9 * k); c.moveTo(14 * k, -13 * k); c.lineTo(3 * k, -9 * k); c.stroke(); }
  if (rank === 5) { c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 6 * k, 11 * k); c.lineTo(s * 9 * k, 11 * k); c.lineTo(s * 7.5 * k, 17 * k); c.closePath(); c.fill(); c.stroke(); } }
  c.restore();
}

class UIManager {
  constructor(engine) {
    this.eng = engine;
    this.base = $$('.screen');
    this.toastT = null;
    this.modalOpen = false;
    this.pvT = 0;
  }
  show(name) {
    this.base.forEach((s) => { s.hidden = s.id !== 's-' + name; });
    if (name === 'menu') this.renderMenuUser();
    if (name === 'levels') this.renderLevels();
    if (name === 'icons') this.renderIcons();
    if (name === 'settings') this.renderSettings();
    if (name === 'profile') this.renderProfile();
  }
  overlay(name, on) { $('#s-' + name).hidden = !on; }
  hud(on) { $('#hud').hidden = !on; }
  toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }

  modal({ title, html, buttons, onOpen }) {
    const m = $('#modal'), box = $('#modal-box');
    box.innerHTML = `<h2>${esc(title)}</h2><div class="mbody">${html}</div><div class="mbtns"></div>`;
    const bar = $('.mbtns', box);
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.textContent = b.label;
      el.addEventListener('click', () => { if (b.act) b.act(); if (!b.keep) this.closeModal(); });
      bar.appendChild(el);
    });
    m.hidden = false; this.modalOpen = true;
    if (onOpen) onOpen($('.mbody', box));
  }
  closeModal() { $('#modal').hidden = true; this.modalOpen = false; this.eng.focusCanvas(); }

  exportModal(text) {
    this.modal({
      title: 'Exportar nivel (JSON)',
      html: '<p class="hint">Copia el texto y guárdalo donde quieras. Para recuperarlo, pégalo en Importar.</p><textarea id="exp-text" readonly rows="10"></textarea>',
      buttons: [{ label: 'Copiar', keep: true, act: () => {
        const sel = () => { const t = $('#exp-text'); t.focus(); t.select(); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => this.toast('Copiado'), () => { sel(); this.toast('Usa Ctrl+C'); });
        else { sel(); this.toast('Usa Ctrl+C'); }
      } }, { label: 'Cerrar' }],
      onOpen: (box) => { const t = $('#exp-text', box); t.value = text; t.focus(); t.select(); },
    });
  }
  importModal(onData) {
    this.modal({
      title: 'Importar nivel (JSON)',
      html: '<p class="hint">Pega el JSON o elige un archivo.</p><textarea id="imp-text" rows="9" placeholder="{&quot;format&quot;:1,&quot;objs&quot;:[...]}"></textarea><input type="file" id="imp-file" accept=".json,application/json,text/plain"><p id="imp-err" class="err"></p>',
      buttons: [{ label: 'Importar', keep: true, act: () => {
        const v = LevelManager.validate($('#imp-text').value);
        if (!v.ok) { $('#imp-err').textContent = v.error; return; }
        this.closeModal(); onData(v.data);
      } }, { label: 'Cancelar' }],
      onOpen: (box) => {
        $('#imp-file', box).addEventListener('change', (ev) => {
          const f = ev.target.files[0]; if (!f) return;
          if (f.size > 8e6) { $('#imp-err', box).textContent = 'Archivo demasiado grande.'; return; }
          const rd = new FileReader();
          rd.onload = () => { $('#imp-text', box).value = String(rd.result); };
          rd.onerror = () => { $('#imp-err', box).textContent = 'No se pudo leer el archivo.'; };
          rd.readAsText(f);
        });
      },
    });
  }

  /* ----- Menú y perfil ----- */
  renderMenuUser() {
    const p = SaveManager.data.profile, t = SaveManager.totals();
    $('#menu-user').innerHTML = `<span>${esc(p.name)}</span><small>${t.completed} completados · ${t.attempts} intentos</small>`;
  }
  fmtDuration(sec) {
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? `${h} h ${m} min` : m ? `${m} min ${sec % 60} s` : `${sec} s`;
  }
  renderProfile() {
    const p = SaveManager.data.profile, t = SaveManager.totals();
    $('#pf-name').value = p.name; $('#pf-err').textContent = '';
    $('#pf-stats').innerHTML = [
      [t.completed, 'niveles completados'], [t.attempts, 'intentos totales'], [t.deaths, 'muertes'], [this.fmtDuration(t.playTime), 'tiempo de juego'],
    ].map(([v, l]) => `<div><b>${esc(v)}</b><small>${l}</small></div>`).join('');
    const rows = this.eng.allLevelsInfo().map((l) => {
      const pr = SaveManager.progress(l.id);
      return `<div class="row"><span>${esc(l.name)}</span><small style="color:${DIFFS[l.diff].color}">${DIFFS[l.diff].name}</small><div class="meter small"><i style="width:${pr.best}%"></i><b>${pr.completed ? 'Completado' : pr.best + '%'}</b></div></div>`;
    }).join('');
    $('#pf-levels').innerHTML = rows || '<p class="hint">Aún no hay niveles.</p>';
  }

  /* ----- Selección de niveles ----- */
  fmtTime(t) { const m = Math.floor(t / 60); return m + ':' + (t - m * 60).toFixed(1).padStart(4, '0'); }
  levelModes(data) {
    const set = [data.mode];
    for (const o of data.objs) {
      const d = ObjectFactory.DEFS[o[0]];
      if (d.mode && !set.includes(d.mode)) set.push(d.mode);
    }
    return set;
  }
  levelCard(data, num) {
    const builtin = !!data.builtin, id = data.id, pr = SaveManager.progress(id), d = DIFFS[data.diff];
    let maxX = 0, endX = null;
    for (const o of data.objs) { maxX = Math.max(maxX, o[1]); if (o[0] === 'end') endX = o[1]; }
    const len = Math.round(endX === null ? maxX + 10 : endX), secs = Math.round(len * CFG.UNIT / CFG.SPEED);
    const stars = '<b>' + '★'.repeat(d.rank + 1) + '</b><i>' + '★'.repeat(5 - d.rank) + '</i>';
    const chips = this.levelModes(data).map((m) => `<span class="chip" style="border-color:${MODE_COLORS[m]}">${MODE_NAMES[m]}</span>`).join('');
    const acts = builtin
      ? `<button data-do="play" data-id="${esc(id)}" class="go">Jugar</button><button data-do="copy" data-id="${esc(id)}">Copiar al editor</button>`
      : `<button data-do="play" data-id="${esc(id)}" class="go">Jugar</button><button data-do="edit" data-id="${esc(id)}">Editar</button><button data-do="export" data-id="${esc(id)}">Exportar</button><button data-do="del" data-id="${esc(id)}" class="danger">Borrar</button>`;
    return `<article class="card lvl" style="--dc:${d.color}">
      <canvas class="face" width="64" height="64" data-diff="${data.diff}" aria-label="${d.name}"></canvas>
      <div class="lvl-main">
        <div class="card-top"><h3>${num ? 'Nivel ' + num + ' · ' : ''}${esc(data.name)}</h3><b class="diff" style="color:${d.color}">${d.name}</b></div>
        <p class="hint">${esc(data.desc || d.desc)}</p>
        <div class="chips"><span class="chip rating" title="Clasificación de dificultad ${d.rank + 1} de 6">${stars}</span>${chips}<span class="chip">${len} bloques · ~${secs} s</span></div>
        <div class="meter"><i style="width:${pr.best}%"></i><b>${pr.completed ? 'Completado' : pr.best + '%'}</b></div>
        <small>${pr.attempts} intentos${pr.bestTime !== null && pr.bestTime !== undefined ? ' · mejor tiempo ' + this.fmtTime(pr.bestTime) : ''} · mejor ${pr.best}% · ${pr.completed ? 'completado' : 'sin completar'}</small>
        <div class="card-btns">${acts}</div>
      </div></article>`;
  }
  renderLevels() {
    const t = SaveManager.totals(), p = SaveManager.data.profile;
    $('#lv-user').innerHTML = `<b>${esc(p.name)}</b> · ${t.completed} niveles completados · ${t.attempts} intentos · ${t.deaths} muertes`;
    let html = this.eng.officials.map((d, i) => this.levelCard(d, i + 1)).join('');
    const mine = Object.values(SaveManager.data.levels);
    html += '<h2 class="sub">Mis niveles</h2>';
    html += mine.length ? mine.map((l) => this.levelCard(l, 0)).join('') : '<p class="hint">Aún no has creado niveles. Usa el editor o importa un JSON.</p>';
    const list = $('#lv-list');
    list.innerHTML = html;
    $$('canvas.face', list).forEach((cv) => drawDiffFace(cv, cv.dataset.diff));
  }

  /* ----- Cubos y colores ----- */
  renderIcons() {
    const ic = SaveManager.data.icon;
    const shapes = $('#icon-shapes');
    shapes.innerHTML = '';
    for (let i = 0; i < SHAPES; i++) {
      const b = document.createElement('button'); b.className = 'shape' + (ic.shape === i ? ' on' : ''); b.dataset.shape = i;
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; b.appendChild(cv);
      shapes.appendChild(b);
    }
    const vbox = $('#icon-variants');
    vbox.innerHTML = VEHICLES.map(([k, label]) => '<div class="lab">Diseño ' + label + '</div><div class="vrow">' +
      Array.from({ length: VARIANTS }, (_, i) => '<button class="vshape" data-veh="' + k + '" data-v="' + i + '"><canvas width="64" height="64"></canvas></button>').join('') + '</div>').join('');
    for (const key of ['c1', 'c2', 'fx']) {
      $('#sw-' + key).innerHTML = COLORS.map((c) => `<button class="sw" data-key="${key}" data-c="${c}" style="background:${c}" aria-label="Color ${c}"></button>`).join('');
    }
    this.refreshColors();
  }
  refreshColors() {
    const ic = SaveManager.data.icon;
    $$('.sw').forEach((b) => b.classList.toggle('on', ic[b.dataset.key].toLowerCase() === b.dataset.c));
    $$('.shape').forEach((b) => b.classList.toggle('on', +b.dataset.shape === ic.shape));
    for (const key of ['c1', 'c2', 'fx']) {
      const pick = $('#pk-' + key), hex = $('#hx-' + key);
      if (document.activeElement !== pick) pick.value = ic[key];
      if (document.activeElement !== hex) { hex.value = ic[key]; hex.classList.remove('bad'); }
    }
    const SIZES = { ship: 25, ufo: 27, wave: 40, ball: 40, spider: 36 };
    $$('.vshape').forEach((b) => {
      const k = b.dataset.veh, i = +b.dataset.v, cv = b.firstChild;
      b.classList.toggle('on', (ic.v[k] | 0) === i);
      const ir = Object.create(Renderer.prototype); ir.ctx = cv.getContext('2d'); ir.time = 0.3; ir.ctx.clearRect(0, 0, 64, 64);
      ir[k](32, 32, SIZES[k], 0, { ...ic, v: { ...ic.v, [k]: i } }, { held: true, vy: 0, run: false, dir: -1 });
    });
    $$('#icon-shapes .shape canvas').forEach((cv, i) => {
      const ir = Object.create(Renderer.prototype); ir.ctx = cv.getContext('2d'); ir.ctx.clearRect(0, 0, 64, 64);
      ir.cube(32, 32, 44, 0, { ...ic, shape: i });
    });
    this.drawPreviews();
  }
  drawPreviews() {
    const ic = SaveManager.data.icon, t = this.eng.renderer.time;
    const specs = {
      cube: (ir) => ir.cube(48, 48, 50, Math.sin(t * 2) * 12, ic),
      ship: (ir) => ir.ship(52, 48, 36, -8 + Math.sin(t * 3) * 6, ic, { held: Math.sin(t * 2) > 0, vy: 0 }),
      ufo: (ir) => ir.ufo(48, 48, 40, Math.sin(t * 2) * 5, ic, { flapT: Math.max(0, Math.sin(t * 3)) }),
      wave: (ir) => ir.wave(48, 48, 56, Math.sin(t * 2.5) > 0 ? -45 : 45, ic),
      ball: (ir) => ir.ball(48, 48, 46, t * 120, ic, { flipT: Math.max(0, Math.sin(t * 2)) }),
      spider: (ir) => ir.spider(48, 48, 48, 0, ic, { run: true, dir: Math.sin(t * 1.5) > 0 ? -1 : 1, flipT: Math.max(0, Math.sin(t * 1.5 + 1.5)) * 0 }),
    };
    for (const m of Object.keys(specs)) {
      const cv = $('#pv-' + m); if (!cv) continue;
      const ir = Object.create(Renderer.prototype); ir.ctx = cv.getContext('2d'); ir.time = t; ir.ctx.clearRect(0, 0, cv.width, cv.height);
      specs[m](ir);
    }
  }
  setColor(key, hex) {
    SaveManager.data.icon[key] = hex.toLowerCase();
    SaveManager.save();
    this.refreshColors();
  }

  /* ----- Ajustes ----- */
  renderSettings() {
    const s = SaveManager.data.settings;
    $('#set-music').value = s.music; $('#set-sfx').value = s.sfx;
    $('#set-particles').checked = s.particles; $('#set-hitboxes').checked = s.hitboxes; $('#set-auto').checked = s.autoRestart; $('#set-decor').checked = s.decor;
    $('#phys-list').innerHTML = PHYS_PARAMS.map((p, i) => {
      const v = getPath(CFG, p.path);
      return `<label class="phys"><span>${esc(p.label)}</span><input type="range" data-i="${i}" min="${p.min}" max="${p.max}" step="${p.step}" value="${v}"><output>${v}</output></label>`;
    }).join('');
    $('#phys-note').hidden = !SaveManager.physicsModified();
  }

  showDeath(attempt, pct, best) {
    $('#death-pct').textContent = pct + '%';
    $('#death-info').textContent = `Intento ${attempt} · mejor ${best}%`;
    this.overlay('death', true);
  }
  showWin(stats) {
    $('#win-stats').innerHTML = `<div><b>${this.fmtTime(stats.time)}</b><small>tiempo</small></div><div><b>${stats.attempts}</b><small>intentos</small></div><div><b>${stats.jumps}</b><small>acciones</small></div>`;
    $('#win-quit').textContent = stats.source === 'editor' ? 'Volver al editor' : 'Niveles';
    this.overlay('win', true);
  }
}

class GameEngine {
  constructor() {
    SaveManager.load();
    this.cv = $('#cv');
    this.renderer = new Renderer(this.cv);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.input = new InputManager();
    this.camera = new Camera();
    this.ui = new UIManager(this);
    this.editor = new LevelEditor(this);
    this.state = 'menu';
    this.play = null;
    this.menuT = 0;
    this.last = performance.now();

    const raw = [Levels.stereoMadness(), OfficialLevels.ufo(), OfficialLevels.wave(), OfficialLevels.ball(), OfficialLevels.demon(), OfficialLevels.changes(), OfficialLevels.spider(), OfficialLevels.gravity()];
    this.officials = raw.map((r) => {
      const v = LevelManager.validate(r);
      if (!v.ok) throw new Error('Nivel oficial inválido: ' + v.error);
      return Object.assign(v.data, { builtin: true });
    });
    this.officials[0].desc = 'Recreación aproximada del primer nivel: cubo, nave y un tramo más rápido.';
    this.officials[0].diff = 'normal';

    this.bind();
    this.applySettings();
    this.ui.show('menu');
    requestAnimationFrame((t) => this.loop(t));
  }
  focusCanvas() { try { this.cv.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
  applySettings() {
    this.particles.enabled = SaveManager.data.settings.particles;
    this.audio.applyVolumes();
  }
  allLevelsInfo() {
    return [...this.officials, ...Object.values(SaveManager.data.levels)];
  }

  /* ----- Eventos ----- */
  bind() {
    const cv = this.cv;
    window.addEventListener('resize', () => this.renderer.resize());
    new ResizeObserver(() => this.renderer.resize()).observe(cv);
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => { this.input.reset(); if (this.state === 'play' && this.play && !this.play.paused) this.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'play' && this.play && !this.play.paused) this.pause(); });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      this.audio.unlock(); this.focusCanvas();
      if (this.state === 'play') this.playPointer(e);
      else if (this.state === 'edit') { e.preventDefault(); this.editor.pointerDown(e); }
    });
    cv.addEventListener('pointermove', (e) => { if (this.state === 'edit') this.editor.pointerMove(e); });
    const up = (e) => {
      if (this.state === 'play') this.input.ptrs.delete(e.pointerId);
      else if (this.state === 'edit') this.editor.pointerUp(e);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { if (this.state === 'edit') { e.preventDefault(); this.editor.wheel(e); } }, { passive: false });
    $('#app').addEventListener('click', (e) => this.onClick(e));
    $('#app').addEventListener('input', (e) => this.onInput(e));
    window.addEventListener('pagehide', () => SaveManager.save());
  }
  playPointer(e) {
    e.preventDefault();
    const pl = this.play;
    if (!pl || pl.paused) return;
    this.input.ptrs.add(e.pointerId);
    if (pl.dead && pl.deadT > 0.15) this.restart();
  }
  isTyping(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }
  onKeyDown(e) {
    if (this.ui.modalOpen) { if (e.key === 'Escape') this.ui.closeModal(); return; }
    if (this.isTyping(e)) {
      if (e.key === 'Escape') e.target.blur();
      if (e.key === 'Enter' && e.target.id === 'pf-name') this.saveProfileName();
      return;
    }
    if (this.state === 'play') {
      const pl = this.play;
      if (InputManager.JUMP_KEYS.has(e.code)) {
        e.preventDefault();
        this.audio.unlock();
        if (pl.paused) return;
        this.input.keys.add(e.code);
        if (!e.repeat && pl.dead && pl.deadT > 0.15) this.restart();
      } else if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat && !pl.dead && !pl.won) { if (pl.paused) this.resume(); else this.pause(); } }
      else if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); if (!pl.paused) this.restart(); }
    } else if (this.state === 'edit') {
      if (this.editor.key(e)) e.preventDefault();
    }
  }
  onKeyUp(e) {
    this.input.keys.delete(e.code);
    if (this.state === 'edit') this.editor.keyUp(e);
  }
  saveProfileName() {
    const r = SaveManager.setName($('#pf-name').value);
    $('#pf-err').textContent = r.ok ? '' : r.error;
    if (r.ok) { $('#pf-name').value = r.name; this.ui.toast('Perfil guardado'); this.ui.renderProfile(); }
  }
  onClick(e) {
    const b = e.target.closest('[data-act],[data-do],.sw,.shape,.vshape');
    if (!b) return;
    this.audio.unlock(); this.audio.click();
    const ui = this.ui;
    if (b.classList.contains('sw')) { ui.setColor(b.dataset.key, b.dataset.c); return; }
    if (b.classList.contains('vshape')) { SaveManager.data.icon.v[b.dataset.veh] = +b.dataset.v; SaveManager.save(); ui.refreshColors(); return; }
    if (b.classList.contains('shape')) { SaveManager.data.icon.shape = +b.dataset.shape; SaveManager.save(); ui.refreshColors(); return; }
    if (b.dataset.do) { this.levelAction(b.dataset.do, b.dataset.id); return; }
    const acts = {
      'go-menu': () => this.openMenu(),
      'go-levels': () => this.openLevels(),
      'go-icons': () => { ui.show('icons'); },
      'go-settings': () => { ui.show('settings'); },
      'go-profile': () => { ui.show('profile'); },
      'save-profile': () => this.saveProfileName(),
      'go-editor': () => this.openEditor(),
      'import-level': () => ui.importModal((d) => {
        if (SaveManager.data.levels[d.id]) d.id = LevelManager.newId();
        SaveManager.saveLevel(d); ui.renderLevels(); ui.toast('Nivel importado');
      }),
      'new-level': () => { this.openEditor(); this.editor.newLevel(); },
      'pause': () => this.pause(),
      'resume': () => this.resume(),
      'restart': () => { if (this.play && !this.play.paused) this.restart(); },
      'pause-restart': () => { this.resume(); this.restart(); },
      'quit': () => this.exitPlay(),
      'retry': () => this.restart(),
      'ed-menu': () => { this.editor.flushSave(); this.openMenu(); },
      'reset-phys': () => { SaveManager.data.settings.physics = {}; SaveManager.applyPhysics(); SaveManager.save(); ui.renderSettings(); },
      'reset-all': () => ui.modal({
        title: 'Borrar todos los datos', html: '<p>Se borrarán niveles, progreso, perfil y ajustes de este navegador.</p>',
        buttons: [{ label: 'Borrar', act: () => { SaveManager.data = SaveManager.defaults(); SaveManager.applyPhysics(); SaveManager.save(); this.applySettings(); ui.renderSettings(); ui.toast('Datos borrados'); } }, { label: 'Cancelar' }],
      }),
    };
    if (acts[b.dataset.act]) acts[b.dataset.act]();
  }
  onInput(e) {
    const t = e.target, s = SaveManager.data.settings;
    if (t.id === 'set-music') { s.music = +t.value; this.audio.applyVolumes(); SaveManager.save(); }
    else if (t.id === 'set-sfx') { s.sfx = +t.value; this.audio.applyVolumes(); SaveManager.save(); }
    else if (t.id === 'set-particles') { s.particles = t.checked; this.applySettings(); SaveManager.save(); }
    else if (t.id === 'set-hitboxes') { s.hitboxes = t.checked; SaveManager.save(); }
    else if (t.id === 'set-auto') { s.autoRestart = t.checked; SaveManager.save(); }
    else if (t.id === 'set-decor') { s.decor = t.checked; SaveManager.save(); }
    else if (t.classList.contains('pick')) this.ui.setColor(t.dataset.key, t.value);
    else if (t.classList.contains('hex')) {
      let v = t.value.trim().replace(/^#/, '');
      if (/^[0-9a-f]{3}$/i.test(v)) v = v.split('').map((ch) => ch + ch).join('');
      const ok = /^[0-9a-f]{6}$/i.test(v);
      t.classList.toggle('bad', !ok);
      if (ok) this.ui.setColor(t.dataset.key, '#' + v);
    } else if (t.dataset.i !== undefined) {
      const p = PHYS_PARAMS[+t.dataset.i];
      SaveManager.setPhysics(p.path, +t.value);
      t.nextElementSibling.textContent = t.value;
      $('#phys-note').hidden = !SaveManager.physicsModified();
    }
  }
  levelAction(act, id) {
    const ui = this.ui;
    const data = this.officials.find((d) => d.id === id) || SaveManager.data.levels[id];
    if (!data) return;
    if (act === 'play') this.startPlay(data, { source: 'level', id });
    else if (act === 'edit') { SaveManager.data.lastEdited = id; SaveManager.save(); this.openEditor(); }
    else if (act === 'export') ui.exportModal(LevelManager.serialize(data));
    else if (act === 'copy') {
      const copy = LevelManager.validate({ ...data, id: LevelManager.newId(), name: data.name + ' (copia)' }).data;
      SaveManager.saveLevel(copy); this.openEditor(); ui.toast('Copia creada en el editor');
    } else if (act === 'del') {
      ui.modal({
        title: 'Borrar nivel', html: `<p>¿Borrar “${esc(data.name)}”? No se puede deshacer.</p>`,
        buttons: [{ label: 'Borrar', act: () => { SaveManager.deleteLevel(id); ui.renderLevels(); } }, { label: 'Cancelar' }],
      });
    }
  }

  /* ----- Navegación ----- */
  openMenu() { this.leavePlay(); this.state = 'menu'; this.ui.show('menu'); }
  openLevels() { this.leavePlay(); this.state = 'menu'; this.ui.show('levels'); }
  openEditor() {
    this.leavePlay(); this.state = 'edit'; this.ui.show('editor');
    this.renderer.resize(); this.editor.open(); this.focusCanvas();
  }
  leavePlay() {
    this.audio.stopMusic(); this.audio.resume(); this.input.reset();
    ['pause', 'death', 'win'].forEach((n) => this.ui.overlay(n, false));
    this.ui.hud(false);
    if (this.play) SaveManager.save();
    this.play = null;
  }

  /* ----- Partida ----- */
  startPlay(data, ctx) {
    this.leavePlay();
    const level = LevelManager.build(data), sim = new Simulation(level);
    this.play = {
      level, sim, stepper: new FixedStepper(sim), source: ctx.source, id: ctx.id,
      record: ctx.source === 'level' && !SaveManager.physicsModified(),
      attempt: 1, paused: false, dead: false, deadT: 0, won: false, winT: 0, trailAcc: 0, ceilVis: 600,
      flapT: 0, flipT: 0, lastHeld: false, lastMode: sim.player.mode, trail: [], saveAcc: 0,
    };
    this.state = 'play'; this.ui.show(null);
    this.ui.hud(true);
    $('#hud-flag').hidden = !SaveManager.physicsModified();
    this.particles.clear();
    this.camera.snap(sim.player.x, sim.player.y, this.camMode(sim.player), this.renderer.viewWidth());
    this.play.ceilVis = isFinite(sim.bounds.ceil) ? sim.bounds.ceil : 600;
    this.audio.unlock(); this.audio.startMusic();
    if (this.play.record) SaveManager.addAttempt(ctx.id);
    this.updateHud();
    this.focusCanvas();
  }
  /* El cubo con gravedad invertida vive bajo techo: la cámara se queda fija como en los modos de techo. */
  camMode(p) { return p.mode === 'cube' && p.gs < 0 ? 'ship' : p.mode; }
  testLevel(data) { this.startPlay(data, { source: 'editor', id: null }); }
  restart() {
    const pl = this.play; if (!pl) return;
    pl.sim.reset(); pl.stepper.reset();
    pl.attempt++; pl.dead = false; pl.deadT = 0; pl.won = false; pl.winT = 0; pl.trailAcc = 0;
    pl.flapT = 0; pl.flipT = 0; pl.trail.length = 0; pl.lastMode = pl.sim.player.mode;
    pl.ceilVis = isFinite(pl.sim.bounds.ceil) ? pl.sim.bounds.ceil : 600;
    ['death', 'win'].forEach((n) => this.ui.overlay(n, false));
    this.particles.clear();
    this.camera.snap(pl.sim.player.x, pl.sim.player.y, this.camMode(pl.sim.player), this.renderer.viewWidth());
    this.audio.startMusic();
    if (pl.record) SaveManager.addAttempt(pl.id);
    this.updateHud();
  }
  pause() {
    const pl = this.play; if (!pl || pl.paused || pl.dead || pl.won) return;
    pl.paused = true; this.input.reset(); this.audio.suspend(); SaveManager.save();
    $('#pause-quit').textContent = pl.source === 'editor' ? 'Volver al editor' : 'Salir al menú de niveles';
    this.ui.overlay('pause', true);
  }
  resume() {
    const pl = this.play; if (!pl || !pl.paused) return;
    pl.paused = false; this.input.reset(); this.audio.resume();
    this.ui.overlay('pause', false); this.focusCanvas();
    this.last = performance.now();
  }
  exitPlay() {
    const src = this.play ? this.play.source : 'level';
    this.leavePlay();
    if (src === 'editor') this.openEditor(); else this.openLevels();
  }
  updateHud() {
    const pl = this.play; if (!pl) return;
    const pct = pl.won ? 100 : Math.floor(pl.sim.progress * 100);
    if (pl.hudPct !== pct) { pl.hudPct = pct; $('#hud-pct').textContent = pct + '%'; $('#hud-fill').style.width = pct + '%'; }
    $('#hud-attempt').textContent = 'Intento ' + pl.attempt;
  }
  handleEvents(pl, ix, iy) {
    const sim = pl.sim, ic = SaveManager.data.icon;
    for (const ev of sim.events) {
      if (ev.type === 'jump') { this.audio.jump(); this.particles.jump(ix + 15, iy, ic.c1); }
      else if (ev.type === 'flap') {
        this.audio.jump(); pl.flapT = 1;
        this.particles.burst(ix + 15, iy + 2, 7, { speed: 110, life: 0.35, size: 4, colors: [ic.fx, '#fff'], g: -150 });
      } else if (ev.type === 'flip') {
        this.audio.portal(); pl.flipT = 1;
        this.particles.add({ x: ix + 15, y: iy + 15, vx: 0, vy: 0, life: 0.4, size: 9, color: ic.fx, shape: 'ring', force: true });
      } else if (ev.type === 'portal') {
        this.audio.portal(); this.particles.portal(ix + 15, iy + 15, MODE_COLORS[ev.mode]);
        pl.trail.length = 0;
      } else if (ev.type === 'gravity') {
        this.audio.portal(); pl.flipT = 1; this.particles.portal(ix + 15, iy + 15, ev.gs < 0 ? '#ffd800' : '#2fa8ff');
      } else if (ev.type === 'boost') {
        this.audio.jump();
        this.particles.burst(ix + 15, iy + 15, 8, { speed: 150, life: 0.35, size: 4, colors: [(ev.pad ? PAD_COLORS : ORB_COLORS)[ev.color], '#fff'], force: true });
      } else if (ev.type === 'speed') this.audio.portal();
      else if (ev.type === 'death') {
        pl.dead = true; pl.deadT = 0;
        this.particles.death(ev.x + 15, ev.y + 15, ic.c1, ic.c2);
        this.audio.death(); this.audio.stopMusic();
        this.camera.shake = 0.3;
        const pct = Math.floor(sim.progress * 100);
        if (pl.source === 'level') { SaveManager.addDeath(); SaveManager.save(); }
        if (pl.record) SaveManager.recordResult(pl.id, pct, false, 0);
        const best = pl.record ? SaveManager.progress(pl.id).best : pct;
        this.ui.showDeath(pl.attempt, pct, best);
      } else if (ev.type === 'win') {
        pl.won = true; pl.winT = 0;
        this.particles.confetti(sim.player.x + 15, sim.player.y + 15);
        this.audio.win(); this.audio.stopMusic();
        if (pl.record) SaveManager.recordResult(pl.id, 100, true, sim.time);
        else SaveManager.save();
      }
    }
    sim.events.length = 0;
  }

  /* ----- Bucle ----- */
  loop(t) {
    const dt = Math.min((t - this.last) / 1000, CFG.MAX_FRAME);
    this.last = t;
    this.renderer.time = t / 1000;
    try {
      if (this.state === 'play' && this.play) this.framePlay(dt);
      else if (this.state === 'edit') { this.editor.render(); }
      else this.frameMenu(dt);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame((n) => this.loop(n));
  }
  frameMenu(dt) {
    this.menuT += dt;
    const r = this.renderer, c = r.ctx, hue = (215 + this.menuT * 5) % 360, th = r.theme(hue);
    const v = { x: this.menuT * 150, y: -60, s: r.h / CFG.VIEW_H };
    r.background(v, hue, 'classic'); r.ground(v, th);
    const ph = (this.menuT * 0.85) % 1, ic = SaveManager.data.icon;
    const hop = Math.max(0, Math.sin(ph * Math.PI * 1.0)) * 60;
    r.cube(r.w * 0.3, r.Y(v, hop + 15), 30 * v.s, ph * 180, ic);
    c.globalAlpha = 1;
    if (!$('#s-icons').hidden) this.ui.drawPreviews();
  }
  framePlay(dt) {
    const pl = this.play, sim = pl.sim, p = sim.player, r = this.renderer;
    if (!pl.paused) {
      if (!pl.dead && !pl.won) {
        pl.stepper.advance(dt, this.input.held);
        this.handleEvents(pl, p.x, p.y);
        this.audio.pump(sim.progress);
        if (pl.source === 'level') {
          SaveManager.addPlayTime(dt);
          pl.saveAcc += dt;
          if (pl.saveAcc > 15) { pl.saveAcc = 0; SaveManager.save(); }
        }
      } else {
        if (pl.dead) {
          pl.deadT += dt;
          if (SaveManager.data.settings.autoRestart && pl.deadT > 1.1) this.restart();
        } else {
          pl.winT += dt;
          if (pl.winT > 1.0 && $('#s-win').hidden) this.ui.showWin({ time: sim.time, attempts: pl.attempt, jumps: sim.stats.jumps, source: pl.source });
        }
        this.audio.pump(sim.progress);
      }
      this.particles.update(dt);
      pl.flapT = Math.max(0, pl.flapT - dt * 4); pl.flipT = Math.max(0, pl.flipT - dt * 2.5);
    }
    const alpha = pl.dead || pl.won ? 1 : pl.stepper.alpha;
    const ix = p.px + (p.x - p.px) * alpha, iy = p.py + (p.y - p.py) * alpha, irot = p.prot + (p.rot - p.prot) * alpha;
    const fdt = pl.paused ? 0 : dt;
    this.camera.update(ix, iy, this.camMode(p), r.viewWidth(), fdt);
    const ceilT = isFinite(sim.bounds.ceil) ? sim.bounds.ceil : 600;
    pl.ceilVis += (ceilT - pl.ceilVis) * (1 - Math.exp(-fdt * 4));
    if (!pl.paused && !pl.dead && !pl.won) this.emitEffects(pl, ix, iy, dt);
    this.updateHud();

    const cam = this.camera;
    const v = r.gameView(cam);
    if (cam.shake > 0) { v.x += (Math.random() - 0.5) * 10 * cam.shake * 3; v.y += (Math.random() - 0.5) * 10 * cam.shake * 3; }
    const lv = pl.level, ic = SaveManager.data.icon;
    const th = r.themeFx(sim.fx, sim.time), bg = th.bg;
    r.bgS = bg[1] / 100; r.bgL = bg[2] / 50;
    r.background(v, bg[0], lv.style);
    r.bgS = 1; r.bgL = 1;
    r.ground(v, th);
    if (pl.ceilVis < 590) r.ceiling(v, th, pl.ceilVis);
    r.objects(v, lv, th);
    if (p.mode === 'wave' && p.alive) r.waveTrail(v, pl.trail, ic);
    if (p.alive && !pl.won) r.player(v, ix, iy, irot, p.mode, ic, { held: this.input.held, vy: p.vy, flapT: pl.flapT, flipT: pl.flipT, dir: p.dir, run: p.onGround, gs: p.gs });
    this.particles.draw(r, v);
    if (SaveManager.data.settings.hitboxes) r.hitboxes(v, lv, sim);
    if (pl.dead && pl.deadT < 0.12) { r.ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - pl.deadT / 0.12)})`; r.ctx.fillRect(0, 0, r.w, r.h); }
  }
  /* Efectos por modo: puramente visuales, no tocan la simulación */
  emitEffects(pl, ix, iy, dt) {
    const p = pl.sim.player, ic = SaveManager.data.icon, held = this.input.held;
    pl.trailAcc += dt * 50;
    while (pl.trailAcc >= 1) {
      pl.trailAcc--;
      if (p.mode === 'ship') this.particles.exhaust(ix - 4, iy + 12, ic.fx, held ? 2 : 1);
      else if (p.mode === 'ufo') { if (Math.random() < 0.5) this.particles.trail(ix + 6, iy + 2, ic.fx); }
      else if (p.mode === 'wave') { if (Math.random() < 0.5) this.particles.trail(ix + 6, iy + 15, ic.fx); }
      else if (p.mode === 'ball' || p.mode === 'spider') { if (p.onGround) this.particles.trail(ix + 4, p.dir < 0 ? iy + 2 : iy + 28, ic.fx); }
      else if (p.onGround) this.particles.trail(ix + 2, iy + 2, ic.c1);
    }
    if (p.mode === 'ship' && held !== pl.lastHeld) {
      this.particles.burst(ix + 2, iy + 12, 6, { speed: 140, life: 0.3, size: 4, colors: [ic.fx, '#fff'] });
    }
    pl.lastHeld = held;
    if (p.mode === 'wave') {
      pl.trail.push({ x: ix + 15, y: iy + 15 });
      if (pl.trail.length > 46) pl.trail.shift();
    } else if (pl.trail.length) pl.trail.length = 0;
  }
}

window.addEventListener('DOMContentLoaded', () => { window.gd = new GameEngine(); });
