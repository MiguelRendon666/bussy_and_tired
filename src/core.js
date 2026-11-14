'use strict';
/* ============================================================
   NÚCLEO (sin DOM): configuración, colisiones, objetos, modos,
   nivel, física y simulación. Lo comparten el juego y el editor.
   ============================================================ */

/* ---------- Configuración física centralizada ----------
   Unidades: 1 bloque = 30 u. Velocidades en u/s, aceleraciones en u/s².
   Valores de partida tomados de las constantes conocidas de Geometry Dash
   (gravedad 0.958/tick, salto 11.18/tick a 60 ticks/s, 311.58 u/s a 1x). */
const CFG = {
  UNIT: 30,
  VIEW_H: 320,
  TICK: 1 / 240,
  MAX_FRAME: 0.1,
  MAX_STEPS: 24,
  SPEED: 311.58,
  SPEED_STEPS: { slow: 0.806, normal: 1, fast: 1.243, faster: 1.502 },
  CUBE: { gravity: 3449.5, jump: 670.8, maxFall: 900, spin: 460 },
  SHIP: { up: 1000, down: 850, maxUp: 250, maxDown: 260, ceil: 270 },
  UFO: { gravity: 1500, jump: 410, maxFall: 380 },
  WAVE: { slope: 1, inner: 6, size: 20 },
  BALL: { gravity: 2400, maxFall: 520, buffer: 0.12 },
  SPIDER: { gravity: 3000, maxFall: 900, buffer: 0.1 },
  PLAYER: { size: 30, inner: 10, tolerance: 10 },
  SPIKE: { w: 8, h: 14 },
};
const CFG_DEFAULTS = JSON.parse(JSON.stringify(CFG));

/* ---------- CollisionSystem ---------- */
const CollisionSystem = (() => {
  let stamp = 0;
  return {
    overlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    },
    /* Devuelve [{o, r}] con los rects de objetos de `kind` que solapan `rect`. */
    query(level, rect, kind, out, fx) {
      out.length = 0;
      const U = CFG.UNIT;
      const c0 = Math.floor(rect.x / U), c1 = Math.floor((rect.x + rect.w) / U);
      stamp++;
      for (let c = c0; c <= c1; c++) {
        const bucket = level.grid.get(c);
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const o = bucket[i];
          if (o.kind !== kind || o._stamp === stamp) continue;
          o._stamp = stamp;
          if (fx && fx.off.size && fx.isOff(o)) continue;
          for (let j = 0; j < o.rects.length; j++) {
            if (this.overlap(rect, o.rects[j])) out.push({ o, r: o.rects[j] });
          }
        }
      }
      return out;
    },
  };
})();

/* ---------- ObjectFactory ---------- */
const ObjectFactory = (() => {
  const U = CFG.UNIT;
  const DEFS = {
    block: { label: 'Bloque', group: 'Sólidos', w: 1, h: 1, kind: 'solid', rots: [0] },
    slab: { label: 'Losa', group: 'Sólidos', w: 1, h: 0.5, kind: 'solid', rots: [0] },
    spike: { label: 'Pincho', group: 'Pinchos', w: 1, h: 1, kind: 'hazard', spikes: 1, rots: [0, 90, 180, 270] },
    spike2: { label: 'Pincho doble', group: 'Pinchos', w: 2, h: 1, kind: 'hazard', spikes: 2, rots: [0, 180] },
    spike3: { label: 'Pincho triple', group: 'Pinchos', w: 3, h: 1, kind: 'hazard', spikes: 3, rots: [0, 180] },
    portal_cube: { label: 'Portal cubo', group: 'Portales', w: 1, h: 3, kind: 'portal', mode: 'cube', rots: [0] },
    portal_ship: { label: 'Portal nave', group: 'Portales', w: 1, h: 3, kind: 'portal', mode: 'ship', rots: [0] },
    speed_slow: { label: 'Velocidad 0.8x', group: 'Portales', w: 1, h: 3, kind: 'portal', speed: 'slow', rots: [0] },
    speed_normal: { label: 'Velocidad 1x', group: 'Portales', w: 1, h: 3, kind: 'portal', speed: 'normal', rots: [0] },
    speed_fast: { label: 'Velocidad 1.24x', group: 'Portales', w: 1, h: 3, kind: 'portal', speed: 'fast', rots: [0] },
    speed_faster: { label: 'Velocidad 1.5x', group: 'Portales', w: 1, h: 3, kind: 'portal', speed: 'faster', rots: [0] },
    portal_ufo: { label: 'Portal UFO', group: 'Portales', w: 1, h: 3, kind: 'portal', mode: 'ufo', rots: [0] },
    portal_wave: { label: 'Portal wave', group: 'Portales', w: 1, h: 3, kind: 'portal', mode: 'wave', rots: [0] },
    portal_ball: { label: 'Portal ball', group: 'Portales', w: 1, h: 3, kind: 'portal', mode: 'ball', rots: [0] },
    portal_spider: { label: 'Portal spider', group: 'Portales', w: 1, h: 3, kind: 'portal', mode: 'spider', rots: [0] },
    deco_star: { label: 'Estrella', group: 'Decoración', w: 1, h: 1, kind: 'deco', rots: [0] },
    deco_cluster: { label: 'Cúmulo de estrellas', group: 'Decoración', w: 3, h: 2, kind: 'deco', rots: [0] },
    deco_arc: { label: 'Arco', group: 'Decoración', w: 4, h: 2, kind: 'deco', rots: [0, 90, 180, 270] },
    deco_circle: { label: 'Círculo grande', group: 'Decoración', w: 3, h: 3, kind: 'deco', rots: [0] },
    deco_frame: { label: 'Marco', group: 'Decoración', w: 3, h: 3, kind: 'deco', rots: [0] },
    deco_dots: { label: 'Patrón de puntos', group: 'Decoración', w: 3, h: 3, kind: 'deco', rots: [0] },
    deco_line_h: { label: 'Línea de energía', group: 'Decoración', w: 6, h: 1, kind: 'deco', rots: [0] },
    deco_line_v: { label: 'Línea vertical', group: 'Decoración', w: 1, h: 6, kind: 'deco', rots: [0] },
    deco_tower: { label: 'Estructura luminosa', group: 'Decoración', w: 2, h: 6, kind: 'deco', rots: [0] },
    deco_float: { label: 'Elemento flotante', group: 'Decoración', w: 1, h: 1, kind: 'deco', rots: [0] },
    deco_orb: { label: 'Orbe de luz', group: 'Decoración', w: 2, h: 2, kind: 'deco', rots: [0] },
    deco_chevrons: { label: 'Flechas', group: 'Decoración', w: 3, h: 1, kind: 'deco', rots: [0, 180] },
    deco_beam: { label: 'Haz de luz', group: 'Decoración', w: 2, h: 8, kind: 'deco', rots: [0] },
    deco_tri: { label: 'Deco triángulo', group: 'Decoración', w: 1, h: 1, kind: 'deco', rots: [0, 90, 180, 270] },
    deco_ring: { label: 'Deco anillo', group: 'Decoración', w: 1, h: 1, kind: 'deco', rots: [0] },
    deco_bars: { label: 'Deco barras', group: 'Decoración', w: 1, h: 2, kind: 'deco', rots: [0] },
    trig_color: { label: 'Trigger color', group: 'Triggers', w: 1, h: 1, kind: 'trigger', rots: [0] },
    trig_pulse: { label: 'Trigger pulse', group: 'Triggers', w: 1, h: 1, kind: 'trigger', rots: [0] },
    trig_alpha: { label: 'Trigger alpha', group: 'Triggers', w: 1, h: 1, kind: 'trigger', rots: [0] },
    trig_toggle: { label: 'Trigger toggle', group: 'Triggers', w: 1, h: 1, kind: 'trigger', rots: [0] },
    start: { label: 'Inicio', group: 'Nivel', w: 1, h: 1, kind: 'marker', rots: [0], unique: true },
    end: { label: 'Meta', group: 'Nivel', w: 1, h: 1, kind: 'end', rots: [0], unique: true },
  };
  const COLLIDABLE = { solid: 1, hazard: 1, portal: 1 };

  function spikeRect(cx, cy, rot) {
    const w = CFG.SPIKE.w, h = CFG.SPIKE.h, m = (U - w) / 2;
    switch (rot) {
      case 0: return { x: cx + m, y: cy, w, h };
      case 180: return { x: cx + m, y: cy + U - h, w, h };
      case 90: return { x: cx, y: cy + m, w: h, h: w };
      default: return { x: cx + U - h, y: cy + m, w: h, h: w };
    }
  }

  function buildRects(o, def) {
    const x0 = o.x * U, y0 = o.y * U;
    if (def.kind === 'solid') return [{ x: x0, y: y0, w: def.w * U, h: def.h * U }];
    if (def.kind === 'hazard') {
      const r = [];
      for (let i = 0; i < def.spikes; i++) r.push(spikeRect(x0 + i * U, y0, o.rot));
      return r;
    }
    if (def.kind === 'portal') return [{ x: x0 + U / 2 - 6, y: y0, w: 12, h: def.h * U }];
    return [];
  }

  return {
    DEFS,
    instantiate(type, x, y, rot, id, props) {
      const def = DEFS[type];
      const o = { id, type, x, y, rot: rot || 0, def, kind: def.kind, rects: [], box: null, _stamp: 0, props: props || null, groups: props && props.g ? props.g : [], ch: props && props.c ? props.c : null };
      if (COLLIDABLE[def.kind]) {
        o.rects = buildRects(o, def);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const r of o.rects) {
          x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
          x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h);
        }
        o.box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
      return o;
    },
  };
})();

/* ---------- Modos de juego (extensibles: añadir clase + entrada en MODES) ---------- */
class CubeMode {
  constructor() { this.id = 'cube'; this.slideCeil = false; this.slideDown = false; }
  bounds() { return { floor: 0, ceil: Infinity }; }
  enter(sim, p) { p.vy = Math.min(p.vy, CFG.CUBE.jump); }
  canClimb(p) { return p.vy <= 0; }
  canHang() { return false; }
  beforeMove(sim, p, held, dt, wasGround) {
    const c = CFG.CUBE;
    if (held && wasGround) {
      p.vy = c.jump;
      sim.stats.jumps++;
      sim.events.push({ type: 'jump' });
    }
    p.vy = Math.max(p.vy - c.gravity * dt, -c.maxFall);
  }
  afterMove(sim, p, dt) {
    if (!p.onGround) p.rot += CFG.CUBE.spin * dt;
    else {
      const target = Math.round(p.rot / 90) * 90;
      const d = target - p.rot, step = 900 * dt;
      p.rot = Math.abs(d) <= step ? target : p.rot + Math.sign(d) * step;
    }
  }
}
class ShipMode {
  constructor() { this.id = 'ship'; this.slideCeil = true; this.slideDown = true; }
  bounds() { return { floor: 0, ceil: CFG.SHIP.ceil }; }
  enter(sim, p, initial) {
    if (initial) p.y = 135;
    p.vy = Math.max(-CFG.SHIP.maxDown, Math.min(CFG.SHIP.maxUp, p.vy));
  }
  canClimb() { return true; }
  canHang() { return true; }
  beforeMove(sim, p, held, dt) {
    const s = CFG.SHIP;
    p.vy += (held ? s.up : -s.down) * dt;
    p.vy = Math.max(-s.maxDown, Math.min(s.maxUp, p.vy));
  }
  afterMove(sim, p, dt) {
    const target = -Math.max(-40, Math.min(40, p.vy * 0.1));
    p.rot += (target - p.rot) * Math.min(1, dt * 14);
  }
}
class UfoMode {
  constructor() { this.id = 'ufo'; this.slideCeil = true; }
  bounds() { return { floor: 0, ceil: CFG.SHIP.ceil }; }
  enter(sim, p, initial) {
    if (initial) p.y = 135;
    p.vy = Math.max(-CFG.UFO.maxFall, Math.min(CFG.UFO.jump, p.vy));
  }
  canClimb() { return true; }
  canHang() { return true; }
  beforeMove(sim, p, held, dt) {
    const u = CFG.UFO;
    if (sim.pressed) {
      p.vy = u.jump;
      sim.stats.jumps++;
      sim.events.push({ type: 'flap' });
    }
    p.vy = Math.max(p.vy - u.gravity * dt, -u.maxFall);
  }
  afterMove(sim, p, dt) {
    const target = -Math.max(-18, Math.min(18, p.vy * 0.04));
    p.rot += (target - p.rot) * Math.min(1, dt * 12);
  }
}
class WaveMode {
  constructor() { this.id = 'wave'; this.slideCeil = true; this.solidKills = true; }
  get innerSize() { return CFG.WAVE.inner; }
  get inset() { return (CFG.PLAYER.size - CFG.WAVE.size) / 2; }
  bounds() { return { floor: 0, ceil: CFG.SHIP.ceil }; }
  enter(sim, p, initial) { if (initial) p.y = 135; p.vy = 0; }
  canClimb() { return true; }
  canHang() { return true; }
  beforeMove(sim, p, held) {
    const v = CFG.SPEED * p.speedMul * CFG.WAVE.slope;
    p.vy = held ? v : -v;
    p.held = held;
  }
  afterMove(sim, p, dt) {
    const target = p.onGround ? 0 : (p.held ? -45 : 45);
    p.rot += (target - p.rot) * Math.min(1, dt * 30);
  }
}
class BallMode {
  constructor() { this.id = 'ball'; this.slideCeil = true; }
  bounds() { return { floor: 0, ceil: CFG.SHIP.ceil }; }
  enter(sim, p) { p.vy = 0; p.buf = 0; }
  canClimb(p) { return p.dir < 0 && p.vy <= 0; }
  canHang(p) { return p.dir > 0; }
  hangGround(p) { return p.dir > 0; }
  ceilGround(p) { return p.dir > 0; }
  beforeMove(sim, p, held, dt, wasGround) {
    const b = CFG.BALL;
    if (sim.pressed) p.buf = b.buffer; else p.buf = Math.max(0, p.buf - dt);
    if (p.buf > 0 && wasGround) {
      p.dir = -p.dir; p.vy = 0; p.buf = 0;
      sim.stats.jumps++;
      sim.events.push({ type: 'flip', dir: p.dir });
    }
    p.vy += p.dir * b.gravity * dt;
    p.vy = Math.max(-b.maxFall, Math.min(b.maxFall, p.vy));
  }
  afterMove(sim, p, dt) {
    const k = p.dir < 0 ? 1 : -1;
    if (p.onGround) p.rot += (CFG.SPEED * p.speedMul / 15) * (180 / Math.PI) * dt * k;
    else p.rot += 120 * dt * k;
  }
}
class SpiderMode {
  constructor() { this.id = 'spider'; this.slideCeil = true; this.hits = []; }
  bounds() { return { floor: 0, ceil: CFG.SHIP.ceil }; }
  enter(sim, p) { p.vy = 0; p.buf = 0; }
  canClimb(p) { return p.dir < 0 && p.vy <= 0; }
  canHang(p) { return p.dir > 0; }
  hangGround(p) { return p.dir > 0; }
  ceilGround(p) { return p.dir > 0; }
  /* Teletransporte: salta a la superficie opuesta (techo o bloque por encima, suelo o bloque por debajo). */
  teleport(sim, p) {
    const size = CFG.PLAYER.size, b = sim.bounds, hits = this.hits;
    if (p.dir < 0) {
      const from = p.y + size;
      let top = b.ceil;
      if (b.ceil - from > 0) {
        CollisionSystem.query(sim.level, { x: p.x, y: from, w: size, h: b.ceil - from }, 'solid', hits, sim.fx);
        for (const h of hits) if (h.r.y >= from - 1e-6 && h.r.y < top) top = h.r.y;
      }
      p.y = top - size;
    } else {
      let bottom = b.floor;
      if (p.y - b.floor > 0) {
        CollisionSystem.query(sim.level, { x: p.x, y: b.floor, w: size, h: p.y - b.floor }, 'solid', hits, sim.fx);
        for (const h of hits) { const t = h.r.y + h.r.h; if (t <= p.y + 1e-6 && t > bottom) bottom = t; }
      }
      p.y = bottom;
    }
    p.dir = -p.dir; p.vy = 0; p.buf = 0;
    sim.stats.jumps++;
    sim.events.push({ type: 'flip', dir: p.dir });
  }
  beforeMove(sim, p, held, dt, wasGround) {
    const s = CFG.SPIDER;
    if (sim.pressed) p.buf = s.buffer; else p.buf = Math.max(0, p.buf - dt);
    if (p.buf > 0 && wasGround) this.teleport(sim, p);
    p.vy += p.dir * s.gravity * dt;
    p.vy = Math.max(-s.maxFall, Math.min(s.maxFall, p.vy));
  }
  afterMove(sim, p) { p.rot = 0; }
}
const MODES = { cube: new CubeMode(), ship: new ShipMode(), ufo: new UfoMode(), wave: new WaveMode(), ball: new BallMode(), spider: new SpiderMode() };

/* ---------- Player ---------- */
class Player {
  constructor() { this.reset(0); }
  reset(x) {
    this.x = x; this.y = 0; this.vy = 0; this.rot = 0;
    this.px = x; this.py = 0; this.prot = 0;
    this.onGround = true; this.mode = 'cube'; this.speedMul = 1; this.alive = true;
    this.dir = -1; this.buf = 0; this.held = false;
  }
  rect() {
    const s = CFG.PLAYER.size, d = MODES[this.mode].inset || 0;
    return { x: this.x + d, y: this.y + d, w: s - 2 * d, h: s - 2 * d };
  }
  inner() {
    const s = CFG.PLAYER.size, i = MODES[this.mode].innerSize || CFG.PLAYER.inner, m = (s - i) / 2;
    return { x: this.x + m, y: this.y + m, w: i, h: i };
  }
}


/* ---------- Color y efectos (canales de color + grupos) ----------
   Canales: bg, ground, line, obj (base) y 1..8 (personalizados). Un color es [h, s%, l%];
   [matiz, 100, 50] equivale al aspecto clásico derivado de un solo matiz. */
const CHANNELS = ['bg', 'ground', 'line', 'obj', '1', '2', '3', '4', '5', '6', '7', '8'];
const CHANNEL_LABELS = { bg: 'Fondo', ground: 'Suelo', line: 'Línea', obj: 'Base (objetos)' };
const FxUtil = {
  clamp01(k) { return k < 0 ? 0 : k > 1 ? 1 : k; },
  hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (d > 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  },
  hslToHex(c) {
    const h = ((c[0] % 360) + 360) % 360, s = c[1] / 100, l = c[2] / 100, a = s * Math.min(l, 1 - l);
    const f = (n) => { const k = (n + h / 30) % 12, v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  },
  lerp(a, b, k) {
    if (k <= 0) return a;
    if (k >= 1) return b;
    const dh = ((b[0] - a[0] + 540) % 360) - 180;
    return [(a[0] + dh * k + 360) % 360, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  },
};
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

class Fx {
  constructor(level) { this.level = level; this.reset(); }
  reset() { this.i = 0; this.ch = new Map(); this.pu = []; this.al = new Map(); this.off = new Set(); }
  get active() { return this.level.triggers.length > 0; }
  advance(x, t) {
    const tr = this.level.triggers, U = CFG.UNIT;
    while (this.i < tr.length && x >= tr[this.i].x * U) this.fire(tr[this.i++], t);
  }
  fire(o, t) {
    const p = o.props;
    switch (o.type) {
      case 'trig_color': this.ch.set(p.t, { from: this.baseAt(p.t, t), to: FxUtil.hexToHsl(p.c), t0: t, d: p.d }); break;
      case 'trig_pulse':
        this.pu = this.pu.filter((q) => t - q.t0 < q.fi + q.h + q.fo);
        this.pu.push({ tt: p.tt, t: p.t, c: FxUtil.hexToHsl(p.c), t0: t, fi: p.fi, h: p.h, fo: p.fo });
        break;
      case 'trig_alpha': this.al.set(p.g, { from: this.alphaAt(p.g, t), to: p.a, t0: t, d: p.d }); break;
      case 'trig_toggle': if (p.on) this.off.delete(p.g); else this.off.add(p.g); break;
    }
  }
  baseAt(name, t) {
    const e = this.ch.get(name);
    if (!e) return this.level.colors[name];
    return FxUtil.lerp(e.from, e.to, e.d > 0 ? FxUtil.clamp01((t - e.t0) / e.d) : 1);
  }
  pulseK(p, t) {
    const dt = t - p.t0;
    if (dt < 0) return 0;
    if (dt < p.fi) return p.fi > 0 ? dt / p.fi : 1;
    if (dt < p.fi + p.h) return 1;
    const f = dt - p.fi - p.h;
    return f < p.fo ? 1 - f / p.fo : 0;
  }
  colorAt(name, t) {
    let c = this.baseAt(name, t);
    for (const p of this.pu) if (p.tt === 'ch' && p.t === name) { const k = this.pulseK(p, t); if (k > 0) c = FxUtil.lerp(c, p.c, k); }
    return c;
  }
  /* Color de pulso activo sobre un grupo: devuelve {c, k} o null. */
  groupPulse(groups, t) {
    let best = null;
    for (const p of this.pu) {
      if (p.tt !== 'g' || !groups.includes(p.t)) continue;
      const k = this.pulseK(p, t);
      if (k > 0 && (!best || k >= best.k)) best = { c: p.c, k };
    }
    return best;
  }
  alphaAt(g, t) {
    const e = this.al.get(g);
    if (!e) return 1;
    return e.from + (e.to - e.from) * (e.d > 0 ? FxUtil.clamp01((t - e.t0) / e.d) : 1);
  }
  objAlpha(o, t) {
    let a = 1;
    for (const g of o.groups) if (this.al.size) a = Math.min(a, this.alphaAt(g, t));
    return a;
  }
  isOff(o) {
    for (const g of o.groups) if (this.off.has(g)) return true;
    return false;
  }
  snap() { return this.active ? { i: this.i, ch: new Map(this.ch), pu: this.pu.slice(), al: new Map(this.al), off: new Set(this.off) } : null; }
  restore(s) {
    if (!s) return;
    this.i = s.i; this.ch = new Map(s.ch); this.pu = s.pu.slice(); this.al = new Map(s.al); this.off = new Set(s.off);
  }
}

/* ---------- Dificultades y estilos ---------- */
const DIFFS = {
  easy: { name: 'Easy', color: '#5cff7a', rank: 0, desc: 'Ritmo pausado, saltos amplios y casi ninguna precisión. Para aprender.' },
  normal: { name: 'Normal', color: '#ffe14d', rank: 1, desc: 'Secuencias de pinchos y plataformas con algo de ritmo.' },
  hard: { name: 'Hard', color: '#ff9f2e', rank: 2, desc: 'Obstáculos seguidos y tramos de modo especial con margen justo.' },
  harder: { name: 'Harder', color: '#ff4d4d', rank: 3, desc: 'Densidad alta y cambios rápidos; exige precisión.' },
  insane: { name: 'Insane', color: '#ff2fb3', rank: 4, desc: 'Muy denso y estrecho, con poco margen de error.' },
  demon: { name: 'Demon', color: '#b44cff', rank: 5, desc: 'Extremo: precisión casi perfecta durante todo el nivel.' },
};
const DIFF_ORDER = ['easy', 'normal', 'hard', 'harder', 'insane', 'demon'];
const STYLES = {
  classic: 'Clásico', stars: 'Espacio', circuit: 'Circuito', arcs: 'Arcos', aurora: 'Aurora', grid: 'Retro',
};

/* ---------- Level / LevelManager ---------- */
class Level {
  constructor(data) {
    const U = CFG.UNIT;
    this.id = data.id; this.name = data.name; this.startMode = data.mode; this.hue = data.hue;
    this.builtin = !!data.builtin; this.autoHue = !!data.autoHue;
    this.diff = data.diff || 'normal'; this.desc = data.desc || ''; this.speed = data.speed || 'normal'; this.style = data.style || 'classic';
    this.objects = []; this.grid = new Map();
    this.colors = {};
    CHANNELS.forEach((n, k) => { this.colors[n] = [k < 4 ? data.hue : (data.hue + 45 * (k - 3)) % 360, 100, 50]; });
    if (data.colors) for (const n of CHANNELS) if (data.colors[n]) this.colors[n] = FxUtil.hexToHsl(data.colors[n]);
    let startX = null, endX = null, maxX = 0;
    data.objs.forEach((a, i) => {
      const o = ObjectFactory.instantiate(a[0], a[1], a[2], a[3], i, a[4]);
      this.objects.push(o);
      maxX = Math.max(maxX, o.x + o.def.w);
      if (o.kind === 'marker' && (startX === null || o.x < startX)) startX = o.x;
      if (o.kind === 'end' && (endX === null || o.x < endX)) endX = o.x;
      if (o.box) {
        const c0 = Math.floor(o.box.x / U), c1 = Math.floor((o.box.x + o.box.w) / U);
        for (let c = c0; c <= c1; c++) {
          let b = this.grid.get(c);
          if (!b) this.grid.set(c, (b = []));
          b.push(o);
        }
      }
    });
    this.hasEnd = endX !== null;
    this.startX = startX === null ? 0 : startX;
    this.endX = (endX === null ? maxX + 10 : endX) * U;
    if (this.endX <= this.startX * U) this.endX = (this.startX + 10) * U;
    this.sorted = this.objects.slice().sort((a, b) => a.x - b.x);
    this.triggers = this.sorted.filter((o) => o.kind === 'trigger');
  }
}

const LevelManager = (() => {
  const MAX_OBJ = 30000;
  const fail = (error) => ({ ok: false, error });
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  return {
    newId() { return 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); },
    validate(raw) {
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return fail('JSON inválido: ' + e.message); }
      }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('El contenido no es un nivel.');
      if (raw.format !== undefined && raw.format !== 1) return fail('Versión de formato no soportada.');
      if (!Array.isArray(raw.objs)) return fail('Falta la lista de objetos (objs).');
      if (raw.objs.length > MAX_OBJ) return fail('Demasiados objetos (máximo ' + MAX_OBJ + ').');
      const objs = [];
      for (let i = 0; i < raw.objs.length; i++) {
        const a = raw.objs[i];
        if (!Array.isArray(a) || a.length < 3) return fail('Objeto ' + (i + 1) + ' mal formado.');
        const [t, x, y, r = 0, rawProps] = a;
        const def = ObjectFactory.DEFS[t];
        if (!def) return fail('Objeto ' + (i + 1) + ': tipo desconocido "' + String(t).slice(0, 20) + '".');
        if (!num(x) || !num(y) || !num(r)) return fail('Objeto ' + (i + 1) + ': coordenadas no numéricas.');
        if (x < -1000 || x > 100000 || y < -50 || y > 200) return fail('Objeto ' + (i + 1) + ': fuera de rango.');
        const rr = ((r % 360) + 360) % 360;
        if (!def.rots.includes(rr)) return fail('Objeto ' + (i + 1) + ': rotación no válida para ' + t + '.');
        const pr = rawProps === undefined || rawProps === null ? null : this.cleanProps(def, rawProps);
        if (typeof pr === 'string') return fail('Objeto ' + (i + 1) + ': ' + pr);
        objs.push(pr ? [t, x, y, rr, pr] : [t, x, y, rr]);
      }
      let colors;
      if (raw.colors !== undefined) {
        if (!raw.colors || typeof raw.colors !== 'object' || Array.isArray(raw.colors)) return fail('Colores iniciales mal formados.');
        colors = {};
        for (const n of CHANNELS) {
          if (raw.colors[n] === undefined) continue;
          if (typeof raw.colors[n] !== 'string' || !HEX_RE.test(raw.colors[n])) return fail('Color inicial no válido en el canal ' + n + '.');
          colors[n] = raw.colors[n].toLowerCase();
        }
        if (!Object.keys(colors).length) colors = undefined;
      }
      const mode = raw.mode === undefined ? 'cube' : raw.mode;
      if (!MODES[mode]) return fail('Modo inicial desconocido.');
      const hue = num(raw.hue) ? Math.max(0, Math.min(360, raw.hue)) : 215;
      const id = typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id) ? raw.id : this.newId();
      const name = (typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Sin nombre').slice(0, 40);
      const diff = raw.diff === undefined ? 'normal' : raw.diff;
      if (!DIFFS[diff]) return fail('Dificultad desconocida.');
      const speed = raw.speed === undefined ? 'normal' : raw.speed;
      if (!CFG.SPEED_STEPS[speed]) return fail('Velocidad inicial desconocida.');
      const style = raw.style === undefined ? 'classic' : raw.style;
      if (!STYLES[style]) return fail('Estilo visual desconocido.');
      const desc = (typeof raw.desc === 'string' ? raw.desc : '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
      const out = { format: 1, id, name, mode, hue, diff, desc, speed, style, objs };
      if (colors) out.colors = colors;
      return { ok: true, data: out };
    },
    /* Valida y normaliza el 5.º elemento de un objeto: grupos/canal o parámetros de trigger. Devuelve objeto, null o texto de error. */
    cleanProps(def, p) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return 'propiedades mal formadas.';
      const inRange = (v, a, b) => num(v) && v >= a && v <= b;
      const gid = (v) => Number.isInteger(v) && v >= 1 && v <= 999;
      const chan = (v) => typeof v === 'string' && CHANNELS.includes(v);
      if (def.kind === 'trigger') {
        const hex = (v) => typeof v === 'string' && HEX_RE.test(v);
        const c = typeof p.c === 'string' ? p.c.toLowerCase() : p.c;
        if (def === ObjectFactory.DEFS.trig_color) {
          if (!chan(p.t) || !hex(p.c) || !inRange(p.d, 0, 30)) return 'trigger de color con datos no válidos.';
          return { t: p.t, c, d: p.d };
        }
        if (def === ObjectFactory.DEFS.trig_pulse) {
          const okT = p.tt === 'ch' ? chan(p.t) : p.tt === 'g' && gid(p.t);
          if (!okT || !hex(p.c) || !inRange(p.fi, 0, 30) || !inRange(p.h, 0, 30) || !inRange(p.fo, 0, 30)) return 'trigger de pulso con datos no válidos.';
          return { tt: p.tt, t: p.t, c, fi: p.fi, h: p.h, fo: p.fo };
        }
        if (def === ObjectFactory.DEFS.trig_alpha) {
          if (!gid(p.g) || !inRange(p.a, 0, 1) || !inRange(p.d, 0, 30)) return 'trigger de alpha con datos no válidos.';
          return { g: p.g, a: p.a, d: p.d };
        }
        if (!gid(p.g) || typeof p.on !== 'boolean') return 'trigger de toggle con datos no válidos.';
        return { g: p.g, on: p.on };
      }
      if (def.kind === 'marker' || def.kind === 'end') return null;
      const out = {};
      if (p.g !== undefined) {
        if (!Array.isArray(p.g) || p.g.length > 4 || !p.g.every(gid)) return 'grupos no válidos (hasta 4, entre 1 y 999).';
        if (p.g.length) out.g = Array.from(new Set(p.g));
      }
      if (p.c !== undefined && def.kind !== 'portal') {
        if (!chan(p.c) || !/^[1-8]$/.test(p.c)) return 'canal de color no válido (1 a 8).';
        out.c = p.c;
      }
      return Object.keys(out).length ? out : null;
    },
    serialize(data) {
      const base = { format: 1, id: data.id, name: data.name, mode: data.mode, hue: data.hue, diff: data.diff || 'normal', desc: data.desc || '', speed: data.speed || 'normal', style: data.style || 'classic' };
      if (data.colors) base.colors = data.colors;
      const head = JSON.stringify(base);
      return head.slice(0, -1) + ',"objs":[\n' + data.objs.map((o) => JSON.stringify(o)).join(',\n') + '\n]}';
    },
    build(data) { return new Level(data); },
    /* Métricas de diseño: sirven para sugerir una dificultad coherente con el nivel. */
    analyze(level) {
      const U = CFG.UNIT, x0 = level.startX, x1 = level.endX / U, L = Math.max(10, x1 - x0);
      const portals = level.objects.filter((o) => o.def.mode).sort((a, b) => a.x - b.x);
      const speeds = level.objects.filter((o) => o.def.speed);
      const W = { cube: 1, ship: 1.25, ufo: 1.45, wave: 1.7, ball: 1.5, spider: 1.5 };
      let mode = level.startMode, last = x0, weighted = 0, maxMul = CFG.SPEED_STEPS[level.speed] || 1;
      const segs = [];
      const push = (x, m) => {
        const e = Math.min(Math.max(x, x0), x1);
        if (e > last) { segs.push([last, e, mode]); weighted += (e - last) * W[mode]; last = e; }
        mode = m;
      };
      for (const p of portals) push(p.x, p.def.mode);
      push(x1, mode);
      for (const sp of speeds) maxMul = Math.max(maxMul, CFG.SPEED_STEPS[sp.def.speed]);
      let hazards = 0;
      const cols = new Map();
      for (const o of level.objects) {
        if (o.x < x0 || o.x > x1) continue;
        if (o.kind === 'hazard') hazards += o.def.spikes;
        if (o.kind === 'hazard' || o.kind === 'solid') {
          for (let i = 0; i < o.def.w; i++) {
            const c = Math.floor(o.x) + i;
            let rows = cols.get(c);
            if (!rows) cols.set(c, (rows = new Set()));
            const r0 = Math.floor(o.y + 1e-6), r1 = Math.ceil(o.y + o.def.h - 1e-6);
            for (let r = r0; r < r1; r++) rows.add(r);
          }
        }
      }
      let tight = 0, special = 0;
      for (const [a, b, m] of segs) {
        if (m === 'cube') continue;
        special += b - a;
        for (let c = Math.floor(a); c < b; c++) {
          const rows = cols.get(c);
          if (!rows) continue;
          let run = 0, best = 0;
          for (let r = 0; r < 9; r++) { if (rows.has(r)) run = 0; else { run++; if (run > best) best = run; } }
          if (best <= 4) tight++;
        }
      }
      const modeAvg = weighted / L, speedF = 1 + (maxMul - 1) * 0.8;
      const density = hazards / L * 100, tightPct = tight / L * 100;
      const score = (density * 0.9 + tightPct * 0.5) * modeAvg * speedF + (special / L) * 6;
      return { length: L, hazards, density, tightPct, modeAvg, speedF, special: special / L, score };
    },
    suggestDifficulty(level) {
      const sc = this.analyze(level).score;
      const cuts = [10, 26, 40, 56, 72];
      let i = 0;
      while (i < cuts.length && sc >= cuts[i]) i++;
      return DIFF_ORDER[i];
    },
  };
})();

/* ---------- Simulación (PhysicsEngine + estado) ---------- */
class PhysicsEngine {
  constructor(sim) { this.sim = sim; this.hits = []; }

  enterMode(id, initial) {
    const sim = this.sim, p = sim.player;
    p.mode = id;
    p.dir = -1;
    sim.bounds = MODES[id].bounds();
    MODES[id].enter(sim, p, initial);
    if (!initial) sim.events.push({ type: 'portal', mode: id });
  }

  kill(cause) {
    const sim = this.sim, p = sim.player;
    p.alive = false;
    sim.events.push({ type: 'death', cause, x: p.x, y: p.y });
    return false;
  }

  step(held, dt) {
    const sim = this.sim, p = sim.player, lv = sim.level;
    sim.pressed = held && !sim.prevHeld;
    sim.prevHeld = held;
    p.px = p.x; p.py = p.y; p.prot = p.rot;
    const mode = MODES[p.mode];
    const wasGround = p.onGround;
    p.onGround = false;
    mode.beforeMove(sim, p, held, dt, wasGround);

    p.x += CFG.SPEED * p.speedMul * dt;
    if (!this.resolveX(p, mode)) return;
    p.y += p.vy * dt;
    if (!this.resolveY(p, mode)) return;
    mode.afterMove(sim, p, dt);
    if (!this.checkHazards(p)) return;
    this.checkPortals(p);
    sim.time += dt;
    sim.fx.advance(p.x, sim.time);
    if (p.x >= lv.endX) {
      sim.finished = true;
      sim.events.push({ type: 'win' });
    }
  }

  resolveX(p, mode) {
    const sim = this.sim, tol = CFG.PLAYER.tolerance, size = CFG.PLAYER.size;
    const hits = CollisionSystem.query(sim.level, p.rect(), 'solid', this.hits, sim.fx);
    for (let i = 0; i < hits.length; i++) {
      const r = hits[i].r;
      if (!CollisionSystem.overlap(p.rect(), r)) continue;
      if (mode.solidKills) return this.kill('wall');
      const top = r.y + r.h;
      if (mode.canClimb(p) && p.y >= top - tol) {
        p.y = top;
        if (p.vy < 0) p.vy = 0;
        p.onGround = true;
        continue;
      }
      if (mode.canHang(p) && p.y + size <= r.y + tol) {
        p.y = r.y - size;
        if (p.vy > 0) p.vy = 0;
        if (mode.hangGround && mode.hangGround(p)) p.onGround = true;
        continue;
      }
      return this.kill('wall');
    }
    return true;
  }

  resolveY(p, mode) {
    const sim = this.sim, b = sim.bounds, size = CFG.PLAYER.size, d = mode.inset || 0;
    if (p.y + d <= b.floor) { p.y = b.floor - d; p.vy = 0; p.onGround = true; }
    if (p.y + size - d >= b.ceil) {
      p.y = b.ceil - size + d;
      if (p.vy > 0) p.vy = 0;
      if (mode.ceilGround && mode.ceilGround(p)) p.onGround = true;
      if (!mode.slideCeil) return this.kill('ceiling');
    }
    const hits = CollisionSystem.query(sim.level, p.rect(), 'solid', this.hits, sim.fx);
    for (let i = 0; i < hits.length; i++) {
      const r = hits[i].r;
      if (!CollisionSystem.overlap(p.rect(), r)) continue;
      if (mode.solidKills) return this.kill('block');
      if (p.vy <= 0) {
        p.y = r.y + r.h; p.vy = 0; p.onGround = true;
      } else if (mode.ceilGround && mode.ceilGround(p)) {
        p.y = r.y - size; p.vy = 0; p.onGround = true;
      } else if (mode.slideCeil) {
        p.y = r.y - size; p.vy = 0;
      } else {
        return this.kill('ceiling');
      }
    }
    return true;
  }

  checkHazards(p) {
    const hits = CollisionSystem.query(this.sim.level, p.inner(), 'hazard', this.hits, this.sim.fx);
    return hits.length ? this.kill('spike') : true;
  }

  checkPortals(p) {
    const hits = CollisionSystem.query(this.sim.level, p.rect(), 'portal', this.hits, this.sim.fx);
    for (let i = 0; i < hits.length; i++) {
      const d = hits[i].o.def;
      if (d.mode && p.mode !== d.mode) this.enterMode(d.mode, false);
      if (d.speed) {
        const m = CFG.SPEED_STEPS[d.speed];
        if (p.speedMul !== m) { p.speedMul = m; this.sim.events.push({ type: 'speed', value: m }); }
      }
    }
  }
}

class Simulation {
  constructor(level) {
    this.level = level;
    this.player = new Player();
    this.physics = new PhysicsEngine(this);
    this.fx = new Fx(level);
    this.events = [];
    this.bounds = { floor: 0, ceil: Infinity };
    this.pressed = false; this.prevHeld = true;
    this.reset();
  }
  reset() {
    this.player.reset(this.level.startX * CFG.UNIT);
    this.player.speedMul = CFG.SPEED_STEPS[this.level.speed] || 1;
    this.pressed = false; this.prevHeld = true;
    this.time = 0;
    this.finished = false;
    this.stats = { jumps: 0 };
    this.events.length = 0;
    this.physics.enterMode(this.level.startMode, true);
    this.fx.reset();
    this.fx.advance(this.player.x, 0);
  }
  step(held) { this.physics.step(held, CFG.TICK); }
  get progress() {
    const s = this.level.startX * CFG.UNIT;
    return Math.max(0, Math.min(1, (this.player.x - s) / (this.level.endX - s)));
  }
  save() {
    const p = this.player;
    return { x: p.x, y: p.y, vy: p.vy, rot: p.rot, g: p.onGround, m: p.mode, s: p.speedMul, a: p.alive,
      t: this.time, f: this.finished, b: this.bounds, ph: this.prevHeld, d: p.dir, bf: p.buf, fx: this.fx.snap() };
  }
  load(s) {
    const p = this.player;
    p.x = s.x; p.y = s.y; p.vy = s.vy; p.rot = s.rot; p.onGround = s.g; p.mode = s.m;
    p.speedMul = s.s; p.alive = s.a; this.time = s.t; this.finished = s.f; this.bounds = s.b;
    this.prevHeld = s.ph; p.dir = s.d; p.buf = s.bf;
    this.fx.restore(s.fx);
  }
}

/* Paso fijo desacoplado de los FPS */
class FixedStepper {
  constructor(sim) { this.sim = sim; this.acc = 0; }
  reset() { this.acc = 0; }
  advance(dt, held) {
    this.acc += Math.min(dt, CFG.MAX_FRAME);
    let n = 0;
    while (this.acc >= CFG.TICK && n < CFG.MAX_STEPS && this.sim.player.alive && !this.sim.finished) {
      this.sim.step(held);
      this.acc -= CFG.TICK;
      n++;
    }
    if (n >= CFG.MAX_STEPS) this.acc = 0;
    return n;
  }
  get alpha() { return this.acc / CFG.TICK; }
}

/* ---------- Stereo Madness (recreación aproximada) ---------- */
const Levels = {
  stereoMadness() {
    const o = [];
    const B = (x, y) => o.push(['block', x, y, 0]);
    const R = (x, y, w, h) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) B(x + i, y + j); };
    const S = (x, y = 0, r = 0) => o.push(['spike', x, y, r]);
    const S2 = (x, y = 0) => o.push(['spike2', x, y, 0]);
    const S3 = (x, y = 0) => o.push(['spike3', x, y, 0]);
    const P = (type, x, y = 0) => o.push([type, x, y, 0]);
    o.push(['start', 0, 0, 0]);

    /* A. Pinchos sueltos, dobles y triples */
    S(20); S(31); S(41); S2(52); S(64); S(71); S3(83); S(96); S2(105); S(114);

    /* B. Primeras plataformas */
    R(124, 0, 4, 1); S(130);
    R(140, 0, 3, 1); S2(144); R(147, 0, 4, 1);
    R(160, 0, 4, 1); R(164, 0, 4, 2); R(168, 0, 3, 1); S(176);
    R(186, 0, 11, 1); S(190, 1); S(195, 1); S3(203);
    R(214, 0, 3, 2); S3(217); R(220, 0, 3, 2);
    R(236, 0, 2, 1); S(240); S(248);

    /* C. Ritmo mixto */
    S2(258); S(268); S(274); R(282, 0, 5, 1); S(285, 1); S2(291);
    R(302, 0, 3, 1); R(305, 0, 3, 2); R(308, 0, 3, 3); S(314); S(320);
    R(330, 0, 3, 1); S2(334); R(337, 0, 3, 2);

    /* D. Nave */
    for (let y = 0; y < 9; y += 3) P('portal_ship', 352, y);
    const gate = (x, lo, hi, w = 2, spikes = false) => {
      for (let i = 0; i < w; i++) {
        for (let y = 0; y < lo; y++) B(x + i, y);
        for (let y = hi; y < 9; y++) B(x + i, y);
        if (spikes && lo > 0) S(x + i, lo);
        if (spikes && hi < 9) S(x + i, hi - 1, 180);
      }
    };
    let gx = 372;
    for (const [lo, hi] of [[1, 7], [2, 8], [0, 6], [3, 9], [1, 7], [2, 8], [0, 6], [3, 9]]) { gate(gx, lo, hi); gx += 11; }
    gx += 4;
    for (let k = 0; k <= 4; k++) { gate(gx, k, k + 5); gx += 2; }
    gx += 10;
    for (let k = 4; k >= 0; k--) { gate(gx, k, k + 5); gx += 2; }
    gx += 12;
    for (const [lo, hi] of [[0, 5], [4, 9], [1, 6], [3, 8], [0, 5], [4, 9]]) { gate(gx, lo, hi, 2, true); gx += 11; }
    gx += 4;
    for (const [lo, hi] of [[2, 6], [4, 8], [1, 5], [3, 7], [0, 4], [5, 9]]) { gate(gx, lo, hi); gx += 10; }
    gx += 6;
    for (let y = 0; y < 9; y += 3) P('portal_cube', gx, y);
    const exitX = gx;

    /* E. Cubo a 1.24x */
    for (let y = 0; y < 2; y++) P('speed_fast', exitX + 14, y * 2);
    let cx = exitX + 40;
    S(cx); S(cx += 14); S2(cx += 14); S(cx += 12); S3(cx += 16);
    R(cx += 16, 0, 5, 1); S(cx + 3, 1); cx += 5;
    S2(cx += 12); R(cx += 14, 0, 3, 1); R(cx + 3, 0, 3, 2); cx += 6;
    S(cx += 14); S(cx += 12);
    P('speed_normal', cx += 16);
    P('speed_normal', cx, 2);

    /* F. Tramo final a 1x */
    S(cx += 18); S2(cx += 12); S(cx += 11);
    R(cx += 12, 0, 4, 1); S(cx + 4); cx += 4;
    S3(cx += 14); S(cx += 12);
    R(cx += 12, 0, 3, 1); R(cx + 3, 0, 3, 2); cx += 6;
    S2(cx += 14); S(cx += 12);
    const endX = cx + 22;
    o.push(['end', endX, 0, 0]);

    /* Decoración de fondo */
    const kinds = ['deco_tri', 'deco_bars', 'deco_ring'];
    for (let x = 8, i = 0; x < endX; x += 13, i++) {
      const t = kinds[i % 3];
      o.push([t, x, t === 'deco_ring' ? 2 + (i * 7) % 5 : 0, 0]);
    }
    /* El matiz que antes avanzaba solo con el progreso (215° -> 365°) ahora son triggers de color. */
    const K = 15, dur = +(endX * CFG.UNIT / K / CFG.SPEED).toFixed(2);
    ['bg', 'ground', 'line', 'obj'].forEach((ch, ci) => {
      for (let i = 0; i < K; i++) {
        o.push(['trig_color', Math.round(endX * i / K), 14 + ci, 0, { t: ch, c: FxUtil.hslToHex([(215 + 150 * (i + 1) / K) % 360, 100, 50]), d: dur }]);
      }
    });
    return { format: 1, id: 'stereo-madness', name: 'Stereo Madness', mode: 'cube', hue: 215, builtin: true, objs: o };
  },
};

if (typeof module !== 'undefined') {
  module.exports = { CHANNELS, CHANNEL_LABELS, FxUtil, Fx, HEX_RE, DIFFS, DIFF_ORDER, STYLES, CFG, CFG_DEFAULTS, CollisionSystem, ObjectFactory, MODES, Player, Level, LevelManager, Simulation, FixedStepper, Levels };
}
