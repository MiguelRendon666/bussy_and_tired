const C = require('./core.js');
const { Simulation, LevelManager, FixedStepper, CFG } = C;
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FALLA'), msg); };
const mk = (mode, objs = [], extra = {}) => new Simulation(LevelManager.build(LevelManager.validate({ mode, objs: [['start', 0, 0, 0], ['end', 400, 0, 0], ...objs], ...extra }).data));
const run = (sim, n, held) => { for (let i = 0; i < n; i++) sim.step(typeof held === 'function' ? held(i) : held); };

/* UFO: un impulso por pulsación, mantener pulsado NO repite */
{
  const s = mk('ufo'); s.player.y = 100; s.player.vy = 0;
  run(s, 2, false); const y0 = s.player.y;
  run(s, 1, true); const vyTap = s.player.vy;
  ok(vyTap > 400 && vyTap <= CFG.UFO.jump, `UFO: pulsación da impulso vertical (vy=${vyTap.toFixed(0)})`);
  run(s, 240 * 0.6, true);
  ok(s.player.y < 100, 'UFO: mantener pulsado no vuelve a impulsar (cae por gravedad)');
  const s2 = mk('ufo'); s2.player.y = 100; s2.player.vy = 0; s2.prevHeld = false;
  run(s2, 144, (i) => i % 24 < 3);
  const s3 = mk('ufo'); s3.player.y = 100; s3.player.vy = 0; s3.prevHeld = false;
  run(s3, 144, (i) => i < 3);
  ok(s2.player.y > s3.player.y + 30, `UFO: impulsos consecutivos suben más que uno solo (${s2.player.y.toFixed(0)} > ${s3.player.y.toFixed(0)})`);
  const ceil = mk('ufo'); ceil.player.y = 230; run(ceil, 60, (i) => i % 8 < 2);
  ok(ceil.player.alive && ceil.player.y + 30 <= 270 + 1e-6, 'UFO: el techo contiene al jugador sin matarlo');
}
/* WAVE: diagonales a 45° y cambio instantáneo */
{
  const s = mk('wave'); s.player.y = 100; run(s, 1, true);
  const x1 = s.player.x, y1 = s.player.y; run(s, 48, true);
  const dx = s.player.x - x1, dy = s.player.y - y1;
  ok(Math.abs(dx - dy) < 1e-6, `WAVE: mantener = diagonal ascendente 45° (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)})`);
  const x2 = s.player.x, y2 = s.player.y; run(s, 48, false);
  ok(Math.abs((s.player.x - x2) + (s.player.y - y2)) < 1e-6, 'WAVE: soltar = diagonal descendente 45°');
  const s2 = mk('wave'); s2.player.y = 100; run(s2, 1, true); const a = s2.player.vy; run(s2, 1, false); const b = s2.player.vy;
  ok(a > 0 && b < 0 && Math.abs(a + b) < 1e-9, 'WAVE: cambio de dirección en un solo paso');
  const w = mk('wave', [['block', 12, 0, 0], ['block', 12, 1, 0], ['block', 12, 2, 0], ['block', 12, 3, 0], ['block', 12, 4, 0]]); w.player.y = 60;
  run(w, 600, false); ok(!w.player.alive || w.player.y === 0, 'WAVE: las paredes matan o el suelo desliza');
  const f = mk('wave'); f.player.y = 30; run(f, 100, false);
  ok(f.player.alive && f.player.y === -(CFG.PLAYER.size - CFG.WAVE.size) / 2, 'WAVE: desliza por el suelo sin morir (caja de colision 20 u)');
  const wb = mk('wave', [['block', 10, 0, 0]]); wb.player.y = 100; run(wb, 300, false);
  ok(!wb.player.alive, 'WAVE: un bloque en su trayectoria mata (no se desliza por bloques)');
}
/* BALL: la gravedad se invierte de verdad */
{
  const s = mk('ball'); s.player.y = 0; s.prevHeld = false; run(s, 10, false);
  ok(s.player.dir === -1 && s.player.onGround && s.player.y === 0, 'BALL: empieza con gravedad normal sobre el suelo');
  run(s, 1, true); ok(s.player.dir === 1, 'BALL: pulsar invierte la gravedad (dir=+1)');
  run(s, 240, false);
  ok(s.player.alive && s.player.onGround && Math.abs(s.player.y + 30 - CFG.SHIP.ceil) < 1e-6, 'BALL: cae hacia arriba y se posa en el techo');
  const x = s.player.vy; ok(Math.abs(x) < 1e-9, 'BALL: velocidad vertical nula sobre el techo');
  run(s, 1, false); run(s, 1, true); ok(s.player.dir === -1, 'BALL: pulsar en el techo vuelve a gravedad normal');
  run(s, 240, false); ok(s.player.onGround && s.player.y === 0, 'BALL: vuelve al suelo');
  const m = mk('ball'); m.prevHeld = false; run(m, 3, false); run(m, 1, true); run(m, 4, false); const d1 = m.player.dir; run(m, 1, true);
  ok(d1 === 1 && m.player.dir === 1, 'BALL: no se invierte en el aire (hasta aterrizar)');
  const b = mk('ball', [['block', 10, 3, 0]]); b.player.y = 0; b.prevHeld = false;
  run(b, 10, false); run(b, 1, true); run(b, 300, false);
  ok(b.player.alive, 'BALL: puede pasar bajo un bloque flotante rodando por su cara inferior o el techo');
}
/* SPIDER: teletransporte instantáneo a la superficie opuesta */
{
  const s = mk('spider'); s.prevHeld = false;
  run(s, 3, false);
  run(s, 1, true);
  ok(s.player.dir > 0 && Math.abs(s.player.y - (CFG.SHIP.ceil - 30)) < 1e-6, 'SPIDER: un toque la lleva al techo al instante (y=' + s.player.y.toFixed(1) + ')');
  run(s, 6, false); run(s, 1, true);
  ok(s.player.dir < 0 && s.player.y === 0, 'SPIDER: otro toque la devuelve al suelo');
  const wall = mk('spider', [['block', 0, 5, 0], ['block', 0, 6, 0], ['block', 0, 7, 0], ['block', 0, 8, 0]]); wall.prevHeld = false;
  run(wall, 3, false); run(wall, 1, true);
  ok(Math.abs(wall.player.y - (5 * 30 - 30)) < 1e-6 && true, 'SPIDER: con un bloque sobre ella aterriza bajo su cara inferior (y=' + wall.player.y.toFixed(1) + ')');
  const kill = mk('spider', [['block', 12, 0, 0], ['block', 12, 1, 0], ['block', 12, 2, 0], ['block', 12, 3, 0]]);
  run(kill, 400, false);
  ok(!kill.player.alive, 'SPIDER: un muro alto en el suelo la mata si no teletransporta');
  const hold = mk('spider'); hold.prevHeld = false; run(hold, 3, false); run(hold, 240, true);
  ok(hold.player.dir > 0, 'SPIDER: mantener pulsado no repite el teletransporte');
}
/* TRIGGERS: toggle desactiva colisión; color e interpolación */
{
  const wall = [0, 1, 2].map((y) => ['block', 20, y, 0, { g: [3] }]);
  const mkT = (trigs) => mk('cube', [...wall, ...trigs]);
  const a = mkT([]); run(a, 600, false);
  ok(!a.player.alive, 'TRIGGER: sin toggle el muro mata');
  const b = mkT([['trig_toggle', 10, 12, 0, { g: 3, on: false }]]); run(b, 600, false);
  ok(b.player.alive && b.player.x > 20 * 30 + 30, 'TRIGGER: toggle apagado deja pasar el muro');
  const c = mk('cube', [['trig_color', 5, 12, 0, { t: 'bg', c: '#ff0000', d: 2 }]]);
  run(c, 1, false);
  const t0 = c.fx.colorAt('bg', c.time); run(c, 600, false);
  const h1 = c.fx.colorAt('bg', c.time);
  ok(c.fx.i === 1 && Math.abs(h1[0] - 0) < 1e-6 && h1[1] > 99, 'TRIGGER: color llega al destino tras su duración (h=' + h1[0].toFixed(1) + ')');
  const sv = c.save(); const keep = c.fx.i; run(c, 100, false); c.load(sv);
  ok(c.fx.i === keep && c.time === sv.t, 'TRIGGER: save/load restaura el estado de efectos');
  const v = LevelManager.validate({ mode: 'cube', objs: [['start', 0, 0, 0], ['trig_alpha', 5, 5, 0, { g: 0, a: 2, d: 1 }]] });
  ok(!v.ok, 'TRIGGER: validación rechaza parámetros fuera de rango');
}
/* GRAVEDAD, ORBES Y PADS */
{
  const G = (up, x) => [0, 3, 6].map((y) => [up ? 'portal_grav_up' : 'portal_grav_down', x, y, 0]);
  const c = mk('cube', G(true, 10)); run(c, 400, false);
  ok(c.player.gs === -1 && c.player.alive && Math.abs(c.player.y - 240) < 1e-6 && c.player.onGround, 'GRAVEDAD: el cubo invertido cae al techo y se posa (y=' + c.player.y.toFixed(1) + ')');
  c.prevHeld = false; let mn = c.player.y; run(c, 3, true); for (let i = 0; i < 100; i++) { c.step(false); mn = Math.min(mn, c.player.y); }
  ok(c.player.alive && c.player.y - mn > 55 && c.player.y - mn < 70, 'GRAVEDAD: desde el techo salta hacia abajo igual que desde el suelo (' + (c.player.y - mn).toFixed(1) + ')');
  const back = mk('cube', [...G(true, 3), ...G(false, 20)]); run(back, 500, false);
  ok(back.player.gs === 1 && back.player.alive && back.player.y < 241 && back.bounds.ceil === Infinity, 'GRAVEDAD: el portal normal restablece suelo y techo');
  const sh = mk('ship', G(true, 5)); run(sh, 500, false);
  ok(sh.player.alive && Math.abs(sh.player.y - 240) < 1e-6, 'GRAVEDAD: la nave invertida cae hacia el techo');
  const sh2 = mk('ship', G(true, 5)); run(sh2, 400, false); run(sh2, 120, true);
  ok(sh2.player.alive && sh2.player.y < 200, 'GRAVEDAD: la nave invertida baja al mantener pulsado');
  const bl = mk('ball', G(true, 5)); run(bl, 300, false);
  ok(bl.player.dir > 0 && bl.player.alive, 'GRAVEDAD: la ball pasa a gravedad hacia arriba');
  const apex = (objs, f) => { const q = mk('cube', objs); q.prevHeld = false; let m = 0; for (let i = 0; i < 260; i++) { q.step(f(i)); m = Math.max(m, q.player.y); } return { m, q }; };
  const press = (i) => (i >= 100 && i < 104) || (i >= 112 && i < 116);
  const none = apex([], (i) => i >= 100 && i < 104).m;
  const y = apex([['orb_yellow', 5, 2, 0]], press);
  ok(y.m > none + 15, 'ORBE: amarillo da un segundo impulso con otra pulsación (' + y.m.toFixed(0) + ' > ' + none.toFixed(0) + ')');
  const noPress = apex([['orb_yellow', 5, 2, 0]], (i) => i >= 100 && i < 104).m;
  ok(Math.abs(noPress - none) < 1e-6, 'ORBE: la pulsación que salta desde el suelo no activa el orbe');
  const g = apex([['orb_green', 5, 2, 0]], press);
  ok(g.q.player.gs === -1, 'ORBE: verde invierte la gravedad');
  const r = apex([['orb_red', 5, 2, 0]], press).m, p = apex([['orb_pink', 5, 2, 0]], press).m;
  ok(r > y.m && p < y.m, 'ORBE: rojo > amarillo > rosa (' + r.toFixed(0) + ' > ' + y.m.toFixed(0) + ' > ' + p.toFixed(0) + ')');
  const pad = (n) => apex([[n, 4, 0, 0]], () => false).m;
  ok(pad('pad_red') > pad('pad_yellow') && pad('pad_yellow') > pad('pad_pink') && pad('pad_pink') > 40, 'PAD: rojo > amarillo > rosa, sin pulsar (' + pad('pad_red').toFixed(0) + ', ' + pad('pad_yellow').toFixed(0) + ', ' + pad('pad_pink').toFixed(0) + ')');
  const bp = apex([['pad_blue', 4, 0, 0]], () => false);
  ok(bp.q.player.gs === -1, 'PAD: azul invierte la gravedad');
  const sv = y.q.save(); run(y.q, 30, false); y.q.load(sv);
  ok(y.q.used.size === sv.u.size && y.q.player.gs === sv.gs, 'ORBE: save/load restaura orbes usados y gravedad');
}
/* Portales entre los cinco modos */
{
  const objs = [];
  const modes = ['ufo', 'wave', 'ball', 'ship', 'cube'];
  modes.forEach((m, i) => { for (let y = 0; y < 9; y += 3) objs.push(['portal_' + m, 10 + i * 6, y, 0]); });
  const s = mk('cube', objs); const seen = [s.player.mode];
  for (let i = 0; i < 4000 && s.player.alive; i++) { s.step(i % 60 < 3); if (s.player.mode !== seen[seen.length - 1]) seen.push(s.player.mode); }
  ok(seen.join('>') === 'cube>ufo>wave>ball>ship>cube', 'Portales: ' + seen.join('>'));
}
console.log(fails ? fails + ' FALLOS' : 'TODO OK');
process.exit(fails ? 1 : 0);
