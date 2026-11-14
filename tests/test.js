const path = require('path');
const C = require(path.join(__dirname, 'core.js'));
const { CFG, Simulation, LevelManager, Levels, FixedStepper } = C;

function fmt(n) { return n.toFixed(1); }
const res = LevelManager.validate(Levels.stereoMadness());
if (!res.ok) { console.log('VALIDATE FAIL', res.error); process.exit(1); }
const level = LevelManager.build(res.data);
console.log('objetos', level.objects.length, 'endX bloques', level.endX / 30, 'dur 1x ~', fmt(level.endX / CFG.SPEED), 's');

/* Beam search: decisiones cada DECIDE ticks (humano ~ 33 ms) */
function solve(level, DECIDE = 8, BEAM = 400) {
  const sim = new Simulation(level);
  let states = [{ s: sim.save(), inputs: [] }];
  let tick = 0, bestX = 0;
  while (states.length) {
    const next = new Map();
    for (const st of states) {
      for (const held of [false, true]) {
        sim.load(st.s);
        sim.events.length = 0;
        let ok = true;
        for (let i = 0; i < DECIDE; i++) {
          sim.step(held);
          if (!sim.player.alive) { ok = false; break; }
          if (sim.finished) break;
        }
        if (!ok) continue;
        bestX = Math.max(bestX, sim.player.x);
        const sv = sim.save();
        if (sim.finished) return { ok: true, tick: tick + 1, sim };
        const key = sv.m + '|' + Math.round(sv.y / 4) + '|' + Math.round(sv.vy / 25) + '|' + sv.g;
        if (!next.has(key)) next.set(key, { s: sv, held, prev: st });
      }
    }
    tick++;
    states = [...next.values()];
    if (states.length > BEAM) {
      // reduce de forma uniforme
      const stride = states.length / BEAM;
      states = Array.from({ length: BEAM }, (_, i) => states[Math.floor(i * stride)]);
    }
    if (tick % 600 === 0) process.stdout.write('.');
  }
  return { ok: false, bestX: bestX / 30 };
}

const t0 = Date.now();
const r = solve(level, +process.argv[2] || 8, +process.argv[3] || 400);
console.log('\nresultado', r.ok ? 'COMPLETABLE' : 'FALLA cerca de x=' + fmt(r.bestX) + ' bloques', (Date.now() - t0) / 1000 + 's');
