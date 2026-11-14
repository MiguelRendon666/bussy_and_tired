'use strict';
/* ============================================================
   Renderer v3: modo spider y variantes de diseño por vehículo.
   Cada vehículo tiene VARIANTS diseños; el 0 es el original.
   ============================================================ */
(() => {
  const P = Renderer.prototype, KEYS = ['ship', 'ufo', 'wave', 'ball'];
  const base = {};
  const vOf = (icon, k) => (icon && icon.v && icon.v[k]) | 0;
  for (const name of KEYS) {
    base[name] = P[name];
    P[name] = function (cx, cy, size, rot, icon, an) {
      const v = vOf(icon, name);
      if (!v) return base[name].call(this, cx, cy, size, rot, icon, an);
      return this[name + 'V'](v, cx, cy, size, rot, icon, an);
    };
  }
  const poly = (c, pts, fill) => {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath(); c.fillStyle = fill; c.fill(); c.stroke();
  };
  const ellipse = (c, x, y, rx, ry, fill) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.stroke(); };

  Object.assign(P, {
    /* Cabina de cristal con mini cubo, común a nave y UFO */
    dome(c, icon, x, y, r) {
      c.save(); c.translate(x, y);
      c.beginPath(); c.arc(0, 3.5, r, Math.PI, 0); c.closePath(); c.fillStyle = 'rgba(190,240,255,0.55)'; c.fill(); c.stroke();
      c.beginPath(); c.rect(-5.5, -5.5, 11, 11); c.clip(); c.translate(0, 0.5); this.miniCube(c, 11, icon);
      c.restore();
    },

    shipV(v, cx, cy, size, rotDeg, icon, an) {
      const c = this.ctx, k = size / 30, t = this.time;
      const thrust = an && an.held ? 1 : 0.35, flick = 0.8 + 0.25 * Math.sin(t * 40);
      c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k, k); c.translate(0, Math.sin(t * 12) * 0.5);
      c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.7; c.strokeStyle = '#000';
      const fl = 10 + 14 * thrust * flick;
      c.beginPath(); c.moveTo(-23, -1); c.lineTo(-23 - fl, 4); c.lineTo(-23, 9); c.closePath();
      c.fillStyle = icon.fx; c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
      switch (v) {
        case 1: /* Dardo */
          poly(c, [[-20, 2], [-27, -12], [-8, 3]], icon.c1);
          poly(c, [[-24, 5], [-10, -2], [29, 5], [-10, 12]], icon.c2);
          c.fillStyle = icon.c1; c.fillRect(-9, 4, 24, 2.4);
          break;
        case 2: /* Cápsula */
          poly(c, [[-6, 9], [-16, 20], [8, 11]], icon.c1);
          poly(c, [[-14, 0], [-23, -10], [-2, -1]], icon.c1);
          ellipse(c, 0, 5, 24, 9, icon.c2);
          c.fillStyle = icon.c1; c.fillRect(-10, 7, 22, 2.4);
          break;
        case 3: /* Ala delta */
          poly(c, [[-10, 4], [-22, -15], [3, 2]], icon.c1);
          poly(c, [[-25, -5], [27, 5], [-25, 15]], icon.c2);
          poly(c, [[-25, -5], [-13, -4], [-13, 14], [-25, 15]], icon.c1);
          break;
        case 4: /* Blindada */
          c.fillStyle = '#222'; c.fillRect(-27, -2, 7, 6); c.strokeRect(-27, -2, 7, 6); c.fillRect(-27, 7, 7, 6); c.strokeRect(-27, 7, 7, 6);
          c.fillStyle = icon.c2; c.fillRect(-20, -3, 46, 18); c.strokeRect(-20, -3, 46, 18);
          c.fillStyle = icon.c1; c.fillRect(-20, 9, 46, 4);
          c.fillStyle = '#000'; for (let i = 0; i < 5; i++) c.fillRect(-16 + i * 9, 2, 2.2, 2.2);
          break;
        default: /* Orbital */
          poly(c, [[14, 0], [20, -10], [22, -10], [16, 0]], icon.c1);
          ellipse(c, 0, 6, 17, 9, icon.c2);
          c.beginPath(); c.ellipse(0, 7, 28, 4.5, -0.12, 0, Math.PI * 2); c.strokeStyle = icon.c1; c.lineWidth = 3.4; c.stroke();
          c.strokeStyle = '#000'; c.lineWidth = 1.7;
          c.beginPath(); c.ellipse(0, 7, 28, 4.5, -0.12, 0, Math.PI * 2); c.stroke();
      }
      this.dome(c, icon, 1, -8.5, 11);
      c.restore();
    },

    ufoV(v, cx, cy, size, rotDeg, icon, an) {
      const c = this.ctx, k = size / 30, t = this.time, flap = an && an.flapT > 0 ? an.flapT : 0;
      c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k, k);
      c.lineJoin = 'round'; c.lineWidth = 1.7; c.strokeStyle = '#000';
      const fl = 3 + 10 * flap + 2 * Math.sin(t * 30);
      c.beginPath(); c.moveTo(-6, 11); c.lineTo(0, 11 + fl); c.lineTo(6, 11); c.closePath();
      c.fillStyle = icon.fx; c.globalAlpha = 0.5 + 0.5 * flap; c.fill(); c.globalAlpha = 1;
      const lights = (y, n, sp) => { for (let i = -n; i <= n; i++) { c.fillStyle = Math.floor(t * 6 + i) % 2 ? icon.fx : '#fff'; c.beginPath(); c.arc(i * sp, y, 1.8, 0, Math.PI * 2); c.fill(); } };
      switch (v) {
        case 1: /* Alto: cúpula grande y platillo fino */
          c.beginPath(); c.moveTo(-8, 10); c.lineTo(-12, 15); c.moveTo(8, 10); c.lineTo(12, 15); c.stroke();
          this.dome(c, icon, 0, -8, 13);
          ellipse(c, 0, 5, 22, 6, icon.c2); lights(5, 2, 8);
          break;
        case 2: /* Triangular */
          this.dome(c, icon, 0, -10, 10);
          poly(c, [[-23, 11], [-9, -1], [9, -1], [23, 11]], icon.c2);
          c.fillStyle = icon.c1; c.fillRect(-18, 8, 36, 3); lights(5, 1, 9);
          break;
        case 3: /* Anillo y tres patas */
          c.beginPath(); c.moveTo(-9, 11); c.lineTo(-15, 16); c.moveTo(0, 12); c.lineTo(0, 17); c.moveTo(9, 11); c.lineTo(15, 16); c.stroke();
          this.dome(c, icon, 0, -6, 11);
          ellipse(c, 0, 5, 18, 8, icon.c2);
          c.beginPath(); c.ellipse(0, 5, 25, 4, 0, 0, Math.PI * 2); c.strokeStyle = icon.c1; c.lineWidth = 3.2; c.stroke();
          c.strokeStyle = '#000'; c.lineWidth = 1.7; c.beginPath(); c.ellipse(0, 5, 25, 4, 0, 0, Math.PI * 2); c.stroke();
          break;
        case 4: /* Bola */
          this.dome(c, icon, 0, -9, 10);
          ellipse(c, 0, 4, 13, 12, icon.c2);
          c.fillStyle = icon.c1; c.beginPath(); c.arc(0, 4, 6, 0, Math.PI * 2); c.fill(); c.stroke();
          lights(4, 1, 8);
          break;
        default: /* Cuadrado */
          this.dome(c, icon, 0, -7, 11);
          c.fillStyle = icon.c2; c.fillRect(-22, -2, 44, 13); c.strokeRect(-22, -2, 44, 13);
          c.fillStyle = icon.c1; c.fillRect(-22, 7, 44, 4);
          lights(2, 2, 9);
      }
      c.restore();
    },

    waveV(v, cx, cy, size, rotDeg, icon) {
      const c = this.ctx, k = size / 30;
      c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k * 0.8, k * 0.8);
      c.lineJoin = 'round'; c.lineWidth = 2; c.strokeStyle = '#000';
      switch (v) {
        case 1: /* Flecha doble */
          poly(c, [[20, 0], [-6, -14], [-1, 0], [-6, 14]], icon.c1);
          poly(c, [[6, 0], [-16, -11], [-11, 0], [-16, 11]], icon.c2);
          break;
        case 2: /* Diamante */
          poly(c, [[19, 0], [0, -14], [-15, 0], [0, 14]], icon.c1);
          poly(c, [[10, 0], [0, -7], [-8, 0], [0, 7]], icon.c2);
          break;
        case 3: /* Cohete */
          poly(c, [[-4, -4], [-17, -14], [-12, -2]], icon.c1); poly(c, [[-4, 4], [-17, 14], [-12, 2]], icon.c1);
          poly(c, [[22, 0], [6, -6], [-14, -6], [-14, 6], [6, 6]], icon.c2);
          c.fillStyle = icon.c1; c.fillRect(-14, -2, 14, 4);
          break;
        case 4: /* Media luna */
          c.beginPath(); c.moveTo(19, 0); c.quadraticCurveTo(-2, -22, -15, -8); c.quadraticCurveTo(-4, 0, -15, 8); c.quadraticCurveTo(-2, 22, 19, 0); c.closePath();
          c.fillStyle = icon.c1; c.fill(); c.stroke();
          c.beginPath(); c.arc(4, 0, 3, 0, Math.PI * 2); c.fillStyle = icon.c2; c.fill(); c.stroke();
          break;
        default: /* Estrella */
          poly(c, [[20, 0], [3, -3], [0, -15], [-3, -3], [-16, 0], [-3, 3], [0, 15], [3, 3]], icon.c1);
          c.beginPath(); c.arc(1, 0, 3.2, 0, Math.PI * 2); c.fillStyle = icon.c2; c.fill(); c.stroke();
      }
      c.restore();
    },

    ballV(v, cx, cy, size, rotDeg, icon, an) {
      const c = this.ctx, r = size / 2, lw = Math.max(1.5, size * 0.07);
      c.save(); c.translate(cx, cy);
      if (an && an.flipT > 0) {
        c.strokeStyle = icon.fx; c.globalAlpha = an.flipT; c.lineWidth = Math.max(1.5, size * 0.1);
        c.beginPath(); c.arc(0, 0, r * (1.15 + (1 - an.flipT) * 0.9), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      }
      c.rotate(rotDeg * Math.PI / 180);
      c.strokeStyle = '#000'; c.lineWidth = lw; c.lineJoin = 'round';
      const disc = (rad, fill) => { c.beginPath(); c.arc(0, 0, rad, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); c.stroke(); };
      switch (v) {
        case 1: { /* Engranaje */
          c.beginPath();
          for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * 0.82 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          c.closePath(); c.fillStyle = icon.c1; c.fill(); c.stroke();
          disc(r * 0.5, icon.c2); disc(r * 0.18, icon.c1);
          break;
        }
        case 2: /* Ojo */
          disc(r, icon.c2); disc(r * 0.55, icon.c1); disc(r * 0.24, '#000');
          break;
        case 3: /* Gajos */
          for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, i * Math.PI / 3, (i + 1) * Math.PI / 3); c.closePath(); c.fillStyle = i % 2 ? icon.c2 : icon.c1; c.fill(); }
          c.beginPath(); c.arc(0, 0, r - lw / 2, 0, Math.PI * 2); c.stroke();
          disc(r * 0.18, icon.c2);
          break;
        case 4: /* Planeta con anillo */
          disc(r * 0.78, icon.c1);
          c.beginPath(); c.ellipse(0, 0, r * 1.05, r * 0.3, -0.4, 0, Math.PI * 2); c.strokeStyle = icon.c2; c.lineWidth = lw * 1.8; c.stroke();
          c.strokeStyle = '#000'; c.lineWidth = lw * 0.6; c.stroke();
          break;
        default: /* Núcleo */
          disc(r, icon.c1); disc(r * 0.7, icon.c2); disc(r * 0.4, icon.c1);
          c.fillStyle = '#000'; this.star4(0, 0, r * 0.32);
      }
      c.restore();
    },

    /* Spider: cuerpo y patas que se mueven al correr; se voltea al estar en el techo */
    spider(cx, cy, size, rotDeg, icon, an) {
      const c = this.ctx, k = size / 30, t = this.time, v = vOf(icon, 'spider');
      const run = an && an.run, ph = run ? t * 16 : 0;
      c.save(); c.translate(cx, cy);
      if (an && an.flipT > 0) {
        c.strokeStyle = icon.fx; c.globalAlpha = an.flipT; c.lineWidth = Math.max(1.5, size * 0.1);
        c.beginPath(); c.arc(0, 0, size * 0.5 * (1.15 + (1 - an.flipT) * 0.9), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      }
      if (an && an.dir > 0) c.scale(1, -1);
      c.scale(k, k);
      c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = '#000';
      const leg = (x0, y0, sx, sy, w, col) => {
        c.lineWidth = w + 2.6; c.strokeStyle = '#000';
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(sx[0], sy[0]); c.lineTo(sx[1], sy[1]); c.stroke();
        c.lineWidth = w; c.strokeStyle = col;
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(sx[0], sy[0]); c.lineTo(sx[1], sy[1]); c.stroke();
      };
      /* n patas por lado, repartidas entre xa y xb, con fase alternada */
      const legs = (n, xa, xb, reach, drop, w, col) => {
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < n; i++) {
            const x0 = xa + (xb - xa) * (n === 1 ? 0.5 : i / (n - 1)), sw = Math.sin(ph + i * 1.7 + (side > 0 ? Math.PI : 0)) * 3.2 * (run ? 1 : 0);
            const kx = x0 + side * reach * 0.55 + sw, ky = 7 + (run ? Math.cos(ph + i * 1.7) * 1.2 : 0);
            leg(x0, 4, [kx, x0 + side * reach + sw * 0.5], [ky, 15], w, col);
          }
        }
      };
      const eye = (x, y, r) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.lineWidth = 1; c.strokeStyle = '#000'; c.stroke(); c.fillStyle = '#000'; c.beginPath(); c.arc(x + r * 0.25, y, r * 0.45, 0, Math.PI * 2); c.fill(); };
      switch (v) {
        case 1: /* Larga: 6 patas finas */
          legs(3, -6, 6, 11, 0, 1.6, icon.c2);
          c.beginPath(); c.ellipse(0, -1, 8, 10, 0, 0, Math.PI * 2); c.fillStyle = icon.c1; c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#000'; c.stroke();
          c.beginPath(); c.ellipse(0, 0, 4.5, 6, 0, 0, Math.PI * 2); c.fillStyle = icon.c2; c.fill();
          eye(2.5, -5, 3.4);
          break;
        case 2: /* Escarabajo */
          legs(2, -5, 5, 8, 0, 2.2, icon.c2);
          c.beginPath(); c.ellipse(0, 0, 13, 10, 0, 0, Math.PI * 2); c.fillStyle = icon.c1; c.fill(); c.lineWidth = 1.7; c.strokeStyle = '#000'; c.stroke();
          c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 10); c.stroke();
          c.fillStyle = icon.c2; c.beginPath(); c.ellipse(-5.5, 0, 4.5, 7, 0, 0, Math.PI * 2); c.ellipse(5.5, 0, 4.5, 7, 0, 0, Math.PI * 2); c.fill();
          eye(8, -4, 2.2);
          break;
        case 3: /* Robot */
          legs(2, -6, 6, 9, 0, 2.6, '#555');
          c.fillStyle = icon.c1; c.fillRect(-11, -11, 22, 17); c.lineWidth = 1.8; c.strokeStyle = '#000'; c.strokeRect(-11, -11, 22, 17);
          c.fillStyle = '#000'; c.fillRect(-8, -8, 16, 6); c.fillStyle = icon.fx; c.fillRect(-6, -6.5, 5, 3); c.fillRect(1, -6.5, 5, 3);
          c.fillStyle = icon.c2; c.fillRect(-9, 0, 18, 4);
          break;
        case 4: /* Tarántula */
          legs(4, -7, 7, 13, 0, 2, icon.c2);
          c.beginPath(); c.arc(0, -1, 10, 0, Math.PI * 2); c.fillStyle = icon.c1; c.fill(); c.lineWidth = 1.8; c.strokeStyle = '#000'; c.stroke();
          c.beginPath(); c.arc(-1, 1, 5.5, 0, Math.PI * 2); c.fillStyle = icon.c2; c.fill();
          eye(-1.5, -6, 2); eye(3.5, -6, 2); eye(-4.5, -3.5, 1.5); eye(6, -3.2, 1.5);
          break;
        case 5: { /* Pixel */
          legs(2, -6, 6, 10, 0, 3, icon.c2);
          c.fillStyle = icon.c1; c.lineWidth = 1.6; c.strokeStyle = '#000';
          const px = [[-6, -9], [0, -9], [-9, -3], [-3, -3], [3, -3], [-6, 3], [0, 3]];
          for (const [x, y] of px) { c.fillRect(x, y, 6, 6); c.strokeRect(x, y, 6, 6); }
          c.fillStyle = icon.c2; c.fillRect(-3, 0, 6, 3);
          c.fillStyle = '#000'; c.fillRect(-2, -7, 2, 2); c.fillRect(3, -7, 2, 2);
          break;
        }
        default: /* Clásica */
          legs(2, -6, 6, 12, 0, 2.2, icon.c2);
          c.fillStyle = icon.c1; c.fillRect(-11, -11, 22, 18); c.lineWidth = 1.8; c.strokeStyle = '#000'; c.strokeRect(-11, -11, 22, 18);
          c.fillStyle = icon.c2; c.fillRect(-7, -7, 14, 10);
          eye(-3.5, -4, 2.8); eye(3.5, -4, 2.8);
          c.fillStyle = '#000'; c.fillRect(-3, 2, 6, 1.4);
      }
      c.restore();
    },
  });
})();
