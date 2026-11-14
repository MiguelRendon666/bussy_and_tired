const C = require('./core.js'), L = require('./levels.js');
const { CFG, Simulation, LevelManager, Levels } = C;
const name = process.argv[2] || 'stereo', DECIDE = +process.argv[3] || 8, BEAM = +process.argv[4] || 500;
const raw = name === 'stereo' ? Levels.stereoMadness() : L.OfficialLevels[name]();
const v = LevelManager.validate(raw);
if (!v.ok) { console.log('VALIDATE FAIL', v.error); process.exit(1); }
const level = LevelManager.build(v.data);
const an = LevelManager.analyze(level);
console.log(name, 'objs', level.objects.length, 'largo', level.endX / 30 | 0, 'bloques', (level.endX / CFG.SPEED).toFixed(0) + 's@1x', 'score', an.score.toFixed(1), '->', LevelManager.suggestDifficulty(level), '(asignada ' + level.diff + ')');
function solve() {
  const sim = new Simulation(level);
  let states = [{ s: sim.save() }], tick = 0, bestX = 0;
  while (states.length) {
    const next = new Map();
    for (const st of states) for (const held of [false, true]) {
      sim.load(st.s); sim.events.length = 0;
      let ok = true;
      for (let i = 0; i < DECIDE; i++) { sim.step(held); if (!sim.player.alive) { ok = false; break; } if (sim.finished) break; }
      if (!ok) continue;
      bestX = Math.max(bestX, sim.player.x);
      const sv = sim.save();
      if (sim.finished) return { ok: true };
      const key = [sv.m, Math.round(sv.y / 4), Math.round(sv.vy / 25), sv.g, sv.d, sv.ph, Math.round(sv.bf * 20), sv.fx ? Array.from(sv.fx.off).join(',') : ''].join('|');
      if (!next.has(key)) next.set(key, { s: sv });
    }
    tick++; states = [...next.values()];
    if (states.length > BEAM) { const st = states.length / BEAM; states = Array.from({ length: BEAM }, (_, i) => states[Math.floor(i * st)]); }
  }
  return { ok: false, bestX: bestX / 30 };
}
const t0 = Date.now(), r = solve();
console.log(r.ok ? 'COMPLETABLE' : 'FALLA cerca de x=' + r.bestX.toFixed(1), '(decisión cada ' + DECIDE + ' ticks =' + (DECIDE * 1000 / 240).toFixed(0) + 'ms)', (Date.now() - t0) / 1000 + 's');
