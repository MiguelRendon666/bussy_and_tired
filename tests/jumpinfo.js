/* Parámetros de salto medidos con el propio motor: sirven como reglas de diseño de niveles. */
const C = require('./core.js');
const { Simulation, LevelManager, CFG } = C;
const mk = (mode, objs, speed) => new Simulation(LevelManager.build(LevelManager.validate({ mode, speed: speed || 'normal', objs: [['start', 0, 0, 0], ['end', 2000, 0, 0], ...objs] }).data));
const U = 30, TICKms = 1000 / 240;

/* Salto de cubo: pulsar un tick desde el suelo */
function jumpStats(speed) {
  const s = mk('cube', [], speed); s.prevHeld = false;
  s.step(false); const x0 = s.player.x; let apex = 0, ticks = 0;
  s.step(true);
  do { s.step(false); apex = Math.max(apex, s.player.y); ticks++; } while (!s.player.onGround && ticks < 2000);
  return { apex: apex / U, air: ticks * TICKms / 1000, len: (s.player.x - x0) / U };
}
console.log('SALTO DE CUBO (bloques / segundos)');
for (const sp of ['slow', 'normal', 'fast', 'faster']) { const j = jumpStats(sp); console.log(' ', sp.padEnd(7), 'altura', j.apex.toFixed(2), 'alcance', j.len.toFixed(2), 'aire', j.air.toFixed(3) + 's'); }

/* Ventana de pulsación (ms) que sobrevive a un obstáculo: se prueba cada tick de pulsación */
function window(objs, speed, run = 900) {
  let ok = [];
  for (let t = 300; t < 560; t++) {
    const s = mk('cube', objs, speed); s.prevHeld = false;
    for (let i = 0; i < run && s.player.alive && !s.finished; i++) s.step(i >= t && i < t + 3);
    if (s.player.alive) ok.push(t);
  }
  /* ancho del tramo contiguo más largo */
  let best = 0, cur = 0, prev = -2;
  for (const t of ok) { cur = t === prev + 1 ? cur + 1 : 1; prev = t; best = Math.max(best, cur); }
  return best * TICKms;
}
console.log('\nVENTANA DE PULSACIÓN (ms) para cubo a 1x; humano cómodo >= 80 ms, apretado 40-80');
const row = (name, objs, sp) => console.log(' ', name.padEnd(34), window(objs, sp).toFixed(0).padStart(4), 'ms');
const run = (n, x0 = 20) => Array.from({ length: n }, (_, i) => ['spike', x0 + i, 0, 0]);
for (let n = 1; n <= 6; n++) row('alfombra de ' + n + ' pincho' + (n > 1 ? 's' : ''), run(n));
row('bloque de 1 de alto (subir)', [['block', 22, 0, 0], ['block', 23, 0, 0], ['block', 24, 0, 0]]);
row('bloque de 2 de alto (subir)', [['block', 22, 0, 0], ['block', 22, 1, 0], ['block', 23, 0, 0], ['block', 23, 1, 0], ['block', 24, 0, 0], ['block', 24, 1, 0]]);
row('pincho + plataforma 1 + pincho', [['spike', 20, 0, 0], ['block', 24, 0, 0], ['block', 25, 0, 0], ['block', 26, 0, 0], ['spike', 28, 0, 0]]);
row('pincho doble + pincho (3 sep.)', [['spike2', 20, 0, 0], ['spike', 24, 0, 0]]);
console.log('\nVelocidades distintas: alfombra de 3');
for (const sp of ['slow', 'fast', 'faster']) console.log(' ', sp.padEnd(7), window(run(3), sp).toFixed(0), 'ms');

/* ---- Trayectorias: y (en bloques) del borde inferior del cubo según dx (bloques) desde el punto de partida ---- */
function arc(objs, f, speed, ticks = 260) {
  const s = mk('cube', objs, speed); s.prevHeld = false; const pts = []; let x0 = null;
  for (let i = 0; i < ticks; i++) { s.step(f(i, s)); if (x0 === null) x0 = s.player.x; if (i % 6 === 0) pts.push([+((s.player.x - x0) / U).toFixed(2), +(s.player.y / U).toFixed(2)]); }
  return pts;
}
console.log('\nPAD (x medido desde la celda del pad; el cubo lo activa ~1 bloque antes):');
for (const k of ['pink', 'yellow', 'red']) {
  const s = mk('cube', [['pad_' + k, 12, 0, 0]]); s.prevHeld = false; let launch = null, land = null, apex = 0;
  for (let i = 0; i < 400; i++) { s.step(false); const x = s.player.x / U; if (launch === null && s.player.y > 0.5) launch = x; apex = Math.max(apex, s.player.y); if (launch !== null && s.player.onGround && i > 30 && land === null && s.player.y === 0 && x > launch + 1) land = x; }
  console.log('  ', k.padEnd(7), 'sale en x=pad' + (launch - 12 >= 0 ? '+' : '') + (launch - 12).toFixed(2), 'apex', (apex / U).toFixed(2) + 'b', 'aterriza en pad+' + (land - 12).toFixed(2));
}
console.log('\nSALTO DE SUELO: sale en 0; altura según dx');
console.log('  ', arc([], (i) => i >= 4 && i < 7).slice(0, 18).map((p) => p.join(':')).join('  '));
