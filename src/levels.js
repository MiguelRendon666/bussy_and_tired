'use strict';
/* ============================================================
   Niveles oficiales 2-4 (diseñados a mano, uno por modo nuevo).
   Stereo Madness vive en core.js y no se toca.
   Unidades: bloques. Fila 0 = suelo, filas 0-8 = zona de modo especial (techo en 9).
   ============================================================ */
const LevelKit = {
  make() {
    const o = [];
    let seed = 7;
    const kit = {
      o,
      rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; },
      B: (x, y) => o.push(['block', x, y, 0]),
      R(x, y, w, h) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) o.push(['block', x + i, y + j, 0]); },
      S: (x, y = 0, r = 0) => o.push(['spike', x, y, r]),
      S2: (x, y = 0, r = 0) => o.push(['spike2', x, y, r]),
      S3: (x, y = 0, r = 0) => o.push(['spike3', x, y, r]),
      P: (t, x, y = 0) => o.push([t, x, y, 0]),
      portal(mode, x) { for (let y = 0; y < 9; y += 3) o.push(['portal_' + mode, x, y, 0]); },
      /* Columna con hueco [lo, hi) en las filas 0-8 */
      gate(x, lo, hi, w = 2, spikes = false) {
        for (let i = 0; i < w; i++) {
          for (let y = 0; y < lo; y++) o.push(['block', x + i, y, 0]);
          for (let y = hi; y < 9; y++) o.push(['block', x + i, y, 0]);
          if (spikes && lo > 0) o.push(['spike', x + i, lo, 0]);
          if (spikes && hi < 9) o.push(['spike', x + i, hi - 1, 180]);
        }
      },
      /* Pasillo que sigue una poligonal de filas centrales, con altura libre G */
      corridor(x0, pts, G) {
        const last = pts[pts.length - 1][0];
        for (let i = 0; i <= last; i++) {
          let k = 0;
          while (k < pts.length - 2 && pts[k + 1][0] < i) k++;
          const [c0, r0] = pts[k], [c1, r1] = pts[k + 1];
          const c = r0 + (r1 - r0) * ((i - c0) / (c1 - c0));
          let lo = Math.round(c - G / 2);
          lo = Math.max(0, Math.min(9 - G, lo));
          for (let y = 0; y < lo; y++) o.push(['block', x0 + i, y, 0]);
          for (let y = lo + G; y < 9; y++) o.push(['block', x0 + i, y, 0]);
        }
        return x0 + last;
      },
      /* Decoración repartida con semilla fija */
      scatter(x0, x1, specs) {
        for (const [type, step, y0, y1, jitter] of specs) {
          for (let x = x0 + step * kit.rnd(); x < x1; x += step * (0.7 + (jitter === undefined ? 0.6 : jitter) * kit.rnd())) {
            o.push([type, Math.round(x), Math.round(y0 + (y1 - y0) * kit.rnd()), 0]);
          }
        }
      },
    };
    return kit;
  },
};

const OfficialLevels = {
  /* ---------- Nivel 2: UFO ---------- */
  ufo() {
    const k = LevelKit.make(), { o, R, S, S2, S3, gate } = k;
    o.push(['start', 0, 0, 0]);
    /* A. Impulsos individuales: hay que mantenerse sobre los pinchos del suelo y bajo los del techo */
    S3(30, 0); S3(46, 0); S3(62, 0);
    o.push(['spike3', 78, 8, 180]); o.push(['spike3', 92, 8, 180]);
    S2(106, 0); o.push(['spike2', 114, 8, 180]); S2(122, 0);
    /* B. Pilares bajos con pinchos: un impulso por obstáculo */
    for (const x of [140, 153, 166]) { R(x, 0, 2, 2); S(x, 2); S(x + 1, 2); }
    /* C. Impulsos consecutivos: pilares cada vez más altos */
    for (const [x, h] of [[188, 4], [202, 5], [216, 6], [232, 5]]) { R(x, 0, 2, h); }
    /* D. Control de altura: pasillos cuyo hueco cambia de sitio */
    let gx = 252;
    for (const [lo, hi] of [[1, 7], [3, 9], [0, 6], [4, 9], [2, 8], [1, 6], [4, 9], [0, 5]]) { gate(gx, lo, hi); gx += 10; }
    /* E. Aterrizaje: alfombra de pinchos con plataformas de apoyo */
    gx += 8;
    const e0 = gx;
    for (let i = 0; i < 24; i++) {
      if (i % 8 === 3) { k.B(e0 + i, 0); k.B(e0 + i + 1, 0); i++; } else S(e0 + i, 0);
    }
    for (let i = 6; i < 20; i++) o.push(['spike', e0 + i, 8, 180]);
    /* F. Slalom: pilares de suelo y de techo alternados */
    gx = e0 + 36;
    for (const [lo, hi] of [[5, 9], [0, 4], [6, 9], [0, 3], [5, 9], [0, 5], [6, 9], [0, 4], [4, 9]]) { gate(gx, lo, hi, 2); gx += 11; }
    /* G. Final: triples en el suelo con techo bajo */
    gx += 6;
    for (let i = 0; i < 3; i++) { S3(gx, 0); gate(gx + 10, 0, 6, 2); gx += 22; }
    const endX = gx + 12;
    o.push(['end', endX, 0, 0]);
    /* Decoración: cielo estrellado con planetas y anillos */
    k.scatter(4, endX, [['deco_star', 6, 0, 8, 0.8], ['deco_cluster', 22, 1, 6], ['deco_circle', 52, 3, 5], ['deco_arc', 40, 4, 7], ['deco_orb', 34, 1, 7], ['deco_float', 15, 1, 8], ['deco_line_h', 46, 0, 1]]);
    return { format: 1, id: 'orbital-hop', name: 'Orbital Hop', mode: 'ufo', hue: 268, style: 'stars', diff: 'normal', speed: 'normal', desc: 'Aprende el UFO: un impulso por pulsación, impulsos seguidos, control de altura y aterrizajes.', objs: o };
  },

  /* ---------- Nivel 3: WAVE ---------- */
  wave() {
    const k = LevelKit.make(), { o, B, R, S, S2, S3 } = k;
    o.push(['start', 0, 0, 0]);
    /* A. Subir y bajar en espacio abierto */
    S3(30, 0); o.push(['spike3', 42, 8, 180]); S3(54, 0); o.push(['spike3', 64, 8, 180]);
    S3(76, 0); o.push(['spike3', 86, 8, 180]); S2(96, 0); o.push(['spike2', 104, 8, 180]);
    /* B. Rampas anchas */
    let x = k.corridor(116, [[0, 4], [8, 4], [16, 7], [24, 7], [32, 3], [40, 3], [46, 5]], 7);
    /* C. Zigzag */
    x = k.corridor(x + 8, [[0, 5], [4, 7], [12, 3], [20, 7], [28, 3], [36, 7], [42, 5]], 6);
    /* D. Pasillo estrecho recto con escalones */
    x = k.corridor(x + 8, [[0, 5], [16, 5], [20, 7], [34, 7], [38, 4], [52, 4], [56, 5]], 5);
    /* E. Dientes de sierra: arriba, abajo, arriba... */
    x += 10;
    for (let i = 0; i < 8; i++) {
      const bx = x + i * 9;
      if (i % 2 === 0) { R(bx, 0, 1, 2); S(bx, 2); } else { R(bx, 7, 1, 2); S(bx, 6, 180); }
    }
    x += 8 * 9 + 8;
    /* F. Cambios rápidos: zigzag corto y ancho medio */
    x = k.corridor(x, [[0, 5], [3, 7], [6, 3], [9, 7], [12, 3], [15, 7], [18, 3], [21, 7], [24, 5]], 6);
    x += 8;
    /* G. Final: pasillo de 4 filas */
    x = k.corridor(x, [[0, 5], [10, 5], [14, 7], [24, 7], [28, 4], [38, 4], [44, 6], [52, 6], [56, 5], [62, 5]], 4);
    const endX = x + 14;
    o.push(['end', endX, 0, 0]);
    /* Decoración: retro, líneas de energía y estructuras */
    k.scatter(4, endX, [['deco_line_h', 20, 1, 8], ['deco_tower', 30, 0, 1], ['deco_beam', 36, 0, 1], ['deco_chevrons', 28, 0, 8], ['deco_frame', 40, 2, 5], ['deco_dots', 30, 1, 6], ['deco_float', 18, 1, 8], ['deco_orb', 44, 2, 6]]);
    return { format: 1, id: 'neon-slope', name: 'Neon Slope', mode: 'wave', hue: 190, style: 'grid', diff: 'hard', speed: 'normal', desc: 'Aprende el wave: diagonales, pasillos estrechos y cambios rápidos de dirección.', objs: o };
  },

  /* ---------- Nivel 4: BALL ---------- */
  ball() {
    const k = LevelKit.make(), { o, B, R, S, S2, S3 } = k;
    o.push(['start', 0, 0, 0]);
    const C = (x, y) => o.push(['spike', x, y, 180]);
    /* A. Cambiar de superficie para esquivar */
    S(30); S(48); C(66, 8); C(80, 8); S2(94, 0); o.push(['spike2', 108, 7, 180]); S3(124);
    /* B. Techo bajo: pasillo de 5 filas con pinchos alternos */
    R(140, 5, 44, 4);
    S(150); C(162, 4); S(174); C(184, 4);
    /* C. Cambios seguidos: pasillo de 4 filas */
    R(196, 5, 70, 4);
    for (let i = 0; i < 8; i++) { if (i % 2 === 0) S(206 + i * 7); else C(206 + i * 7, 4); }
    /* D. Muros con hueco abajo o arriba */
    let x = 276;
    for (let i = 0; i < 8; i++) {
      const low = i % 2 === 0;
      for (let y = 0; y < 9; y++) {
        const hole = low ? y < 2 : y > 6;
        if (!hole) k.B(x, y), k.B(x + 1, y);
      }
      x += 11;
    }
    /* E. Pilares alternos de suelo y techo */
    x += 6;
    for (let i = 0; i < 7; i++) {
      if (i % 2 === 0) { R(x, 0, 2, 4); S(x, 4); S(x + 1, 4); } else { R(x, 5, 2, 4); C(x, 4); C(x + 1, 4); }
      x += 12;
    }
    /* F. Plataformas flotantes: se puede rodar por debajo o por encima */
    x += 6;
    for (let i = 0; i < 4; i++) {
      R(x, 4, 7, 1); S(x + 3, 5); S(x + 8, 0); C(x + 8, 8);
      x += 18;
    }
    /* G. Final: alternancia rápida */
    for (let i = 0; i < 8; i++) { if (i % 2 === 0) S2(x + i * 8, 0); else o.push(['spike2', x + i * 8, 8, 180]); }
    x += 8 * 8 + 6;
    const endX = x + 12;
    o.push(['end', endX, 0, 0]);
    /* Decoración: placa de circuitos */
    k.scatter(4, endX, [['deco_frame', 26, 1, 6], ['deco_dots', 22, 0, 6], ['deco_line_v', 24, 1, 3], ['deco_line_h', 30, 1, 8], ['deco_circle', 48, 3, 6], ['deco_tower', 38, 0, 1], ['deco_float', 16, 1, 8], ['deco_chevrons', 30, 1, 8]]);
    return { format: 1, id: 'flip-circuit', name: 'Flip Circuit', mode: 'ball', hue: 330, style: 'circuit', diff: 'hard', speed: 'normal', desc: 'Aprende el ball: cambia la gravedad, rueda por techo y suelo y alterna superficies.', objs: o };
  },
};

/* Nivel 5: demoníaco. Recorre los cinco modos con cambios de velocidad y poco margen. */
OfficialLevels.demon = function demon() {
  const k = LevelKit.make(), { o, R, S, S2, S3 } = k;
  const C = (x, y) => o.push(['spike', x, y, 180]);
  const speed = (key, x) => { o.push(['speed_' + key, x, 0, 0]); o.push(['speed_' + key, x, 2, 0]); };
  /* Túnel continuo con altura libre G; cada `every` columnas un pincho alterno en suelo o techo */
  const tunnel = (x0, pts, G, every) => {
    const last = pts[pts.length - 1][0];
    for (let i = 0; i <= last; i++) {
      let j = 0;
      while (j < pts.length - 2 && pts[j + 1][0] < i) j++;
      const [c0, r0] = pts[j], [c1, r1] = pts[j + 1];
      const c = r0 + (r1 - r0) * ((i - c0) / (c1 - c0));
      const lo = Math.max(0, Math.min(9 - G, Math.round(c - G / 2)));
      for (let y = 0; y < lo; y++) o.push(['block', x0 + i, y, 0]);
      for (let y = lo + G; y < 9; y++) o.push(['block', x0 + i, y, 0]);
      if (every && i % every === 0 && i > 0 && i < last) {
        if ((i / every) % 2) o.push(['spike', x0 + i, lo, 0]); else o.push(['spike', x0 + i, lo + G - 1, 180]);
      }
    }
    return x0 + last;
  };
  o.push(['start', 0, 0, 0]);

  /* A. Cubo 1x: pinchos encadenados y plataformas con pinchos en medio */
  let x = 16;
  S(x); S(x + 6); S2(x + 12); S(x + 18); S3(x + 25); S(x + 33); S2(x + 39); S(x + 46); 
  x += 56;
  R(x, 0, 3, 1); S(x + 3); S(x + 4); R(x + 5, 0, 3, 2); S(x + 8); S(x + 9); S(x + 10); R(x + 11, 0, 2, 1);
  S(x + 15); R(x + 17, 0, 1, 1); S(x + 19); S(x + 24); S2(x + 28);
  x += 42;

  /* B. Cubo 1.24x */
  speed('fast', x); x += 12;
  S(x); S2(x + 8); S(x + 15); S(x + 21); S3(x + 29); S(x + 38); S2(x + 44);
  R(x + 52, 0, 2, 1); S(x + 54); S(x + 55); R(x + 56, 0, 3, 2); S(x + 60); S(x + 66); 
  x += 76;

  /* C. UFO: túnel de 5 filas con pinchos y pendientes */
  speed('normal', x); k.portal('ufo', x + 4); x += 14;
  x = tunnel(x, [[0, 4], [10, 4], [18, 5.5], [28, 5.5], [36, 3.5], [46, 3.5], [54, 5], [64, 5], [72, 4], [82, 4]], 4, 8) + 8;

  /* D. Wave: zigzag estrecho y dientes */
  k.portal('wave', x); x += 12;
  x = tunnel(x, [[0, 5], [3, 6.5], [7, 3.5], [11, 6.5], [15, 3.5], [19, 6.5], [23, 5]], 4, 0) + 3;
  x = tunnel(x, [[0, 5], [6, 5], [10, 7], [16, 7], [22, 3], [30, 3], [34, 5], [40, 5]], 4, 6) + 6;
  for (let i = 0; i < 12; i++) {
    const bx = x + i * 5;
    if (i % 2 === 0) { R(bx, 0, 1, 3); S(bx, 3); } else { R(bx, 6, 1, 3); C(bx, 5); }
  }
  x += 12 * 5 + 8;

  /* E. Ball: túnel de 4 filas con pinchos alternos y muros con hueco */
  k.portal('ball', x); x += 12;
  x = tunnel(x, [[0, 2], [130, 2]], 4, 4) + 8;
  for (let i = 0; i < 5; i++) {
    const low = i % 2 === 0;
    for (let y = 0; y < 9; y++) { if (!(low ? y < 2 : y > 6)) { k.B(x, y); k.B(x + 1, y); } }
    x += 8;
  }
  x += 6;

  /* F. Nave: túnel de 5 filas con pinchos */
  k.portal('ship', x); x += 12;
  x = tunnel(x, [[0, 4], [6, 4], [14, 6], [20, 6], [28, 3.5], [34, 3.5], [42, 5.5], [48, 5.5], [56, 4], [64, 4], [72, 5.5], [80, 5.5], [86, 3.5], [94, 3.5]], 4, 3) + 8;

  /* G. Cubo 1.5x: saltos largos y aterrizajes justos */
  k.portal('cube', x); x += 6; speed('faster', x); x += 12;
  S(x); S2(x + 10); S(x + 20); S3(x + 28); S(x + 40); S2(x + 47);
  R(x + 56, 0, 3, 1); S(x + 59); S(x + 60); R(x + 61, 0, 2, 2); S(x + 65); S2(x + 70); 
  x += 82;
  const endX = x;
  o.push(['end', endX, 0, 0]);
  k.scatter(4, endX, [['deco_arc', 30, 3, 7], ['deco_circle', 46, 2, 6], ['deco_tower', 34, 0, 1], ['deco_beam', 44, 0, 1], ['deco_frame', 40, 1, 6], ['deco_line_h', 26, 1, 8], ['deco_orb', 30, 1, 7], ['deco_chevrons', 36, 1, 8], ['deco_float', 14, 1, 8]]);
  return { format: 1, id: 'abyss-protocol', name: 'Abyss Protocol', mode: 'cube', hue: 350, style: 'arcs', diff: 'demon', speed: 'normal', desc: 'Los cinco modos, tres velocidades y muy poco margen. Cada tramo exige precisión.', objs: o };
};

/* ---------- Nivel 6: Changes after all (escaparate de canales de color, grupos y triggers) ---------- */
OfficialLevels.changes = function () {
  const FxU = typeof FxUtil !== 'undefined' ? FxUtil : require('./core.js').FxUtil;
  const k = LevelKit.make(), { o, B, R, S, S2, S3, gate } = k;
  const hex = (h, s = 100, l = 50) => FxU.hslToHex([h, s, l]);
  const T = (type, x, y, props) => o.push([type, x, y, 0, props]);
  /* Marca como grupo g todo lo creado desde el índice i0 */
  const grp = (i0, g) => { for (let i = i0; i < o.length; i++) o[i] = [o[i][0], o[i][1], o[i][2], o[i][3], { g: [g] }]; };
  /* Cambio de paleta: fondo, suelo, línea y base pasan a un matiz nuevo */
  const paint = (x, hue, d = 1.4) => {
    T('trig_color', x, 12, { t: 'bg', c: hex(hue, 85, 40), d });
    T('trig_color', x, 13, { t: 'ground', c: hex(hue, 70, 30), d });
    T('trig_color', x, 14, { t: 'line', c: hex(hue, 100, 66), d });
    T('trig_color', x, 15, { t: 'obj', c: hex((hue + 25) % 360, 100, 62), d });
  };
  const beat = (x) => T('trig_pulse', x, 16, { tt: 'ch', t: 'obj', c: '#ffffff', fi: 0.04, h: 0.04, fo: 0.3 });
  o.push(['start', 0, 0, 0]);
  /* Estado inicial: la escalera oculta (grupo 4) y la decoración que aparece (grupo 7) */
  T('trig_toggle', 1, 12, { g: 4, on: false });
  T('trig_alpha', 1, 13, { g: 4, a: 0, d: 0 });
  T('trig_alpha', 1, 14, { g: 7, a: 0, d: 0 });

  /* A. Calentamiento: la paleta cambia tres veces y la base late a ritmo */
  S(30); S2(42); S(54); S(62); S3(74);
  R(90, 0, 3, 1); S(93); S(94); R(95, 0, 2, 2); S(99); S2(108);
  paint(24, 305); paint(64, 165); paint(110, 35);
  for (let x = 20; x < 118; x += 10) beat(x);

  /* B. Grupos: un muro (g3) que desaparece y una escalera (g4) que aparece */
  const w0 = o.length;
  R(158, 0, 2, 3);
  grp(w0, 3);
  S(150);
  T('trig_toggle', 146, 12, { g: 3, on: false });
  T('trig_pulse', 140, 16, { tt: 'g', t: 3, c: '#ff4d4d', fi: 0.05, h: 0.35, fo: 0.2 });
  S2(130);
  S(174);
  const s0 = o.length;
  R(182, 0, 2, 1); R(184, 0, 2, 2); R(186, 0, 2, 3);
  grp(s0, 4);
  T('trig_toggle', 172, 12, { g: 4, on: true });
  T('trig_alpha', 172, 13, { g: 4, a: 1, d: 0.6 });
  T('trig_pulse', 173, 14, { tt: 'g', t: 4, c: '#ffffff', fi: 0.05, h: 0.2, fo: 0.4 });
  S(194); S2(204);
  paint(176, 345);

  /* C. Nave: pasillo con la paleta cambiando a mitad de camino */
  k.portal('ship', 218);
  let x = 226;
  x = k.corridor(x, [[0, 4], [10, 4], [18, 6], [28, 6], [36, 3.5], [46, 3.5], [54, 5], [64, 5]], 5) + 8;
  paint(228, 195, 0.8); paint(262, 270, 1.2);
  for (let bx = 230; bx < x; bx += 10) beat(bx);
  /* La decoración del grupo 7 aparece al entrar en la nave */
  const d0 = o.length;
  for (let dx = 232; dx < x; dx += 14) { o.push(['deco_orb', dx, 1 + (dx % 3) * 2, 0]); o.push(['deco_float', dx + 6, 6 + (dx % 2) * 2, 0]); }
  grp(d0, 7);
  T('trig_alpha', 227, 14, { g: 7, a: 1, d: 1.5 });
  T('trig_pulse', 250, 17, { tt: 'g', t: 7, c: '#00e5ff', fi: 0.1, h: 0.5, fo: 0.6 });

  /* D. Final: cubo, ritmo constante y cierre de color */
  k.portal('cube', x); x += 12;
  paint(x - 6, 55, 1);
  S(x); S2(x + 11); S(x + 21); S3(x + 30);
  R(x + 44, 0, 3, 1); S(x + 47); S(x + 48); R(x + 49, 0, 2, 2); S(x + 53);
  S(x + 62); S2(x + 72);
  for (let bx = x - 6; bx < x + 80; bx += 5) beat(bx);
  paint(x + 60, 200, 2);
  x += 90;
  const endX = x;
  o.push(['end', endX, 0, 0]);
  k.scatter(4, endX, [['deco_arc', 30, 3, 7], ['deco_circle', 46, 2, 6], ['deco_line_h', 26, 1, 8], ['deco_chevrons', 36, 1, 8], ['deco_tower', 38, 0, 1]]);
  return { format: 1, id: 'changes-after-all', name: 'Changes after all', mode: 'cube', hue: 205, style: 'aurora', diff: 'normal', speed: 'normal', desc: 'Escaparate de triggers: cambios de paleta, pulsos, y objetos que aparecen y desaparecen.', objs: o };
};

/* ---------- Nivel 7: Witzy witzy spider (fácil y largo; recorre todos los vehículos y termina en spider) ---------- */
OfficialLevels.spider = function () {
  const FxU = typeof FxUtil !== 'undefined' ? FxUtil : require('./core.js').FxUtil;
  const k = LevelKit.make(), { o, R, S, S2, S3, gate } = k;
  const hex = (h, s = 100, l = 50) => FxU.hslToHex([h, s, l]);
  const T = (type, x, y, props) => o.push([type, x, y, 0, props]);
  const C = (x, y = 8) => o.push(['spike', x, y, 180]);
  const paint = (x, hue, d = 1.2) => {
    T('trig_color', x, 12, { t: 'bg', c: hex(hue, 85, 40), d });
    T('trig_color', x, 13, { t: 'ground', c: hex(hue, 70, 30), d });
    T('trig_color', x, 14, { t: 'line', c: hex(hue, 100, 66), d });
    T('trig_color', x, 15, { t: 'obj', c: hex((hue + 25) % 360, 100, 62), d });
  };
  o.push(['start', 0, 0, 0]);
  let x = 24;

  /* 1. Cubo: pinchos sueltos y una plataforma baja */
  S(x); S(x + 14); S2(x + 28); S(x + 44); S(x + 58);
  R(x + 72, 0, 3, 1); S(x + 79); S(x + 92);
  x += 108;

  /* 2. Nave: pasillo ancho */
  paint(x - 6, 180);
  k.portal('ship', x); x += 8;
  x = k.corridor(x, [[0, 4], [12, 4], [22, 5.5], [34, 5.5], [44, 3.5], [56, 3.5], [66, 4.5], [80, 4.5]], 7) + 10;

  /* 3. UFO: puertas con huecos amplios */
  paint(x - 6, 30);
  k.portal('ufo', x); x += 18;
  for (const [lo, hi] of [[1, 8], [2, 9], [0, 7], [2, 9], [1, 8], [0, 7], [2, 9]]) { gate(x, lo, hi); x += 14; }
  x += 6;

  /* 4. Wave: diagonales suaves en un pasillo ancho */
  paint(x - 6, 190);
  k.portal('wave', x); x += 8;
  x = k.corridor(x, [[0, 4], [14, 4], [24, 6], [36, 6], [46, 3], [58, 3], [68, 5], [84, 5]], 7) + 10;

  /* 5. Ball: cambios de superficie con espacio de sobra */
  paint(x - 6, 350);
  k.portal('ball', x); x += 16;
  for (let i = 0; i < 8; i++) { if (i % 2 === 0) S(x); else C(x); x += 14; }
  x += 6;

  /* 6. Spider (mitad del nivel): teletransportes entre suelo y techo */
  paint(x - 6, 285);
  k.portal('spider', x); x += 16;
  for (let i = 0; i < 8; i++) { if (i % 2 === 0) S(x); else C(x); x += 14; }
  R(x, 0, 2, 4); x += 16;
  R(x, 5, 2, 4); x += 16;
  R(x, 0, 2, 4); x += 20;

  /* 7. Vuelta al cubo */
  paint(x - 6, 120);
  k.portal('cube', x); x += 16;
  S(x); S2(x + 14); S(x + 28); S(x + 42);
  R(x + 54, 0, 3, 1); S(x + 61);
  x += 76;

  /* 8. Nave, UFO, wave y ball cortos */
  paint(x - 6, 200);
  k.portal('ship', x); x += 8;
  x = k.corridor(x, [[0, 4], [10, 4], [18, 5.5], [30, 5.5], [38, 3.5], [48, 3.5]], 7) + 10;
  k.portal('ufo', x); x += 18;
  for (const [lo, hi] of [[1, 8], [2, 9], [0, 7], [2, 9]]) { gate(x, lo, hi); x += 14; }
  x += 6;
  k.portal('wave', x); x += 8;
  x = k.corridor(x, [[0, 4], [12, 4], [22, 6], [34, 6], [44, 3], [52, 3]], 7) + 10;
  k.portal('ball', x); x += 16;
  for (let i = 0; i < 5; i++) { if (i % 2 === 0) S(x); else C(x); x += 14; }
  x += 6;

  /* 9. Final en spider */
  paint(x - 6, 300, 2);
  k.portal('spider', x); x += 16;
  for (let i = 0; i < 6; i++) { if (i % 2 === 0) S(x); else C(x); x += 14; }
  R(x, 0, 2, 4); x += 16;
  R(x, 5, 2, 4); x += 16;
  S2(x); x += 16;
  C(x); C(x + 1); x += 16;
  R(x, 0, 2, 4); x += 14;
  R(x, 5, 2, 4); x += 14;
  S(x); x += 14;
  C(x); x += 20;
  const endX = x;
  o.push(['end', endX, 0, 0]);
  k.scatter(4, endX, [['deco_star', 10, 1, 8], ['deco_cluster', 30, 2, 6], ['deco_orb', 40, 2, 6], ['deco_arc', 46, 3, 7], ['deco_float', 16, 1, 8], ['deco_chevrons', 36, 1, 8]]);
  return { format: 1, id: 'witzy-witzy-spider', name: 'Witzy witzy spider', mode: 'cube', hue: 285, style: 'stars', diff: 'easy', speed: 'normal', desc: 'Largo y tranquilo: pasa por todos los vehículos y termina trepando como una spider.', objs: o };
};

if (typeof module !== 'undefined') module.exports = { LevelKit, OfficialLevels };
