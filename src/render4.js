'use strict';
/* ============================================================
   Renderer v4: orbes, pads, portales de gravedad, bloques sólidos
   con otros diseños y decoración nueva (animada, estática y bloques
   decorativos opacos y transparentes). Solo dibuja; no toca la física.
   ============================================================ */
const ORB_COLORS = { yellow: '#ffd800', pink: '#ff6fd0', red: '#ff3b3b', blue: '#2fa8ff', green: '#4dff6d' };
const PAD_COLORS = { yellow: '#ffd800', pink: '#ff6fd0', red: '#ff3b3b', blue: '#2fa8ff' };

(() => {
  const P = Renderer.prototype;
  const TAU = Math.PI * 2;
  /* alpha de dibujo: multiplica el alpha global del objeto (grupos con Alpha) */
  const A = (r, a) => { r.ctx.globalAlpha = a * r.am; };

  /* ----- Bloques sólidos con otros diseños ----- */
  Object.assign(P, {
    solidVariant(type, x, y, w, h, th, s, lw) {
      const c = this.ctx;
      c.fillStyle = 'rgba(4,8,26,0.93)'; c.fillRect(x, y, w, h);
      c.strokeStyle = th.edge; c.fillStyle = th.edge; c.lineWidth = lw;
      c.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
      const k = type.slice(6);
      c.save(); c.beginPath(); c.rect(x + lw, y + lw, w - 2 * lw, h - 2 * lw); c.clip();
      switch (k) {
        case 'glow':
          for (let i = 1; i <= 3; i++) { A(this, 0.5 - i * 0.12); c.strokeRect(x + w * 0.1 * i + lw, y + h * 0.1 * i + lw, w - w * 0.2 * i - 2 * lw, h - h * 0.2 * i - 2 * lw); }
          A(this, 0.3); c.fillRect(x + w * 0.38, y + h * 0.38, w * 0.24, h * 0.24);
          break;
        case 'stripes':
          A(this, 0.4); c.lineWidth = Math.max(1, w * 0.09);
          for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(x + i * w * 0.28, y + h); c.lineTo(x + i * w * 0.28 + w, y); c.stroke(); }
          break;
        case 'circuit':
          A(this, 0.55); c.lineWidth = Math.max(1, w * 0.04);
          c.beginPath(); c.moveTo(x, y + h * 0.3); c.lineTo(x + w * 0.5, y + h * 0.3); c.lineTo(x + w * 0.5, y + h * 0.7); c.lineTo(x + w, y + h * 0.7); c.moveTo(x + w * 0.2, y + h); c.lineTo(x + w * 0.2, y + h * 0.55); c.stroke();
          for (const [dx, dy] of [[0.5, 0.3], [0.5, 0.7], [0.2, 0.55]]) { c.beginPath(); c.arc(x + w * dx, y + h * dy, w * 0.07, 0, TAU); c.fill(); }
          break;
        case 'brick':
          A(this, 0.5); c.lineWidth = Math.max(1, w * 0.04);
          c.beginPath(); c.moveTo(x, y + h * 0.5); c.lineTo(x + w, y + h * 0.5);
          c.moveTo(x + w * 0.5, y); c.lineTo(x + w * 0.5, y + h * 0.5);
          c.moveTo(x + w * 0.25, y + h * 0.5); c.lineTo(x + w * 0.25, y + h);
          c.moveTo(x + w * 0.75, y + h * 0.5); c.lineTo(x + w * 0.75, y + h); c.stroke();
          break;
        case 'tech': {
          A(this, 0.6); c.lineWidth = Math.max(1.5, w * 0.06);
          const m = w * 0.16, l = w * 0.22;
          for (const [px, py, sx, sy] of [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]]) {
            c.beginPath(); c.moveTo(px + sx * l, py); c.lineTo(px, py); c.lineTo(px, py + sy * l); c.stroke();
          }
          A(this, 0.35); c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.14, 0, TAU); c.fill();
          break;
        }
        default: /* crystal */
          A(this, 0.5); c.lineWidth = Math.max(1, w * 0.04);
          c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w / 2, y + h); c.lineTo(x, y + h / 2); c.closePath(); c.stroke();
          A(this, 0.25); c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w * 0.62, y + h / 2); c.lineTo(x + w / 2, y + h); c.lineTo(x + w * 0.38, y + h / 2); c.closePath(); c.fill();
      }
      c.restore();
      A(this, 1);
    },

    /* ----- Orbes ----- */
    orb(o, x, y, w, h, s) {
      const c = this.ctx, col = ORB_COLORS[o.def.orb], t = this.time, cx = x + w / 2, cy = y + h / 2, r = w * 0.27;
      const ph = (o.x * 0.37 + o.y * 0.51) % 1;
      c.save();
      A(this, 0.18); c.fillStyle = col; c.beginPath(); c.arc(cx, cy, w * 0.52, 0, TAU); c.fill();
      const k = (t * 1.4 + ph) % 1;
      A(this, 0.7 * (1 - k)); c.strokeStyle = col; c.lineWidth = Math.max(1, 3 * s); c.beginPath(); c.arc(cx, cy, r + k * w * 0.28, 0, TAU); c.stroke();
      A(this, 1);
      c.beginPath(); c.arc(cx, cy, r * (1 + 0.05 * Math.sin(t * 6 + ph * 6)), 0, TAU); c.fillStyle = col; c.fill();
      c.lineWidth = Math.max(1.2, 2 * s); c.strokeStyle = '#fff'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(cx, cy, r * 0.42, 0, TAU); c.fill();
      if (o.def.orb === 'blue' || o.def.orb === 'green') {
        c.strokeStyle = o.def.orb === 'blue' ? '#0b4d80' : '#116b26'; c.lineWidth = Math.max(1, 1.6 * s);
        c.beginPath(); c.moveTo(cx - r * 0.25, cy - r * 0.15); c.lineTo(cx - r * 0.25, cy + r * 0.2); c.lineTo(cx - r * 0.45, cy);
        c.moveTo(cx + r * 0.25, cy + r * 0.15); c.lineTo(cx + r * 0.25, cy - r * 0.2); c.lineTo(cx + r * 0.45, cy); c.stroke();
      }
      c.restore();
    },

    /* ----- Pads ----- */
    pad(o, x, y, w, h, s) {
      const c = this.ctx, col = PAD_COLORS[o.def.pad], t = this.time;
      c.save();
      if (o.rot === 180) { c.translate(0, y + h / 2); c.scale(1, -1); c.translate(0, -(y + h / 2)); }
      const bx = x + w / 2, by = y + h, pw = w * 0.42;
      A(this, 0.22); c.fillStyle = col; c.beginPath(); c.ellipse(bx, by, pw * 1.5, h * 0.42, 0, Math.PI, 0); c.fill();
      A(this, 1);
      c.beginPath(); c.ellipse(bx, by, pw, h * 0.2, 0, Math.PI, 0); c.closePath();
      c.fillStyle = col; c.fill(); c.strokeStyle = '#000'; c.lineWidth = Math.max(1, 1.6 * s); c.stroke();
      const k = (t * 2) % 1;
      c.strokeStyle = col; c.lineWidth = Math.max(1, 2.2 * s); c.lineJoin = 'round';
      for (let i = 0; i < 2; i++) {
        const f = (k + i * 0.5) % 1;
        A(this, 0.8 * (1 - f));
        const yy = by - h * 0.22 - f * h * 0.5;
        c.beginPath(); c.moveTo(bx - pw * 0.5, yy + h * 0.12); c.lineTo(bx, yy - h * 0.05); c.lineTo(bx + pw * 0.5, yy + h * 0.12); c.stroke();
      }
      c.restore();
      A(this, 1);
    },
  });

  /* ----- Portales de gravedad ----- */
  const basePortal = P.portal;
  P.portal = function (o, x, y, w, h, s) {
    const d = o.def;
    if (!d.grav) return basePortal.call(this, o, x, y, w, h, s);
    const c = this.ctx, t = this.time, cx = x + w / 2, cy = y + h / 2, col = d.grav < 0 ? '#ffd800' : '#2fa8ff';
    c.save();
    A(this, 0.16); c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, w * 0.52 * (1 + 0.05 * Math.sin(t * 5)), h / 2, 0, 0, TAU); c.fill();
    A(this, 0.35); c.strokeStyle = col; c.lineWidth = 9 * s; c.beginPath(); c.ellipse(cx, cy, w * 0.42, h / 2 - 4 * s, 0, 0, TAU); c.stroke();
    A(this, 1); c.lineWidth = 3.5 * s; c.stroke();
    c.lineWidth = 2.6 * s; c.lineJoin = 'round'; c.lineCap = 'round';
    const dir = d.grav < 0 ? -1 : 1;
    for (let i = 0; i < 3; i++) {
      const f = ((t * 1.2 + i / 3) % 1), yy = cy - dir * (h * 0.28) + dir * f * h * 0.56;
      A(this, Math.sin(f * Math.PI));
      c.beginPath(); c.moveTo(cx - w * 0.3, yy - dir * h * 0.05); c.lineTo(cx, yy + dir * h * 0.05); c.lineTo(cx + w * 0.3, yy - dir * h * 0.05); c.stroke();
    }
    c.restore(); A(this, 1);
  };

  /* ----- Decoración nueva ----- */
  const gearPath = (c, r, teeth) => {
    c.beginPath();
    for (let i = 0; i < teeth * 2; i++) { const a = i * Math.PI / teeth, rr = i % 2 ? r * 0.8 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath();
  };
  const hexPath = (c, r) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); };
  const DECO = {
    adeco_gear(r, c, x, y, w, h, th, s, ph, t) { A(r, 0.35); c.translate(x + w / 2, y + h / 2); c.rotate(t * 0.8 * (ph > 0.5 ? 1 : -1)); const R = Math.min(w, h) * 0.45; gearPath(c, R, 8); c.stroke(); c.beginPath(); c.arc(0, 0, R * 0.35, 0, TAU); c.stroke(); c.fillRect(-R * 0.08, -R * 0.08, R * 0.16, R * 0.16); },
    adeco_pulse(r, c, x, y, w, h, th, s, ph, t) { const R = Math.min(w, h) * 0.5; for (let i = 0; i < 3; i++) { const k = (t * 0.7 + i / 3) % 1; A(r, 0.4 * (1 - k)); c.beginPath(); c.arc(x + w / 2, y + h / 2, R * k, 0, TAU); c.stroke(); } A(r, 0.45); c.beginPath(); c.arc(x + w / 2, y + h / 2, R * 0.12, 0, TAU); c.fill(); },
    adeco_arrows(r, c, x, y, w, h, th, s, ph, t) { const k = (t * 0.6) % 1; for (let i = 0; i < 4; i++) { const f = (k + i / 4) % 1; A(r, 0.45 * Math.sin(f * Math.PI)); const px = x + f * w; c.beginPath(); c.moveTo(px - w * 0.05, y + h * 0.15); c.lineTo(px + w * 0.05, y + h / 2); c.lineTo(px - w * 0.05, y + h * 0.85); c.stroke(); } },
    adeco_spark(r, c, x, y, w, h, th, s, ph, t) { for (let i = 0; i < 7; i++) { const f = hash1(ph * 9 + i * 3.1), f2 = hash1(ph * 5 + i * 7.7); A(r, 0.15 + 0.5 * Math.abs(Math.sin(t * (1 + f) + i))); r.star4(x + f * w, y + f2 * h, (3 + 5 * f2) * s); } },
    adeco_wave(r, c, x, y, w, h, th, s, ph, t) { A(r, 0.45); c.beginPath(); for (let i = 0; i <= 24; i++) { const px = x + w * i / 24, py = y + h / 2 + Math.sin(i * 0.8 + t * 3) * h * 0.35; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); },
    adeco_eq(r, c, x, y, w, h, th, s, ph, t) { A(r, 0.4); const n = 6, bw = w / (n * 1.5); for (let i = 0; i < n; i++) { const bh = h * (0.2 + 0.8 * Math.abs(Math.sin(t * 3 + i * 1.3 + ph))); c.fillRect(x + i * bw * 1.5, y + h - bh, bw, bh); } },
    adeco_orbit(r, c, x, y, w, h, th, s, ph, t) { const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) * 0.42; A(r, 0.3); c.beginPath(); c.ellipse(cx, cy, R, R * 0.4, 0.5, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(cx, cy, R, R * 0.4, -0.5, 0, TAU); c.stroke(); A(r, 0.5); c.beginPath(); c.arc(cx, cy, R * 0.14, 0, TAU); c.fill(); for (let i = 0; i < 3; i++) { const a = t * 1.4 + i * TAU / 3; c.beginPath(); c.arc(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.38, R * 0.08, 0, TAU); c.fill(); } },
    sdeco_crystal(r, c, x, y, w, h) { A(r, 0.3); c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w * 0.9, y + h * 0.3); c.lineTo(x + w * 0.7, y + h); c.lineTo(x + w * 0.3, y + h); c.lineTo(x + w * 0.1, y + h * 0.3); c.closePath(); c.stroke(); A(r, 0.2); c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w * 0.35, y + h * 0.3); c.lineTo(x + w * 0.45, y + h); c.lineTo(x + w * 0.7, y + h); c.lineTo(x + w * 0.9, y + h * 0.3); c.closePath(); c.fill(); },
    sdeco_skyline(r, c, x, y, w, h, th, s, ph) { A(r, 0.28); for (let i = 0; i < 6; i++) { const bh = h * (0.3 + 0.7 * hash1(ph * 3 + i * 5.3)); c.fillRect(x + i * w / 6 + 1, y + h - bh, w / 6 - 2, bh); } A(r, 0.4); c.strokeRect(x, y + h - 1, w, 1); },
    sdeco_pillar(r, c, x, y, w, h) { A(r, 0.3); c.fillRect(x + w * 0.25, y + h * 0.06, w * 0.5, h * 0.88); A(r, 0.45); c.fillRect(x + w * 0.1, y, w * 0.8, h * 0.06); c.fillRect(x + w * 0.1, y + h * 0.94, w * 0.8, h * 0.06); for (let i = 1; i < 5; i++) c.strokeRect(x + w * 0.25, y + h * i / 5, w * 0.5, 1); },
    sdeco_cross(r, c, x, y, w, h) { A(r, 0.35); c.strokeRect(x + w * 0.38, y + h * 0.1, w * 0.24, h * 0.8); c.strokeRect(x + w * 0.1, y + h * 0.38, w * 0.8, h * 0.24); },
    sdeco_hex(r, c, x, y, w, h) { c.translate(x + w / 2, y + h / 2); A(r, 0.38); hexPath(c, Math.min(w, h) * 0.46); c.stroke(); A(r, 0.22); hexPath(c, Math.min(w, h) * 0.26); c.stroke(); c.fill(); },
    sdeco_diamond(r, c, x, y, w, h) { A(r, 0.38); c.beginPath(); c.moveTo(x + w / 2, y + h * 0.08); c.lineTo(x + w * 0.92, y + h / 2); c.lineTo(x + w / 2, y + h * 0.92); c.lineTo(x + w * 0.08, y + h / 2); c.closePath(); c.stroke(); },
    sdeco_stairs(r, c, x, y, w, h) { A(r, 0.32); for (let i = 0; i < 3; i++) { c.strokeRect(x + i * w / 3, y + h - (i + 1) * h / 3, w / 3, (i + 1) * h / 3); } A(r, 0.15); for (let i = 0; i < 3; i++) c.fillRect(x + i * w / 3, y + h - (i + 1) * h / 3, w / 3, (i + 1) * h / 3); },
  };
  /* Bloques cuadrados no sólidos: opacos (dblock) y translúcidos (gblock) con 4 diseños */
  const blockDeco = (translucent) => (r, c, x, y, w, h, th, s, ph, t, kind) => {
    const fa = translucent ? 0.22 : 0.9, la = translucent ? 0.5 : 0.7, lw = Math.max(1, 1.5 * s);
    A(r, fa); c.fillStyle = kind === 'plain' ? th.edge : 'rgba(6,12,38,1)'; if (kind === 'plain') { A(r, translucent ? 0.2 : 0.35); } c.fillRect(x, y, w, h);
    A(r, la); c.lineWidth = lw; c.strokeStyle = th.edge; c.fillStyle = th.edge;
    c.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
    if (kind === 'frame') c.strokeRect(x + w * 0.22, y + h * 0.22, w * 0.56, h * 0.56);
    else if (kind === 'grid') { c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke(); }
    else if (kind === 'dots') for (const dx of [0.28, 0.72]) for (const dy of [0.28, 0.72]) { c.beginPath(); c.arc(x + w * dx, y + h * dy, w * 0.07, 0, TAU); c.fill(); }
  };
  for (const k of ['plain', 'frame', 'grid', 'dots']) {
    DECO['dblock_' + k] = (r, c, x, y, w, h, th, s, ph, t) => blockDeco(false)(r, c, x, y, w, h, th, s, ph, t, k);
    DECO['gblock_' + k] = (r, c, x, y, w, h, th, s, ph, t) => blockDeco(true)(r, c, x, y, w, h, th, s, ph, t, k);
  }

  const baseDeco = P.deco;
  P.deco = function (type, x, y, w, h, rot, th, s, ph) {
    const f = DECO[type];
    if (!f) return baseDeco.call(this, type, x, y, w, h, rot, th, s, ph);
    const c = this.ctx;
    c.save(); c.strokeStyle = th.edge; c.fillStyle = th.edge; c.lineWidth = Math.max(1, 2 * s); c.lineJoin = 'round'; c.lineCap = 'round';
    f(this, c, x, y, w, h, th, s, hash1(ph || 0), this.time);
    c.restore();
    A(this, 1);
  };
})();
