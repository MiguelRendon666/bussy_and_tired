'use strict';
/* ============================================================
   LevelEditor: edita los mismos datos que consume el motor.
   ============================================================ */
class LevelEditor {
  constructor(engine) {
    this.eng = engine;
    this.r = engine.renderer;
    this.meta = { id: null, name: 'Mi nivel', mode: 'cube', hue: 215, diff: 'normal', desc: '', speed: 'normal', style: 'classic' };
    this.objs = [];
    this.nextId = 1;
    this.zoom = 1.3;
    this.cam = { x: -40, y: -80 };
    this.tool = 'place';
    this.type = 'block';
    this.rot = 0;
    this.snap = 1;
    this.sel = new Set();
    this.hist = [];
    this.hi = -1;
    this.drag = null;
    this.hover = null;
    this.ptrs = new Map();
    this.pinch = null;
    this.spaceDown = false;
    this.saveTimer = null;
    this.msgTimer = null;
    this.buildPalette();
    this.bindUI();
  }

  /* ----- Datos ----- */
  view() { return { x: this.cam.x, y: this.cam.y, s: this.zoom * this.r.dpr }; }
  mk(type, x, y, rot, props) { return { id: this.nextId++, type, x, y, rot, def: ObjectFactory.DEFS[type], props: props || null }; }
  tuple(o) { return o.props ? [o.type, o.x, o.y, o.rot, o.props] : [o.type, o.x, o.y, o.rot]; }
  load(data) {
    this.meta = { id: data.id, name: data.name, mode: data.mode, hue: data.hue, diff: data.diff || 'normal', desc: data.desc || '', speed: data.speed || 'normal', style: data.style || 'classic' };
    if (data.colors) this.meta.colors = Object.assign({}, data.colors);
    this.nextId = 1;
    this.objs = data.objs.map((a) => this.mk(a[0], a[1], a[2], a[3], this.cloneProps(a[4])));
    this.sel.clear(); this.hist = []; this.hi = -1;
    this.pushHistory();
    this.syncUI();
  }
  newLevel() {
    this.load({ id: LevelManager.newId(), name: 'Mi nivel', mode: 'cube', hue: 215, diff: 'normal', desc: '', speed: 'normal', style: 'classic',
      objs: [['start', 0, 0, 0], ['spike', 20, 0, 0], ['spike2', 32, 0, 0], ['block', 44, 0, 0], ['spike', 46, 0, 0], ['end', 62, 0, 0]] });
    this.cam = { x: -40, y: -80 };
    this.flushSave();
  }
  open() {
    const id = SaveManager.data.lastEdited;
    if (id && SaveManager.data.levels[id]) this.load(SaveManager.data.levels[id]);
    else this.newLevel();
    this.resizeView();
  }
  toData() {
    if (!this.meta.id) this.meta.id = LevelManager.newId();
    const m = this.meta;
    const d = { format: 1, id: m.id, name: m.name, mode: m.mode, hue: m.hue, diff: m.diff, desc: m.desc, speed: m.speed, style: m.style,
      objs: this.objs.map((o) => this.tuple(o)) };
    if (m.colors && Object.keys(m.colors).length) d.colors = m.colors;
    return d;
  }
  snapshot() { return JSON.stringify({ m: this.meta, o: this.objs.map((o) => this.tuple(o)) }); }
  restore(s) {
    const d = JSON.parse(s);
    this.meta = d.m; this.objs = d.o.map((a) => this.mk(a[0], a[1], a[2], a[3], a[4]));
    this.sel.clear(); this.syncUI(); this.scheduleSave();
  }
  updateSuggest() {
    const el = $('#ed-suggest');
    if (!el) return;
    const v = LevelManager.validate(this.toData());
    if (!v.ok) { el.textContent = ''; return; }
    const lv = LevelManager.build(v.data), sg = LevelManager.suggestDifficulty(lv), a = LevelManager.analyze(lv);
    this.suggested = sg;
    el.innerHTML = `Sugerida por el diseño: <b style="color:${DIFFS[sg].color}">${DIFFS[sg].name}</b> <small>(${a.hazards} pinchos, ${a.density.toFixed(1)} por 100 bloques, ${a.tightPct.toFixed(1)}% estrecho)</small> <button id="ed-apply-suggest">Aplicar</button>`;
    $('#ed-apply-suggest').onclick = () => { this.meta.diff = this.suggested; $('#ed-diff').value = this.suggested; this.pushHistory(); this.scheduleSave(); };
  }
  pushHistory() {
    this.hist = this.hist.slice(0, this.hi + 1);
    this.hist.push(this.snapshot());
    if (this.hist.length > 120) this.hist.shift();
    this.hi = this.hist.length - 1;
  }
  commit() { this.pushHistory(); this.scheduleSave(); this.renderProps(); this.updateSuggest(); }
  undo() { if (this.hi > 0) { this.hi--; this.restore(this.hist[this.hi]); this.say('Deshacer'); } }
  redo() { if (this.hi < this.hist.length - 1) { this.hi++; this.restore(this.hist[this.hi]); this.say('Rehacer'); } }
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushSave(), 500);
  }
  flushSave() {
    clearTimeout(this.saveTimer);
    SaveManager.saveLevel(this.toData());
    this.say(SaveManager.persistent ? 'Guardado' : 'No se pudo guardar en este navegador');
  }

  /* ----- Operaciones ----- */
  bounds(o) {
    if (o.type === 'end') return { x: o.x * U, y: 0, w: 2 * U, h: 10 * U };
    return { x: o.x * U, y: o.y * U, w: o.def.w * U, h: o.def.h * U };
  }
  pick(wx, wy) {
    for (let i = this.objs.length - 1; i >= 0; i--) {
      const b = this.bounds(this.objs[i]);
      if (wx >= b.x && wx < b.x + b.w && wy >= b.y && wy < b.y + b.h) return this.objs[i];
    }
    return null;
  }
  place(type, x, y, rot) {
    const def = ObjectFactory.DEFS[type];
    x = Math.max(0, x); y = clamp(y, 0, 60);
    if (def.unique) this.objs = this.objs.filter((o) => o.type !== type);
    else if (this.objs.some((o) => o.type === type && o.x === x && o.y === y && o.rot === rot)) return null;
    const o = this.mk(type, x, y, rot, this.defaultProps(type));
    this.objs.push(o);
    return o;
  }
  removeSel() {
    if (!this.sel.size) return;
    this.objs = this.objs.filter((o) => !this.sel.has(o.id));
    this.sel.clear(); this.commit(); this.say('Eliminado');
  }
  duplicateSel() {
    const items = this.objs.filter((o) => this.sel.has(o.id) && !o.def.unique);
    if (!items.length) return;
    const minX = Math.min(...items.map((o) => o.x)), maxX = Math.max(...items.map((o) => o.x + o.def.w));
    const dx = Math.max(1, Math.ceil(maxX - minX));
    this.sel.clear();
    for (const o of items) { const n = this.mk(o.type, o.x + dx, o.y, o.rot, this.cloneProps(o.props)); this.objs.push(n); this.sel.add(n.id); }
    this.commit(); this.say('Duplicado');
  }
  rotateSel() {
    if (!this.sel.size) {
      const rots = ObjectFactory.DEFS[this.type].rots;
      this.rot = rots[(rots.indexOf(this.rot) + 1) % rots.length] || 0;
      return;
    }
    let changed = false;
    for (const o of this.objs) {
      if (!this.sel.has(o.id)) continue;
      const rots = o.def.rots, next = rots[(rots.indexOf(o.rot) + 1) % rots.length];
      if (next !== o.rot) { o.rot = next; changed = true; }
    }
    if (changed) this.commit(); else this.say('Este objeto no se puede rotar');
  }
  nudge(dx, dy) {
    if (!this.sel.size) return;
    const items = this.objs.filter((o) => this.sel.has(o.id));
    dx = Math.max(dx, -Math.min(...items.map((o) => o.x)));
    dy = Math.max(dy, -Math.min(...items.map((o) => o.y)));
    for (const o of items) { o.x += dx; o.y += dy; }
    this.commit();
  }
  selectAll() { this.sel = new Set(this.objs.map((o) => o.id)); this.renderProps(); }

  /* ----- Coordenadas ----- */
  toWorld(cx, cy) {
    const rc = this.r.cv.getBoundingClientRect(), v = this.view();
    const px = (cx - rc.left) * this.r.dpr, py = (cy - rc.top) * this.r.dpr;
    return { x: v.x + px / v.s, y: v.y + (this.r.h - py) / v.s, px, py };
  }
  cell(w) { const k = U * this.snap; return { x: Math.floor(w.x / k) * this.snap, y: Math.floor(w.y / k) * this.snap }; }
  zoomAt(factor, px, py) {
    const v = this.view(), wx = v.x + px / v.s, wy = v.y + (this.r.h - py) / v.s;
    this.zoom = clamp(this.zoom * factor, 0.5, 9);
    const s = this.zoom * this.r.dpr;
    this.cam.x = wx - px / s; this.cam.y = wy - (this.r.h - py) / s;
  }
  resizeView() { /* la vista conserva su origen; no requiere ajuste */ }

  /* ----- Entrada ----- */
  pointerDown(e) {
    try { this.r.cv.setPointerCapture(e.pointerId); } catch (err) { /* puntero sintético o ya liberado */ }
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      this.drag = null;
      return;
    }
    if (this.ptrs.size > 2) return;
    const w = this.toWorld(e.clientX, e.clientY);
    if (e.button === 1 || e.button === 2 || this.tool === 'pan' || this.spaceDown) {
      this.drag = { type: 'pan', px: w.px, py: w.py, cx: this.cam.x, cy: this.cam.y };
      return;
    }
    if (this.tool === 'place') {
      this.drag = { type: 'paint', key: null, changed: false };
      this.paint(w);
    } else if (this.tool === 'erase') {
      this.drag = { type: 'erase', changed: false };
      this.eraseAt(w);
    } else {
      const hit = this.pick(w.x, w.y), add = e.shiftKey || e.ctrlKey || e.metaKey;
      if (hit) {
        if (add) { if (this.sel.has(hit.id)) this.sel.delete(hit.id); else this.sel.add(hit.id); }
        else if (!this.sel.has(hit.id)) this.sel = new Set([hit.id]);
        const orig = new Map();
        for (const o of this.objs) if (this.sel.has(o.id)) orig.set(o.id, { x: o.x, y: o.y });
        this.drag = { type: 'move', sx: w.x, sy: w.y, orig, moved: false };
      } else {
        if (!add) this.sel.clear();
        this.drag = { type: 'box', x0: w.x, y0: w.y, x1: w.x, y1: w.y, add };
      }
      this.renderProps();
    }
  }
  paint(w) {
    const c = this.cell(w), key = c.x + ',' + c.y;
    if (this.drag.key === key) return;
    this.drag.key = key;
    if (this.place(this.type, c.x, c.y, this.rot)) this.drag.changed = true;
  }
  eraseAt(w) {
    const hit = this.pick(w.x, w.y);
    if (hit) { this.objs = this.objs.filter((o) => o !== hit); this.sel.delete(hit.id); this.drag.changed = true; }
  }
  pointerMove(e) {
    const prev = this.ptrs.get(e.pointerId);
    if (prev) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const rc = this.r.cv.getBoundingClientRect();
      this.zoomAt(d / this.pinch.d, (mx - rc.left) * this.r.dpr, (my - rc.top) * this.r.dpr);
      const s = this.zoom;
      this.cam.x -= (mx - this.pinch.mx) / s; this.cam.y += (my - this.pinch.my) / s;
      this.pinch = { d, mx, my };
      return;
    }
    const w = this.toWorld(e.clientX, e.clientY);
    this.hover = w;
    const d = this.drag;
    if (!d) return;
    if (d.type === 'pan') {
      const s = this.view().s;
      this.cam.x = d.cx - (w.px - d.px) / s; this.cam.y = d.cy + (w.py - d.py) / s;
    } else if (d.type === 'paint') this.paint(w);
    else if (d.type === 'erase') this.eraseAt(w);
    else if (d.type === 'move') {
      const k = U * this.snap;
      let dx = Math.round((w.x - d.sx) / k) * this.snap, dy = Math.round((w.y - d.sy) / k) * this.snap;
      const o0 = [...d.orig.values()];
      dx = Math.max(dx, -Math.min(...o0.map((o) => o.x))); dy = Math.max(dy, -Math.min(...o0.map((o) => o.y)));
      for (const o of this.objs) {
        const s0 = d.orig.get(o.id);
        if (s0) { if (o.x !== s0.x + dx || o.y !== s0.y + dy) d.moved = true; o.x = s0.x + dx; o.y = s0.y + dy; }
      }
    } else if (d.type === 'box') { d.x1 = w.x; d.y1 = w.y; }
  }
  pointerUp(e) {
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size < 2) this.pinch = null;
    const d = this.drag;
    if (!d || this.ptrs.size > 0) return;
    this.drag = null;
    if (d.type === 'box') {
      const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
      for (const o of this.objs) {
        const b = this.bounds(o);
        if (b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0) this.sel.add(o.id);
      }
      this.renderProps();
    } else if ((d.type === 'paint' || d.type === 'erase') && d.changed) this.commit();
    else if (d.type === 'move' && d.moved) this.commit();
  }
  wheel(e) {
    const w = this.toWorld(e.clientX, e.clientY);
    if (e.shiftKey) this.cam.x += e.deltaY / this.zoom * 0.6;
    else if (e.altKey) this.cam.y -= e.deltaY / this.zoom * 0.6;
    else this.zoomAt(Math.exp(-e.deltaY * 0.0015), w.px, w.py);
  }
  key(e) {
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (e.code === 'Space') { this.spaceDown = true; return true; }
    if (mod && k === 'z') { if (e.shiftKey) this.redo(); else this.undo(); return true; }
    if (mod && k === 'y') { this.redo(); return true; }
    if (mod && k === 'd') { this.duplicateSel(); return true; }
    if (mod && k === 'a') { this.selectAll(); return true; }
    if (mod && k === 's') { this.flushSave(); return true; }
    if (mod) return false;
    const step = this.snap;
    if (e.key === 'Delete' || e.key === 'Backspace') { this.removeSel(); return true; }
    if (e.key === 'Escape') { this.sel.clear(); this.renderProps(); return true; }
    if (k === 'r') { this.rotateSel(); return true; }
    if (k === 'v') { this.setTool('select'); return true; }
    if (k === 'b') { this.setTool('place'); return true; }
    if (k === 'e') { this.setTool('erase'); return true; }
    if (k === 'h') { this.setTool('pan'); return true; }
    if (k === 'g') { this.toggleSnap(); return true; }
    if (k === 'p') { this.test(); return true; }
    const dir = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, 1], w: [0, 1], arrowdown: [0, -1], s: [0, -1] }[k];
    if (dir) {
      if (this.sel.size) { const st = e.shiftKey ? 0.5 : step; this.nudge(dir[0] * st, dir[1] * st); }
      else { this.cam.x += dir[0] * step * U * 2; this.cam.y += dir[1] * step * U * 2; }
      return true;
    }
    return false;
  }
  keyUp(e) { if (e.code === 'Space') this.spaceDown = false; }

  /* ----- Acciones de interfaz ----- */
  setTool(t) {
    this.tool = t;
    $$('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    this.r.cv.style.cursor = t === 'pan' ? 'grab' : t === 'select' ? 'default' : 'crosshair';
  }
  setType(t) {
    this.type = t; this.rot = 0;
    $$('#ed-pal .pal-item').forEach((b) => b.classList.toggle('on', b.dataset.type === t));
    if (this.tool !== 'place') this.setTool('place');
  }
  toggleSnap() {
    this.snap = this.snap === 1 ? 0.5 : 1;
    $('#ed-snap').textContent = 'Rejilla ' + (this.snap === 1 ? '1' : '½');
  }
  say(msg) {
    const el = $('#ed-status'); if (!el) return;
    el.textContent = msg;
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => { el.textContent = ''; }, 2500);
  }
  test() {
    const v = LevelManager.validate(this.toData());
    if (!v.ok) { this.say(v.error); return; }
    this.flushSave();
    this.eng.testLevel(v.data);
  }
  exportJSON() { this.eng.ui.exportModal(LevelManager.serialize(this.toData())); }
  importDialog() {
    this.eng.ui.importModal((d) => {
      if (SaveManager.data.levels[d.id]) d.id = LevelManager.newId();
      this.load(d); this.flushSave(); this.say('Nivel importado');
    });
  }
  loadDialog() {
    const levels = Object.values(SaveManager.data.levels);
    const rows = levels.length
      ? levels.map((l) => `<div class="row"><span>${esc(l.name)}</span><small>${l.objs.length} obj.</small><button data-id="${esc(l.id)}" data-do="open">Abrir</button><button data-id="${esc(l.id)}" data-do="del" class="danger">Borrar</button></div>`).join('')
      : '<p class="hint">Aún no hay niveles guardados.</p>';
    this.eng.ui.modal({
      title: 'Cargar nivel', html: `<div class="list">${rows}</div>`, buttons: [{ label: 'Cerrar' }],
      onOpen: (box) => box.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-do]'); if (!b) return;
        const id = b.dataset.id;
        if (b.dataset.do === 'open') { this.load(SaveManager.data.levels[id]); SaveManager.data.lastEdited = id; SaveManager.save(); this.eng.ui.closeModal(); }
        else {
          SaveManager.deleteLevel(id);
          if (this.meta.id === id) this.newLevel();
          this.eng.ui.closeModal(); this.loadDialog();
        }
      }),
    });
  }

  /* ----- UI ----- */
  buildPalette() {
    const groups = {};
    for (const [type, d] of Object.entries(ObjectFactory.DEFS)) (groups[d.group] = groups[d.group] || []).push(type);
    const pal = $('#ed-pal');
    pal.innerHTML = '';
    for (const [g, types] of Object.entries(groups)) {
      const h = document.createElement('div'); h.className = 'pal-group'; h.textContent = g; pal.appendChild(h);
      const wrap = document.createElement('div'); wrap.className = 'pal-row';
      for (const t of types) {
        const b = document.createElement('button');
        b.className = 'pal-item'; b.dataset.type = t; b.title = ObjectFactory.DEFS[t].label;
        const cv = document.createElement('canvas'); cv.width = 44; cv.height = 44; b.appendChild(cv);
        const sp = document.createElement('span'); sp.textContent = ObjectFactory.DEFS[t].label; b.appendChild(sp);
        this.drawIcon(cv, t);
        wrap.appendChild(b);
      }
      pal.appendChild(wrap);
    }
  }
  drawIcon(cv, type) {
    const ir = Object.create(Renderer.prototype);
    ir.ctx = cv.getContext('2d'); ir.w = cv.width; ir.h = cv.height;
    const d = ObjectFactory.DEFS[type], o = { type, x: 0, y: 0, rot: 0, def: d };
    const bw = d.w * U, bh = (type === 'end' ? 3 : d.h) * U;
    const s = Math.min(cv.width / bw, cv.height / bh) * 0.8;
    const v = { x: -(cv.width / s - bw) / 2, y: -(cv.height / s - bh) / 2, s };
    ir.ctx.fillStyle = '#0d1536'; ir.ctx.fillRect(0, 0, cv.width, cv.height);
    ir.object(v, o, ir.theme(190), true);
  }
  bindUI() {
    $('#ed-pal').addEventListener('click', (e) => { const b = e.target.closest('.pal-item'); if (b) this.setType(b.dataset.type); });
    $$('[data-tool]').forEach((b) => b.addEventListener('click', () => this.setTool(b.dataset.tool)));
    const on = (id, fn) => $(id).addEventListener('click', fn);
    on('#ed-undo', () => this.undo()); on('#ed-redo', () => this.redo());
    on('#ed-snap', () => this.toggleSnap());
    on('#ed-zoomin', () => this.zoomAt(1.25, this.r.w / 2, this.r.h / 2));
    on('#ed-zoomout', () => this.zoomAt(0.8, this.r.w / 2, this.r.h / 2));
    on('#ed-test', () => this.test());
    on('#ed-save', () => this.flushSave());
    on('#ed-load', () => this.loadDialog());
    on('#ed-new', () => { this.newLevel(); this.say('Nivel nuevo'); });
    on('#ed-export', () => this.exportJSON());
    on('#ed-import', () => this.importDialog());
    $('#ed-name').addEventListener('input', (e) => { this.meta.name = e.target.value.slice(0, 40) || 'Sin nombre'; this.scheduleSave(); });
    $('#ed-mode').addEventListener('change', (e) => { this.meta.mode = e.target.value; this.pushHistory(); this.scheduleSave(); this.updateSuggest(); });
    for (const [id, key] of [['#ed-diff', 'diff'], ['#ed-speed', 'speed'], ['#ed-style', 'style']]) {
      $(id).addEventListener('change', (e) => { this.meta[key] = e.target.value; this.pushHistory(); this.scheduleSave(); this.updateSuggest(); });
    }
    $('#ed-desc').addEventListener('input', (e) => { this.meta.desc = e.target.value.slice(0, 200); this.scheduleSave(); });
    $('#ed-desc').addEventListener('change', () => this.pushHistory());
    $('#ed-hue').addEventListener('input', (e) => { this.meta.hue = +e.target.value; });
    $('#ed-hue').addEventListener('change', () => this.renderColors());
    $('#ed-hue').addEventListener('change', () => { this.pushHistory(); this.scheduleSave(); });
    this.setTool('place'); this.setType('block');
  }
  syncUI() {
    $('#ed-name').value = this.meta.name;
    $('#ed-mode').value = this.meta.mode;
    $('#ed-hue').value = this.meta.hue;
    $('#ed-diff').value = this.meta.diff; $('#ed-desc').value = this.meta.desc;
    $('#ed-speed').value = this.meta.speed; $('#ed-style').value = this.meta.style;
    this.renderProps(); this.renderColors(); this.updateSuggest();
  }
  /* Parámetros por defecto al colocar un trigger. */
  defaultProps(type) {
    switch (type) {
      case 'trig_color': return { t: 'bg', c: '#ff2fb3', d: 1 };
      case 'trig_pulse': return { tt: 'ch', t: 'obj', c: '#ffffff', fi: 0.1, h: 0.1, fo: 0.3 };
      case 'trig_alpha': return { g: 1, a: 0, d: 0.5 };
      case 'trig_toggle': return { g: 1, on: false };
      default: return null;
    }
  }
  cloneProps(p) { return p ? JSON.parse(JSON.stringify(p)) : null; }
  chanOptions(sel, onlyNumbered) {
    return CHANNELS.filter((n) => !onlyNumbered || /^[1-8]$/.test(n))
      .map((n) => '<option value="' + n + '"' + (n === sel ? ' selected' : '') + '>' + esc(CHANNEL_LABELS[n] || 'Canal ' + n) + '</option>').join('');
  }
  /* Formulario de parámetros de un trigger; devuelve [html, aplicar(props)]. */
  triggerForm(o) {
    const p = o.props || this.defaultProps(o.type);
    const num = (id, label, v, min, max, step) => '<label>' + label + ' <input id="' + id + '" type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '"></label>';
    const col = (id, v) => '<label>Color <input id="' + id + '" type="color" value="' + v + '"></label>';
    const N = (id, a, b, d) => { const v = parseFloat($('#' + id).value); return Number.isFinite(v) ? clamp(v, a, b) : d; };
    switch (o.type) {
      case 'trig_color': return [
        '<label>Canal <select id="t-t">' + this.chanOptions(p.t) + '</select></label>' + col('t-c', p.c) + num('t-d', 'Duración (s)', p.d, 0, 30, 0.1),
        () => ({ t: $('#t-t').value, c: $('#t-c').value, d: N('t-d', 0, 30, 1) })];
      case 'trig_pulse': return [
        '<label>Objetivo <select id="t-tt"><option value="ch"' + (p.tt === 'ch' ? ' selected' : '') + '>Canal de color</option><option value="g"' + (p.tt === 'g' ? ' selected' : '') + '>Grupo</option></select></label>' +
        (p.tt === 'ch' ? '<label>Canal <select id="t-t">' + this.chanOptions(p.t) + '</select></label>' : '<label>Grupo <input id="t-t" type="number" min="1" max="999" step="1" value="' + p.t + '"></label>') +
        col('t-c', p.c) + num('t-fi', 'Entrada (s)', p.fi, 0, 30, 0.05) + num('t-h', 'Mantener (s)', p.h, 0, 30, 0.05) + num('t-fo', 'Salida (s)', p.fo, 0, 30, 0.05),
        () => {
          const tt = $('#t-tt').value;
          return { tt, t: tt === 'ch' ? $('#t-t').value : Math.round(N('t-t', 1, 999, 1)), c: $('#t-c').value, fi: N('t-fi', 0, 30, 0.1), h: N('t-h', 0, 30, 0.1), fo: N('t-fo', 0, 30, 0.3) };
        }];
      case 'trig_alpha': return [
        num('t-g', 'Grupo', p.g, 1, 999, 1) + num('t-a', 'Opacidad (0-1)', p.a, 0, 1, 0.05) + num('t-d', 'Duración (s)', p.d, 0, 30, 0.1),
        () => ({ g: Math.round(N('t-g', 1, 999, 1)), a: N('t-a', 0, 1, 0), d: N('t-d', 0, 30, 0.5) })];
      default: return [
        num('t-g', 'Grupo', p.g, 1, 999, 1) + '<label>Estado <select id="t-on"><option value="1"' + (p.on ? ' selected' : '') + '>Activar</option><option value="0"' + (!p.on ? ' selected' : '') + '>Desactivar</option></select></label>',
        () => ({ g: Math.round(N('t-g', 1, 999, 1)), on: $('#t-on').value === '1' })];
    }
  }
  /* Grupos y canal propio de objetos no-trigger. */
  setObjProps(list, groupsText, ch) {
    const ids = groupsText.split(/[\s,;]+/).map((s) => parseInt(s, 10)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 999);
    const g = Array.from(new Set(ids)).slice(0, 4);
    for (const o of list) {
      const np = {};
      if (g.length) np.g = g.slice();
      if (ch && o.def.kind !== 'portal') np.c = ch;
      o.props = Object.keys(np).length ? np : null;
    }
  }
  renderProps() {
    const box = $('#ed-sel');
    const items = this.objs.filter((o) => this.sel.has(o.id));
    $('#ed-count').textContent = this.objs.length + ' objetos';
    if (!items.length) { box.innerHTML = '<p class="hint">Selecciona un objeto con la herramienta Seleccionar para editar sus propiedades.</p>'; return; }
    const plain = items.filter((o) => o.def.kind !== 'trigger' && o.def.kind !== 'marker' && o.def.kind !== 'end');
    const groupForm = (o0) => {
      const p = o0 && o0.props ? o0.props : {};
      return '<label>Grupos <input id="p-g" type="text" maxlength="19" placeholder="ej. 1, 2" value="' + esc((p.g || []).join(', ')) + '"></label>' +
        '<label>Color <select id="p-c"><option value="">Automático</option>' + this.chanOptions(p.c, true) + '</select></label>';
    };
    const applyGroups = () => { this.setObjProps(plain, $('#p-g', box).value, $('#p-c', box).value); this.commit(); };
    if (items.length > 1) {
      box.innerHTML = '<p><b>' + items.length + '</b> objetos seleccionados</p>' + (plain.length ? '<p class="hint">Grupos y color se aplican a los ' + plain.length + ' objetos que los admiten.</p>' + groupForm(null) : '') +
        '<div class="btns"><button data-p="rot">Rotar (R)</button><button data-p="dup">Duplicar</button><button data-p="del" class="danger">Eliminar</button></div>';
      if (plain.length) ['#p-g', '#p-c'].forEach((s) => $(s, box).addEventListener('change', applyGroups));
    } else {
      const o = items[0], isTrig = o.def.kind === 'trigger';
      const form = isTrig ? this.triggerForm(o) : null;
      box.innerHTML = '<p><b>' + esc(o.def.label) + '</b></p>' +
        '<label>X <input id="p-x" type="number" step="' + this.snap + '" min="0" value="' + o.x + '"></label>' +
        '<label>Y <input id="p-y" type="number" step="' + this.snap + '" min="0" max="60" value="' + o.y + '"></label>' +
        '<label>Rotación <select id="p-r">' + o.def.rots.map((r) => '<option value="' + r + '"' + (r === o.rot ? ' selected' : '') + '>' + r + '°</option>').join('') + '</select></label>' +
        (isTrig ? '<div id="p-trig">' + form[0] + '</div><p class="hint">Se activa cuando el jugador pasa por su posición X.</p>' : plain.length ? groupForm(o) : '') +
        '<div class="btns"><button data-p="dup">Duplicar</button><button data-p="del" class="danger">Eliminar</button></div>';
      const apply = () => {
        const x = parseFloat($('#p-x', box).value), y = parseFloat($('#p-y', box).value);
        if (Number.isFinite(x)) o.x = Math.max(0, x);
        if (Number.isFinite(y)) o.y = clamp(y, 0, 60);
        o.rot = +$('#p-r', box).value;
        this.commit();
      };
      ['#p-x', '#p-y', '#p-r'].forEach((s) => $(s, box).addEventListener('change', apply));
      if (isTrig) {
        $$('#p-trig input, #p-trig select', box).forEach((el) => el.addEventListener('change', () => {
          o.props = form[1]();
          this.commit();
        }));
        if (!o.props) o.props = form[1]();
      } else if (plain.length) ['#p-g', '#p-c'].forEach((s) => $(s, box).addEventListener('change', applyGroups));
    }
    $$('[data-p]', box).forEach((b) => b.addEventListener('click', () => {
      ({ rot: () => this.rotateSel(), dup: () => this.duplicateSel(), del: () => this.removeSel() })[b.dataset.p]();
    }));
  }

  /* ----- Colores iniciales de los canales ----- */
  editorColors() {
    const m = this.meta, cols = {};
    CHANNELS.forEach((n, k) => { cols[n] = [k < 4 ? m.hue : (m.hue + 45 * (k - 3)) % 360, 100, 50]; });
    if (m.colors) for (const n of CHANNELS) if (m.colors[n]) cols[n] = FxUtil.hexToHsl(m.colors[n]);
    return cols;
  }
  renderColors() {
    const box = $('#ed-colors');
    if (!box) return;
    const cols = this.editorColors();
    box.innerHTML = CHANNELS.map((n) => '<label>' + esc(CHANNEL_LABELS[n] || 'Canal ' + n) + ' <input type="color" data-ch="' + n + '" value="' + FxUtil.hslToHex(cols[n]) + '"></label>').join('') +
      '<div class="btns"><button id="ed-col-reset">Restablecer</button></div>';
    $$('[data-ch]', box).forEach((el) => {
      el.addEventListener('input', () => { this.meta.colors = this.meta.colors || {}; this.meta.colors[el.dataset.ch] = el.value; });
      el.addEventListener('change', () => { this.pushHistory(); this.scheduleSave(); });
    });
    $('#ed-col-reset').onclick = () => { delete this.meta.colors; this.renderColors(); this.pushHistory(); this.scheduleSave(); };
  }

  /* ----- Render ----- */
  render() {
    const r = this.r, c = r.ctx, v = this.view(), cols = this.editorColors();
    const th = r.themeFx({ colorAt: (n) => cols[n] }, 0), bgh = cols.bg[0];
    const g = c.createLinearGradient(0, 0, 0, r.h);
    g.addColorStop(0, `hsl(${bgh},${45 * cols.bg[1] / 100}%,${Math.min(100, 17 * cols.bg[2] / 50)}%)`); g.addColorStop(1, `hsl(${bgh},${50 * cols.bg[1] / 100}%,${Math.min(100, 9 * cols.bg[2] / 50)}%)`);
    c.fillStyle = g; c.fillRect(0, 0, r.w, r.h);
    const vw = r.w / v.s, vh = r.h / v.s;
    c.lineWidth = 1;
    const k0 = Math.floor(v.x / U), k1 = Math.ceil((v.x + vw) / U);
    for (let k = k0; k <= k1; k++) {
      const x = r.X(v, k * U);
      c.strokeStyle = k % 10 === 0 ? 'rgba(255,255,255,.28)' : k % 5 === 0 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)';
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, r.h); c.stroke();
      if (k % 10 === 0 && v.s > 1.2) { c.fillStyle = 'rgba(255,255,255,.5)'; c.font = `${11 * r.dpr}px sans-serif`; c.fillText(k, x + 3, r.h - 6); }
    }
    const j0 = Math.floor(v.y / U), j1 = Math.ceil((v.y + vh) / U);
    for (let j = j0; j <= j1; j++) {
      const y = r.Y(v, j * U);
      c.strokeStyle = j % 5 === 0 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)';
      c.beginPath(); c.moveTo(0, y); c.lineTo(r.w, y); c.stroke();
    }
    r.ground(v, th);
    const cy = r.Y(v, CFG.SHIP.ceil);
    c.setLineDash([8 * r.dpr, 6 * r.dpr]); c.strokeStyle = '#ff2fb3'; c.lineWidth = 1.5 * r.dpr;
    c.beginPath(); c.moveTo(0, cy); c.lineTo(r.w, cy); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ff2fb3'; c.font = `${11 * r.dpr}px sans-serif`; c.fillText('techo (nave, UFO, wave, ball y spider)', 8, cy - 5);

    for (const o of this.objs) {
      const b = this.bounds(o);
      if (b.x + b.w < v.x || b.x > v.x + vw) continue;
      r.object(v, o, th, true);
    }
    c.font = 'bold ' + 10 * r.dpr + 'px sans-serif'; c.textBaseline = 'top'; c.textAlign = 'left';
    for (const o of this.objs) {
      if (!o.props || o.def.kind === 'trigger' || (!o.props.g && !o.props.c)) continue;
      const b = this.bounds(o);
      if (b.x + b.w < v.x || b.x > v.x + vw) continue;
      const t = (o.props.g ? 'g' + o.props.g.join(',') : '') + (o.props.c ? ' c' + o.props.c : '');
      const tx = r.X(v, b.x) + 2 * r.dpr, ty = r.Y(v, b.y + b.h) + 2 * r.dpr;
      c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(tx - 1, ty - 1, c.measureText(t).width + 4, 13 * r.dpr);
      c.fillStyle = '#ffd800'; c.fillText(t, tx + 1, ty);
    }
    for (const o of this.objs) {
      if (o.def.kind !== 'trigger') continue;
      const b = this.bounds(o);
      if (b.x + b.w < v.x || b.x > v.x + vw || !o.props) continue;
      const p = o.props, t = p.t !== undefined ? (p.tt === 'g' ? 'g' + p.t : String(p.t)) : 'g' + p.g;
      c.fillStyle = '#fff'; c.fillText(t, r.X(v, b.x) + 2 * r.dpr, r.Y(v, b.y) + 2 * r.dpr);
    }
    c.textBaseline = 'alphabetic';
    c.lineWidth = 2 * r.dpr;
    for (const o of this.objs) {
      if (!this.sel.has(o.id)) continue;
      const b = this.bounds(o);
      c.strokeStyle = '#ffd800'; c.strokeRect(r.X(v, b.x), r.Y(v, b.y + b.h), b.w * v.s, Math.min(b.h * v.s, r.h * 2));
    }
    if (this.tool === 'place' && this.hover && !this.drag) {
      const cl = this.cell(this.hover);
      c.globalAlpha = 0.55; r.object(v, { type: this.type, x: Math.max(0, cl.x), y: clamp(cl.y, 0, 60), rot: this.rot, def: ObjectFactory.DEFS[this.type] }, th, true); c.globalAlpha = 1;
    }
    const d = this.drag;
    if (d && d.type === 'box') {
      const x = r.X(v, Math.min(d.x0, d.x1)), y = r.Y(v, Math.max(d.y0, d.y1));
      c.fillStyle = 'rgba(255,216,0,.12)'; c.strokeStyle = '#ffd800'; c.lineWidth = 1.5 * r.dpr;
      c.fillRect(x, y, Math.abs(d.x1 - d.x0) * v.s, Math.abs(d.y1 - d.y0) * v.s);
      c.strokeRect(x, y, Math.abs(d.x1 - d.x0) * v.s, Math.abs(d.y1 - d.y0) * v.s);
    }
    if (this.hover) {
      const cl = this.cell(this.hover);
      $('#ed-pos').textContent = `x ${cl.x}  y ${cl.y}`;
    }
  }
}
