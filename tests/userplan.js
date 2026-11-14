/* Calcula un plan para el nivel de usuario creado en el editor y registra los cambios de modo. */
const C = require('./core.js');
const { Simulation, LevelManager } = C;
const json = require('fs').readFileSync(__dirname + '/user_level.json', 'utf8');
const v = LevelManager.validate(json);
if (!v.ok) { console.log('INVALIDO', v.error); process.exit(1); }
const level = LevelManager.build(v.data);
const DECIDE = 8, BEAM = 500;
const sim = new Simulation(level);
let states = [{ s: sim.save(), held: null, prev: null }], plan = null;
while (states.length && !plan) {
  const next = new Map();
  for (const st of states) for (const held of [false, true]) {
    sim.load(st.s); sim.events.length = 0;
    let ok = true;
    for (let i = 0; i < DECIDE; i++) { sim.step(held); if (!sim.player.alive) { ok = false; break; } if (sim.finished) break; }
    if (!ok) continue;
    const sv = sim.save(), node = { s: sv, held, prev: st };
    if (sim.finished) { const out = []; for (let n = node; n.prev; n = n.prev) out.push(n.held ? 1 : 0); plan = out.reverse(); break; }
    const key = [sv.m, Math.round(sv.y / 4), Math.round(sv.vy / 25), sv.g, sv.d, sv.ph, Math.round(sv.bf * 20)].join('|');
    if (!next.has(key)) next.set(key, node);
  }
  states = [...next.values()];
  if (states.length > BEAM) { const st = states.length / BEAM; states = Array.from({ length: BEAM }, (_, i) => states[Math.floor(i * st)]); }
}
if (!plan) { console.log('SIN SOLUCION'); process.exit(0); }
/* reproducir registrando modos */
const s2 = new Simulation(level), modes = [s2.player.mode];
for (const h of plan) for (let i = 0; i < DECIDE; i++) { s2.step(!!h); if (s2.player.mode !== modes[modes.length - 1]) modes.push(s2.player.mode); }
console.log('plan', plan.length, 'decisiones; modos recorridos:', modes.join(' -> '), '; terminó', s2.finished);
require('fs').writeFileSync(__dirname + '/user_plan.json', JSON.stringify(plan));
