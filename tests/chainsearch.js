/* Busca la colocación del orbe amarillo para saltar una alfombra de N pinchos con margen:
   maximiza la ventana (ms) del primer salto cuando la 2.ª pulsación puede errar ±J ms. */
const C = require('./core.js');
const { Simulation, LevelManager } = C;
const TICKms = 1000 / 240, COL = process.argv[4] || 'yellow', N = +process.argv[2] || 5, J = Math.round((+process.argv[3] || 40) / TICKms);
const C0 = 22;
function ok(objs, t1, t2, endX) {
  const level = LevelManager.build(LevelManager.validate({ mode: 'cube', objs: [['start', 0, 0, 0], ['end', 400, 0, 0], ...objs] }).data);
  const s = new Simulation(level); s.prevHeld = false;
  for (let i = 0; i < 1100 && s.player.alive; i++) { s.step((i >= t1 && i < t1 + 3) || (i >= t2 && i < t2 + 3)); if (s.player.x > endX * 30) break; }
  return s.player.alive;
}
let best = [];
for (const ox of [1, 2, 3, 4, 5]) for (const oy of [1, 2, 3, 4]) for (const tau of [20, 28, 36, 44, 52]) {
  const objs = []; for (let i = 0; i < N; i++) objs.push(['spike', C0 + i, 0, 0]);
  objs.push(['orb_' + COL, C0 + ox, oy, 0]);
  const endX = C0 + N + 7;
  let run = 0, bestRun = 0;
  for (let t1 = 300; t1 < 520; t1 += 2) {
    let all = true;
    for (const d of [-J, 0, J]) if (!ok(objs, t1, t1 + tau + d, endX)) { all = false; break; }
    run = all ? run + 1 : 0; bestRun = Math.max(bestRun, run);
  }
  best.push({ ox, oy, tau, win: bestRun * 2 * TICKms });
}
best.sort((a, b) => b.win - a.win);
console.log(COL + ' N=' + N + ' pinchos, 2.ª pulsación ±' + (J * TICKms).toFixed(0) + ' ms. Mejores colocaciones (orbe en celda relativa al inicio de la alfombra):');
for (const b of best.slice(0, 5)) console.log('  orbe en (+' + b.ox + ', y=' + b.oy + ')  2.ª pulsación a ' + (b.tau * TICKms).toFixed(0) + ' ms de la 1.ª   ventana del 1.er salto: ' + b.win.toFixed(0) + ' ms');
