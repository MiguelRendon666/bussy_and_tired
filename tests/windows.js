/* Ventana humana por obstáculo (solo tramos de cubo): una política sencilla salta cuando el próximo
   grupo de obstáculos está a D bloques; se mide qué rango de D lo supera. Ventana (ms) = rango de D / (10.39 bloques/s).
   uso: node windows.js <nivel> */
const C = require('./core.js'), L = require('./levels.js');
const { Simulation, LevelManager, Levels, CFG, CollisionSystem, MODES } = C;
const name = process.argv[2], U = 30, BPS = CFG.SPEED / U;
const raw = name === 'stereo' ? Levels.stereoMadness() : L.OfficialLevels[name]();
const level = LevelManager.build(LevelManager.validate(raw).data);
/* modo y gravedad vigentes en cada x */
const events = level.objects.filter((o) => o.def.mode || o.def.grav || o.def.speed).sort((a, b) => a.x - b.x);
const stateAt = (x) => { let mode = level.startMode, gs = 1, sp = CFG.SPEED_STEPS[level.speed] || 1; for (const e of events) { if (e.x > x) break; if (e.def.mode) mode = e.def.mode; if (e.def.grav) gs = e.def.grav; if (e.def.speed) sp = CFG.SPEED_STEPS[e.def.speed]; } return { mode, gs, sp }; };
const solids = level.objects.filter((o) => o.kind === 'hazard' || o.kind === 'solid' || o.kind === 'orb' || o.kind === 'pad').sort((a, b) => a.x - b.x);
const clusters = [];
for (const o of solids) {
  const x0 = o.x, x1 = o.x + o.def.w;
  const c = clusters[clusters.length - 1];
  if (c && x0 - c.x1 < 6) { c.x1 = Math.max(c.x1, x1); c.n++; } else clusters.push({ x0, x1, n: 1 });
}
function trial(cl, D, st) {
  const sim = new Simulation(level); sim.prevHeld = false;
  const p = sim.player, startX = cl.sx; p.speedMul = st.sp;
  p.x = p.px = startX * U; p.mode = 'cube'; p.gs = st.gs; p.dir = st.gs > 0 ? -1 : 1;
  sim.bounds = MODES.cube.bounds(p); p.y = p.py = st.gs > 0 ? 0 : sim.bounds.ceil - 30; p.onGround = true; sim.fx.advance(p.x, 0);
  let tap = 0, lastPress = -99;
  for (let i = 0; i < 2400 && p.alive; i++) {
    const right = (p.x + 30) / U, gap = cl.x0 - right;
    let press = false;
    if (p.onGround && gap <= D && right < cl.x1 + 0.5 && i - lastPress > 20) press = true;
    if (!p.onGround && level.hasInter && i - lastPress > 14) {
      const orbs = CollisionSystem.query(level, p.rect(), 'orb', [], sim.fx);
      if (orbs.length && p.gs * p.vy <= 60 && !sim.used.has(orbs[0].o.id)) press = true;
    }
    if (press) { tap = 3; lastPress = i; }
    sim.step(tap > 0); if (tap > 0) tap--;
    if (p.x > (cl.x1 + 3) * U) return p.alive && stateAt(p.x / U).mode === 'cube';
  }
  return false;
}
let bad = 0, total = 0;
console.log('Nivel ' + name + ': ventana (ms) por grupo de obstáculos en tramos de cubo (>= 100 cómodo, 60-100 justo, < 60 muy justo)');
clusters.forEach((cl, i) => { cl.sx = Math.max(i ? clusters[i - 1].x1 + 1 : level.startX, cl.x0 - 14); });
for (const cl of clusters) {
  const st = stateAt(cl.sx), st2 = stateAt(cl.x0), st3 = stateAt(cl.x1);
  if (st.mode !== 'cube' || st2.mode !== 'cube' || st3.mode !== 'cube') continue;
  let best = 0, cur = 0, bestAt = 0;
  for (let D = 0.2; D <= 14; D += 0.1) { if (trial(cl, D, st)) { cur++; if (cur > best) { best = cur; bestAt = D; } } else cur = 0; }
  const ms = best * 0.1 / (BPS * st.sp) * 1000; total++;
  const tag = ms >= 100 ? 'ok   ' : ms >= 60 ? 'JUSTO' : 'MALO ';
  if (ms < 60) bad++;
  console.log('  ' + tag + ' x=' + String(Math.round(cl.x0)).padStart(4) + '..' + String(Math.round(cl.x1)).padEnd(4) + ' (' + cl.n + ' obj.)  ventana ' + ms.toFixed(0).padStart(4) + ' ms');
}
console.log(bad ? bad + ' de ' + total + ' grupos con ventana < 60 ms' : 'todos los grupos de cubo tienen ventana >= 60 ms (' + total + ')');
