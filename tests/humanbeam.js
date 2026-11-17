/* Bot "con margen": busca una solución en un nivel con los pinchos ENGROSADOS (margen espacial) y con
   decisiones gruesas y separación mínima entre toques (margen temporal). Si lo completa, un humano
   con holgura de ~DX/311 s en cada obstáculo puede hacerlo.
   uso: node humanbeam.js <nivel> [DECIDE=12] [MINTAP=30] [DX=7] [DY=5] [BEAM=800] */
const C = require('./core.js'), L = require('./levels.js');
const { Simulation, LevelManager, Levels } = C;
const name = process.argv[2], DECIDE = +process.argv[3] || 12, MINTAP = +process.argv[4] || 30, DX = process.argv[5] === undefined ? 7 : +process.argv[5], DY = process.argv[6] === undefined ? 5 : +process.argv[6], BEAM = +process.argv[7] || 800;
const STOP = process.argv[8] === undefined ? undefined : +process.argv[8];
const raw = name === 'stereo' ? Levels.stereoMadness() : L.OfficialLevels[name](STOP);
const level = LevelManager.build(LevelManager.validate(raw).data);
for (const o of level.objects) if (o.kind === 'hazard') for (const r of o.rects) { r.x -= DX; r.w += 2 * DX; r.h += DY; if (o.rot === 180) { r.y -= DY; } }
for (const o of level.objects) if (o.kind === 'hazard') {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of o.rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  o.box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
level.grid.clear();
for (const o of level.objects) if (o.box) { const c0 = Math.floor(o.box.x / 30), c1 = Math.floor((o.box.x + o.box.w) / 30); for (let c = c0; c <= c1; c++) { let b = level.grid.get(c); if (!b) level.grid.set(c, (b = [])); b.push(o); } }
const sim = new Simulation(level);
const JIT = process.argv[9] === undefined ? 40 : +process.argv[9];
/* Repite el plan sobre la geometría REAL con cada cambio de pulsación desplazado al azar +-JIT ms (como un humano). */
function monte(last) {
  const plan = []; for (let n = last; n && n.held !== null; n = n.prev) plan.push(n.held);
  plan.reverse();
  const real = LevelManager.build(LevelManager.validate(raw).data), TR = 400; let okc = 0; const fails = [], reach = [];
  let seed = 99; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const jt = Math.round(JIT / (1000 / 240));
  for (let tr = 0; tr < TR; tr++) {
    const ticks = []; for (const h of plan) for (let i = 0; i < DECIDE; i++) ticks.push(h);
    const edges = []; for (let i = 1; i < ticks.length; i++) if (ticks[i] !== ticks[i - 1]) edges.push(i);
    const shifted = ticks.slice(); 
    const sh = edges.map((e) => e + Math.round((rnd() * 2 - 1) * jt));
    for (let i = 0; i < ticks.length; i++) shifted[i] = ticks[0];
    let cur = ticks[0], idx = 0; const ev = sh.slice().sort((a, b) => a - b);
    for (let i = 0; i < ticks.length; i++) { while (idx < ev.length && i >= ev[idx]) { cur = !cur; idx++; } shifted[i] = cur; }
    const s2 = new Simulation(real); s2.prevHeld = true;
    for (let i = 0; i < ticks.length + 60 && s2.player.alive && !s2.finished; i++) s2.step(shifted[Math.min(i, shifted.length - 1)]);
    if (s2.finished) { okc++; reach.push(1e9); } else { fails.push(Math.floor(s2.player.x / 30 / 20) * 20); reach.push(s2.player.x / 30); }
  }
  const hist = {}; for (const f of fails) { const arrivals = reach.filter((r) => r >= f).length; const inz = fails.filter((q) => q === f).length; hist[f] = Math.round(inz / arrivals * 100) + '%'; }
  console.log('Monte Carlo (' + TR + ' intentos, cada pulsación +-' + JIT + ' ms): ' + (okc / TR * 100).toFixed(0) + '% completan.' + (fails.length ? ' Riesgo de caer en cada zona de 20 bloques (caídas / llegadas): ' + JSON.stringify(hist) : ''));
}
let states = [{ s: sim.save(), prevHeld: true, lp: 999, prev: null, held: null }], best = 0;
while (states.length) {
  const next = new Map();
  for (const st of states) for (const held of [false, true]) {
    const press = held && !st.prevHeld;
    if (press && st.lp < MINTAP) continue;
    sim.load(st.s); let ok = true;
    for (let i = 0; i < DECIDE; i++) { sim.step(held); if (!sim.player.alive) { ok = false; break; } if (sim.finished) break; }
    if (!ok) continue;
    best = Math.max(best, sim.player.x);
    const sv = sim.save();
    if (sim.finished) { monte({ prev: st, held }); console.log('CON MARGEN: completable (pinchos +' + DX + 'u por lado, decisión ' + (DECIDE * 1000 / 240).toFixed(0) + ' ms, toques >= ' + (MINTAP * 1000 / 240).toFixed(0) + ' ms)'); process.exit(0); }
    const lp = press ? DECIDE : Math.min(999, st.lp + DECIDE);
    const key = [sv.m, Math.round(sv.y / 4), Math.round(sv.vy / 25), sv.g, sv.d, Math.min(lp, MINTAP + 8), held, sv.gs, sv.u ? sv.u.size : 0, sv.u ? Array.from(sv.u).join(',') : ''].join('|');
    if (!next.has(key)) next.set(key, { s: sv, prevHeld: held, lp, prev: st, held });
  }
  states = [...next.values()];
  if (states.length > BEAM) { const t = states.length / BEAM; states = Array.from({ length: BEAM }, (_, i) => states[Math.floor(i * t)]); }
}
console.log('SIN MARGEN: falla cerca de x=' + (best / 30).toFixed(1) + ' bloques');
