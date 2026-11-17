/* Genera para cada nivel una secuencia de entradas (1 decisión = 8 ticks) que lo completa. */
const C = require('./core.js'), L = require('./levels.js');
const { Simulation, LevelManager, Levels } = C;
const DECIDE = 8, BEAM = 500;
function plan(raw) {
  const level = LevelManager.build(LevelManager.validate(raw).data);
  const sim = new Simulation(level);
  let states = [{ s: sim.save(), held: null, prev: null }];
  while (states.length) {
    const next = new Map();
    for (const st of states) for (const held of [false, true]) {
      sim.load(st.s); sim.events.length = 0;
      let ok = true;
      for (let i = 0; i < DECIDE; i++) { sim.step(held); if (!sim.player.alive) { ok = false; break; } if (sim.finished) break; }
      if (!ok) continue;
      const sv = sim.save(), node = { s: sv, held, prev: st };
      if (sim.finished) { const out = []; for (let n = node; n.prev; n = n.prev) out.push(n.held ? 1 : 0); return out.reverse(); }
      const key = [sv.m, Math.round(sv.y / 4), Math.round(sv.vy / 25), sv.g, sv.d, sv.ph, Math.round(sv.bf * 20), sv.gs, sv.u ? sv.u.size : 0].join('|');
      if (!next.has(key)) next.set(key, node);
    }
    states = [...next.values()];
    if (states.length > BEAM) { const st = states.length / BEAM; states = Array.from({ length: BEAM }, (_, i) => states[Math.floor(i * st)]); }
  }
  return null;
}
const out = {};
out['stereo-madness'] = plan(Levels.stereoMadness());
out['orbital-hop'] = plan(L.OfficialLevels.ufo());
out['neon-slope'] = plan(L.OfficialLevels.wave());
out['flip-circuit'] = plan(L.OfficialLevels.ball());
out['abyss-protocol'] = plan(L.OfficialLevels.demon());
out['changes-after-all'] = plan(L.OfficialLevels.changes());
out['witzy-witzy-spider'] = plan(L.OfficialLevels.spider());
out['gravity-rush'] = plan(L.OfficialLevels.gravity());
require('fs').writeFileSync(__dirname + '/plans.json', JSON.stringify(out));
for (const k of Object.keys(out)) console.log(k, out[k] ? out[k].length + ' decisiones' : 'SIN SOLUCIÓN');

/* Reproducir el plan de SM en el núcleo v1 (respaldo): mismas entradas, mismo resultado */
const V1 = require('C:/Users/Pablninn18/geometry-dash-v1-backup/src/core.js');
const lv1 = V1.LevelManager.build(V1.LevelManager.validate(V1.Levels.stereoMadness()).data);
const s1 = new V1.Simulation(lv1);
const lv2 = LevelManager.build(LevelManager.validate(Levels.stereoMadness()).data), s2 = new Simulation(lv2);
let same = true, steps = 0;
for (const h of out['stereo-madness']) for (let i = 0; i < DECIDE; i++) {
  s1.step(!!h); s2.step(!!h); steps++;
  if (s1.player.x !== s2.player.x || s1.player.y !== s2.player.y) same = false;
}
console.log('Plan de Stereo Madness en v1 y v2: pasos', steps, 'idéntico', same, 'v1 terminó', s1.finished, 'v2 terminó', s2.finished);
