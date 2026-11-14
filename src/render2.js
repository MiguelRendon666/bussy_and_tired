'use strict';
/* ============================================================
   Renderer v2: vehículos, decoración, fondos temáticos y portales.
   Se añade al prototipo de Renderer (app1.js) sin tocar el motor.
   ============================================================ */
const MODE_COLORS = { cube: '#7dff00', ship: '#ff2fb3', ufo: '#ff9f2e', wave: '#00e5ff', ball: '#ff4d4d', spider: '#b44cff' };
const hash1 = (n) => { const h = Math.sin(n * 12.9898) * 43758.5453; return h - Math.floor(h); };

Object.assign(Renderer.prototype, {
  time: 0,
  bgS: 1, bgL: 1,
  /* hsl de fondo: escala saturación y claridad según el canal de fondo. */
  hb(h, s, l, a) {
    const S = Math.min(100, s * this.bgS), L = Math.min(100, l * this.bgL);
    return a === undefined ? `hsl(${h},${S}%,${L}%)` : `hsla(${h},${S}%,${L}%,${a})`;
  },
  /* Icono de trigger (solo editor): color objetivo si lo tiene y una letra por tipo. */
  triggerIcon(o, x, y, w, h, s) {
    const c = this.ctx, p = o.props, glyph = { trig_color: 'C', trig_pulse: 'P', trig_alpha: 'A', trig_toggle: 'T' }[o.type];
    const col = p && p.c ? p.c : o.type === 'trig_toggle' ? (p && p.on === false ? '#ff4d4d' : '#7dff00') : '#9aa6d6';
    c.save();
    c.fillStyle = 'rgba(8,12,34,.92)'; c.fillRect(x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.84);
    c.strokeStyle = col; c.lineWidth = Math.max(1.5, 2.5 * s); c.setLineDash([5 * s, 3 * s]);
    c.strokeRect(x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.84); c.setLineDash([]);
    c.fillStyle = col; c.font = `bold ${Math.max(8, 15 * s)}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(glyph, x + w / 2, y + h / 2);
    c.restore();
  },

  star4(x, y, r) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x, y - r); c.lineTo(x + r * 0.22, y - r * 0.22); c.lineTo(x + r, y); c.lineTo(x + r * 0.22, y + r * 0.22);
    c.lineTo(x, y + r); c.lineTo(x - r * 0.22, y + r * 0.22); c.lineTo(x - r, y); c.lineTo(x - r * 0.22, y - r * 0.22);
    c.closePath(); c.fill();
  },

  /* ----- Fondos temáticos ----- */
  bg_stars(v, hue) {
    const c = this.ctx, w = this.w, h = this.h, t = this.time;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.hb(hue, 60, 7)); g.addColorStop(1, this.hb((hue + 25) % 360, 65, 24));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const pl = 1900, pp = 0.03;
    const k = Math.floor((v.x * pp) / pl);
    for (let i = k - 1; i <= k + 2; i++) {
      const cx = (i * pl + 900 - v.x * pp) * v.s, cy = h * (0.3 + 0.25 * hash1(i + 3)), r = (60 + 50 * hash1(i + 9)) * v.s;
      if (cx < -r * 2 || cx > w + r * 2) continue;
      const rg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      rg.addColorStop(0, this.hb((hue + 30) % 360, 80, 60)); rg.addColorStop(1, this.hb((hue + 10) % 360, 70, 18));
      c.globalAlpha = 0.55; c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.3; c.strokeStyle = this.hb((hue + 40) % 360, 90, 75); c.lineWidth = Math.max(1, 3 * v.s);
      c.beginPath(); c.ellipse(cx, cy, r * 1.6, r * 0.35, -0.4, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = '#fff';
    const layers = [[0.06, 90, 1.2, 4], [0.14, 70, 1.8, 3], [0.28, 55, 2.6, 2]];
    layers.forEach(([par, step, sz, per], li) => {
      const k0 = Math.floor((v.x * par) / step), cols = Math.ceil(w / (step * v.s)) + 2;
      for (let i = 0; i < cols; i++) {
        const kk = k0 + i;
        for (let j = 0; j < per; j++) {
          const f = hash1(kk * 7.3 + j * 3.1 + li * 11), f2 = hash1(kk * 2.7 + j * 5.9 + li);
          const sx = (kk * step - v.x * par + f * step) * v.s, sy = f2 * h * 0.92;
          c.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * (0.6 + f) + kk + j));
          const s = sz * v.s * (0.7 + f2 * 0.8);
          if (li === 2 && f > 0.6) this.star4(sx, sy, s * 2.4); else c.fillRect(sx, sy, s, s);
        }
      }
    });
    c.globalAlpha = 1;
  },
  bg_circuit(v, hue) {
    const c = this.ctx, w = this.w, h = this.h, t = this.time;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.hb(hue, 45, 9)); g.addColorStop(1, this.hb(hue, 55, 17));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const cell = 60, par = 0.22, k0 = Math.floor((v.x * par) / cell), cols = Math.ceil(w / (cell * v.s)) + 2, rows = Math.ceil(CFG.VIEW_H / cell) + 1;
    c.lineWidth = Math.max(1, 1.6 * v.s); c.strokeStyle = this.hb(hue, 90, 60); c.fillStyle = this.hb(hue, 95, 70);
    for (let i = 0; i < cols; i++) {
      const kk = k0 + i, x0 = (kk * cell - v.x * par) * v.s;
      for (let j = 0; j < rows; j++) {
        const f = hash1(kk * 13.1 + j * 7.7), y0 = h - (j * cell + 20) * v.s * 1.0 + 0 * f;
        c.globalAlpha = 0.16 + 0.1 * f;
        c.beginPath();
        if (f < 0.4) { c.moveTo(x0, y0); c.lineTo(x0 + cell * v.s, y0); }
        else if (f < 0.75) { c.moveTo(x0, y0); c.lineTo(x0 + cell * 0.5 * v.s, y0); c.lineTo(x0 + cell * 0.5 * v.s, y0 - cell * 0.5 * v.s); }
        else { c.moveTo(x0, y0); c.lineTo(x0, y0 - cell * 0.7 * v.s); }
        c.stroke();
        if (f > 0.55) { c.globalAlpha = 0.35; c.fillRect(x0 - 2 * v.s, y0 - 2 * v.s, 4 * v.s, 4 * v.s); }
        if (f > 0.85) {
          const p = (t * 0.7 + f * 9) % 1;
          c.globalAlpha = 0.8; c.fillRect(x0 + p * cell * v.s - 2 * v.s, y0 - 2 * v.s, 4 * v.s, 4 * v.s);
        }
      }
    }
    c.globalAlpha = 1;
  },
  bg_arcs(v, hue) {
    const c = this.ctx, w = this.w, h = this.h, t = this.time;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.hb(hue, 70, 14)); g.addColorStop(1, this.hb((hue + 35) % 360, 75, 30));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sp = 640, par = 0.1, k0 = Math.floor((v.x * par) / sp);
    c.lineWidth = Math.max(1.5, 5 * v.s);
    for (let i = k0 - 1; i <= k0 + Math.ceil(w / (sp * v.s)) + 1; i++) {
      const cx = (i * sp + sp * 0.5 - v.x * par) * v.s, cy = h * (0.45 + 0.3 * hash1(i + 5));
      for (let r = 0; r < 4; r++) {
        const rad = (50 + r * 36 + 40 * hash1(i)) * v.s;
        c.globalAlpha = 0.08 + 0.05 * (4 - r);
        c.strokeStyle = r % 2 ? this.hb((hue + 60) % 360, 90, 70) : '#fff';
        const a0 = t * (0.15 + r * 0.05) * (i % 2 ? 1 : -1) + i;
        c.beginPath(); c.arc(cx, cy, rad, a0, a0 + Math.PI * (0.9 + 0.2 * r)); c.stroke();
      }
    }
    c.globalAlpha = 1;
  },
  bg_aurora(v, hue) {
    const c = this.ctx, w = this.w, h = this.h, t = this.time;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.hb((hue + 200) % 360, 60, 8)); g.addColorStop(1, this.hb(hue, 55, 18));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const steps = 26;
    for (let b = 0; b < 3; b++) {
      const gr = c.createLinearGradient(0, h * 0.1, 0, h * 0.75);
      gr.addColorStop(0, this.hb((hue + b * 50) % 360, 90, 60, 0)); gr.addColorStop(0.5, this.hb((hue + b * 50) % 360, 90, 60, 0.32)); gr.addColorStop(1, this.hb((hue + b * 50) % 360, 90, 60, 0));
      c.fillStyle = gr; c.beginPath(); c.moveTo(0, h);
      const par = 0.05 + b * 0.03;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w, wx = v.x * par + (x / v.s);
        const y = h * (0.28 + b * 0.1) + Math.sin(wx * 0.01 + t * 0.5 + b * 2) * h * 0.07 + Math.sin(wx * 0.027 + t * 0.3) * h * 0.03;
        c.lineTo(x, y);
      }
      c.lineTo(w, h); c.closePath(); c.fill();
    }
    c.fillStyle = '#fff';
    const step = 80, k0 = Math.floor((v.x * 0.1) / step);
    for (let i = 0; i < Math.ceil(w / (step * v.s)) + 2; i++) {
      const kk = k0 + i, f = hash1(kk * 3.3);
      c.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(t + kk));
      c.fillRect((kk * step - v.x * 0.1) * v.s, f * h * 0.5, 2 * v.s, 2 * v.s);
    }
    c.globalAlpha = 1;
  },
  bg_grid(v, hue) {
    const c = this.ctx, w = this.w, h = this.h, t = this.time, hz = h * 0.55;
    const g = c.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, this.hb((hue + 100) % 360, 70, 10)); g.addColorStop(1, this.hb((hue + 60) % 360, 80, 38));
    c.fillStyle = g; c.fillRect(0, 0, w, hz);
    c.fillStyle = this.hb(hue, 60, 10); c.fillRect(0, hz, w, h - hz);
    const sx = w * 0.7 - ((v.x * 0.02) % (w * 1.5)), r = Math.min(h * 0.28, w * 0.2);
    const sg = c.createLinearGradient(0, hz - r * 2, 0, hz);
    sg.addColorStop(0, '#ffe14d'); sg.addColorStop(1, '#ff2fb3');
    c.fillStyle = sg; c.beginPath(); c.arc(sx, hz, r, Math.PI, 0); c.fill();
    c.fillStyle = this.hb((hue + 60) % 360, 80, 38);
    for (let i = 0; i < 5; i++) c.fillRect(sx - r, hz - r * (0.15 + i * 0.17), r * 2, r * 0.035 * (i + 1));
    c.strokeStyle = this.hb(hue, 100, 65); c.lineWidth = Math.max(1, 1.5 * v.s); c.globalAlpha = 0.4;
    c.beginPath();
    for (let i = -14; i <= 14; i++) { c.moveTo(w / 2, hz); c.lineTo(w / 2 + i * w * 0.22 - ((v.x * 1.2) % (w * 0.22)), h); }
    const ph = (v.x * 0.004 + t * 0.05) % 1;
    for (let i = 0; i < 9; i++) { const f = (i + ph) / 9, y = hz + (h - hz) * f * f; c.moveTo(0, y); c.lineTo(w, y); }
    c.stroke(); c.globalAlpha = 1;
  },

  /* ----- Decoración ----- */
  deco(type, x, y, w, h, rot, th, s, ph) {
    const c = this.ctx, t = this.time, lw = Math.max(1, 2 * s), cx = x + w / 2, cy = y + h / 2;
    c.save(); c.strokeStyle = th.edge; c.fillStyle = th.edge; c.lineWidth = lw; c.lineJoin = 'round';
    switch (type) {
      case 'deco_tri':
        c.globalAlpha = 0.28; c.translate(cx, cy); c.rotate(rot * Math.PI / 180);
        c.beginPath(); c.moveTo(-w / 2, h / 2); c.lineTo(0, -h / 2); c.lineTo(w / 2, h / 2); c.closePath(); c.stroke();
        break;
      case 'deco_ring':
        c.globalAlpha = 0.28; c.beginPath(); c.arc(cx, cy, w * 0.38, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(cx, cy, w * 0.16, 0, Math.PI * 2); c.fill();
        break;
      case 'deco_bars':
        c.globalAlpha = 0.28; c.fillRect(x + w * 0.2, y, w * 0.22, h); c.fillRect(x + w * 0.58, y + h * 0.2, w * 0.22, h * 0.8);
        break;
      case 'deco_star':
        c.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2 + ph); c.fillStyle = '#fff'; this.star4(cx, cy, w * 0.4);
        break;
      case 'deco_cluster':
        c.fillStyle = '#fff';
        for (let i = 0; i < 9; i++) {
          const f = hash1(ph + i * 1.7), g2 = hash1(ph * 2 + i * 3.1);
          c.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * (1 + f) + i));
          if (i < 3) this.star4(x + f * w, y + g2 * h, 7 * s); else c.fillRect(x + f * w, y + g2 * h, 2.5 * s, 2.5 * s);
        }
        break;
      case 'deco_arc':
        c.globalAlpha = 0.3; c.lineWidth = Math.max(2, 5 * s); c.translate(cx, cy); c.rotate((rot + Math.sin(t * 0.4 + ph) * 6) * Math.PI / 180);
        c.beginPath(); c.arc(0, h / 2, w / 2, Math.PI, 0); c.stroke();
        c.globalAlpha = 0.18; c.beginPath(); c.arc(0, h / 2, w * 0.38, Math.PI, 0); c.stroke();
        break;
      case 'deco_circle': {
        const r = w / 2, rg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        rg.addColorStop(0, 'rgba(255,255,255,0.22)'); rg.addColorStop(1, 'rgba(255,255,255,0.02)');
        c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 0.3; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 0.18; c.beginPath(); c.arc(cx, cy, r * 0.62, 0, Math.PI * 2); c.stroke();
        break;
      }
      case 'deco_frame': {
        const pulse = 0.2 + 0.12 * Math.sin(t * 1.5 + ph);
        c.globalAlpha = pulse + 0.1; c.strokeRect(x, y, w, h);
        c.globalAlpha = pulse; c.strokeRect(x + w * 0.16, y + h * 0.16, w * 0.68, h * 0.68);
        c.globalAlpha = pulse + 0.15; const k = w * 0.2;
        c.beginPath(); c.moveTo(x - k * 0.3, y + k); c.lineTo(x - k * 0.3, y - k * 0.3); c.lineTo(x + k, y - k * 0.3);
        c.moveTo(x + w + k * 0.3, y + h - k); c.lineTo(x + w + k * 0.3, y + h + k * 0.3); c.lineTo(x + w - k, y + h + k * 0.3); c.stroke();
        break;
      }
      case 'deco_dots':
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          c.globalAlpha = 0.15 + 0.3 * Math.abs(Math.sin(t * 1.4 + i * 0.7 + j * 0.9 + ph));
          c.beginPath(); c.arc(x + (i + 0.5) * w / 4, y + (j + 0.5) * h / 4, Math.max(1.5, w * 0.04), 0, Math.PI * 2); c.fill();
        }
        break;
      case 'deco_line_h': {
        c.globalAlpha = 0.25; c.beginPath(); c.moveTo(x, cy); c.lineTo(x + w, cy); c.stroke();
        const p = (t * 0.5 + ph * 0.13) % 1;
        c.globalAlpha = 0.9; c.fillStyle = '#fff'; c.fillRect(x + p * w * 0.85, cy - lw, w * 0.15, lw * 2);
        break;
      }
      case 'deco_line_v': {
        c.globalAlpha = 0.25; c.beginPath(); c.moveTo(cx, y); c.lineTo(cx, y + h); c.stroke();
        const p = 1 - ((t * 0.5 + ph * 0.13) % 1);
        c.globalAlpha = 0.9; c.fillStyle = '#fff'; c.fillRect(cx - lw, y + p * h * 0.85, lw * 2, h * 0.15);
        break;
      }
      case 'deco_tower': {
        c.globalAlpha = 0.18; c.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.9);
        c.globalAlpha = 0.35; c.strokeRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.9);
        c.beginPath(); c.moveTo(cx, y); c.lineTo(cx, y + h * 0.1); c.stroke();
        c.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
          c.globalAlpha = 0.15 + 0.5 * (Math.sin(t * 2 + i * 1.3 + ph) > 0.2 ? 1 : 0.2);
          c.fillRect(x + w * 0.3, y + h * (0.18 + i * 0.13), w * 0.4, h * 0.04);
        }
        break;
      }
      case 'deco_float': {
        const by = Math.sin(t * 1.6 + ph) * h * 0.18;
        c.globalAlpha = 0.35; c.translate(cx, cy + by); c.rotate(t * 0.6 + ph);
        c.strokeRect(-w * 0.28, -w * 0.28, w * 0.56, w * 0.56);
        c.globalAlpha = 0.18; c.fillRect(-w * 0.14, -w * 0.14, w * 0.28, w * 0.28);
        break;
      }
      case 'deco_orb': {
        const r = w * (0.5 + 0.06 * Math.sin(t * 1.8 + ph)), rg = c.createRadialGradient(cx, cy, 0, cx, cy, r);
        rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(0.35, th.edge); rg.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 0.4; c.fillStyle = rg; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        break;
      }
      case 'deco_chevrons': {
        const dir = rot === 180 ? -1 : 1, off = ((t * 0.8 + ph) % 1) * (w / 3);
        c.lineWidth = Math.max(1.5, 3 * s);
        for (let i = -1; i < 3; i++) {
          const px = x + i * w / 3 + off * dir + (dir < 0 ? w / 3 : 0);
          if (px < x - 1 || px > x + w) continue;
          c.globalAlpha = 0.35;
          c.beginPath();
          if (dir > 0) { c.moveTo(px, y); c.lineTo(px + h * 0.5, cy); c.lineTo(px, y + h); } else { c.moveTo(px, y); c.lineTo(px - h * 0.5, cy); c.lineTo(px, y + h); }
          c.stroke();
        }
        break;
      }
      case 'deco_beam': {
        const gr = c.createLinearGradient(0, y + h, 0, y);
        gr.addColorStop(0, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = 0.5 + 0.2 * Math.sin(t * 1.2 + ph); c.fillStyle = gr;
        c.beginPath(); c.moveTo(x + w * 0.3, y + h); c.lineTo(x + w * 0.7, y + h); c.lineTo(x + w * 0.95, y); c.lineTo(x + w * 0.05, y); c.closePath(); c.fill();
        break;
      }
    }
    c.restore();
  },

  /* ----- Portales ----- */
  portal(o, x, y, w, h, s) {
    const c = this.ctx, d = o.def, cx = x + w / 2, cy = y + h / 2, t = this.time;
    if (d.mode) {
      const col = MODE_COLORS[d.mode], pulse = 1 + 0.05 * Math.sin(t * 5);
      c.fillStyle = col; c.globalAlpha = 0.16; c.beginPath(); c.ellipse(cx, cy, w * 0.52 * pulse, h / 2, 0, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.35; c.strokeStyle = col; c.lineWidth = 9 * s; c.beginPath(); c.ellipse(cx, cy, w * 0.42, h / 2 - 4 * s, 0, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1; c.lineWidth = 3.5 * s; c.stroke();
      c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = 2.2 * s;
      const g = 6 * s;
      c.beginPath();
      if (d.mode === 'cube') c.rect(cx - g, cy - g, g * 2, g * 2);
      else if (d.mode === 'ship') { c.moveTo(cx - g * 1.3, cy + g * 0.6); c.lineTo(cx - g * 0.6, cy - g * 0.6); c.lineTo(cx + g * 1.3, cy); c.lineTo(cx + g * 0.8, cy + g * 0.8); c.closePath(); }
      else if (d.mode === 'ufo') { c.ellipse(cx, cy + g * 0.4, g * 1.4, g * 0.6, 0, 0, Math.PI * 2); c.moveTo(cx - g * 0.6, cy); c.arc(cx, cy, g * 0.6, Math.PI, 0); }
      else if (d.mode === 'wave') { c.moveTo(cx - g * 1.2, cy + g * 0.8); c.lineTo(cx, cy - g * 0.8); c.lineTo(cx + g * 1.2, cy + g * 0.8); }
      else if (d.mode === 'spider') {
        c.rect(cx - g * 0.6, cy - g * 0.6, g * 1.2, g * 1.2);
        for (const sx of [-1, 1]) for (const dy of [-0.4, 0.4]) { c.moveTo(cx + sx * g * 0.6, cy + dy * g); c.lineTo(cx + sx * g * 1.4, cy + dy * g * 2); }
      } else c.arc(cx, cy, g, 0, Math.PI * 2);
      c.stroke();
    } else {
      const n = { slow: 1, normal: 2, fast: 3, faster: 4 }[d.speed];
      const col = { slow: '#ffb000', normal: '#00e5ff', fast: '#7dff00', faster: '#ff2fb3' }[d.speed];
      c.fillStyle = col; c.globalAlpha = 0.14; c.fillRect(x, y, w, h); c.globalAlpha = 1;
      c.strokeStyle = col; c.lineWidth = 3 * s; c.lineJoin = 'round';
      for (let i = 0; i < n; i++) {
        const px = x + w * (0.14 + 0.2 * i);
        c.beginPath(); c.moveTo(px, cy - h * 0.22); c.lineTo(px + w * 0.3, cy); c.lineTo(px, cy + h * 0.22); c.stroke();
      }
    }
  },

  /* ----- Vehículos ----- */
  cubeGlyph(c, shape, u) {
    c.fillStyle = '#000'; c.strokeStyle = '#000';
    switch (shape) {
      case 0: c.fillRect(-3.2 * u, -2 * u, 1.8 * u, 2.6 * u); c.fillRect(1.4 * u, -2 * u, 1.8 * u, 2.6 * u); c.fillRect(-2.6 * u, 2 * u, 5.2 * u, 1.2 * u); break;
      case 1: c.fillRect(-1.5 * u, -1.5 * u, 3 * u, 3 * u); break;
      case 2: c.lineWidth = u * 1.2; c.beginPath(); c.moveTo(-3 * u, 3 * u); c.lineTo(3 * u, -3 * u); c.stroke(); break;
      case 3: c.lineWidth = u * 1.1; c.beginPath(); c.moveTo(-3 * u, -3 * u); c.lineTo(3 * u, 3 * u); c.moveTo(3 * u, -3 * u); c.lineTo(-3 * u, 3 * u); c.stroke(); break;
      case 4: c.lineWidth = u * 1.1; c.beginPath(); c.arc(0, 0, 2.6 * u, 0, Math.PI * 2); c.stroke(); break;
      default: c.fillRect(-3.2 * u, -2.4 * u, 6.4 * u, 1 * u); c.fillRect(-3.2 * u, -0.5 * u, 6.4 * u, 1 * u); c.fillRect(-3.2 * u, 1.4 * u, 6.4 * u, 1 * u);
    }
  },
  /* Mini cubo (cabina de nave y UFO): hereda colores del jugador */
  miniCube(c, size, icon) {
    const h = size / 2;
    c.fillStyle = icon.c1; c.fillRect(-h, -h, size, size);
    c.fillStyle = icon.c2; c.fillRect(-h * 0.55, -h * 0.55, size * 0.55, size * 0.55);
    c.strokeStyle = '#000'; c.lineWidth = 1.6; c.strokeRect(-h, -h, size, size);
    this.cubeGlyph(c, icon.shape, size / 10);
  },
  ship(cx, cy, size, rotDeg, icon, an) {
    const c = this.ctx, k = size / 30, t = this.time;
    const thrust = an && an.held ? 1 : 0.35, flick = 0.8 + 0.25 * Math.sin(t * 40);
    const bob = Math.sin(t * 12) * 0.5;
    c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k, k); c.translate(0, bob);
    c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.7; c.strokeStyle = '#000';
    /* llama del motor */
    const fl = 10 + 14 * thrust * flick;
    c.beginPath(); c.moveTo(-21, -3); c.lineTo(-21 - fl, 3); c.lineTo(-21, 9); c.closePath();
    c.fillStyle = icon.fx; c.globalAlpha = 0.9; c.fill();
    c.beginPath(); c.moveTo(-21, 0); c.lineTo(-21 - fl * 0.55, 3); c.lineTo(-21, 6); c.closePath();
    c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1;
    /* ala trasera */
    c.beginPath(); c.moveTo(-20, 2); c.lineTo(-28, -12); c.lineTo(-12, -2); c.closePath();
    c.fillStyle = icon.c1; c.fill(); c.stroke();
    /* ala delantera inferior */
    const wf = an ? Math.max(-4, Math.min(4, an.vy * 0.01)) : 0;
    c.beginPath(); c.moveTo(-8, 8); c.lineTo(-18, 20 + wf); c.lineTo(8, 11); c.closePath();
    c.fillStyle = icon.c1; c.fill(); c.stroke();
    /* casco */
    c.beginPath(); c.moveTo(-22, 0); c.lineTo(-17, -5); c.lineTo(12, -5); c.lineTo(27, 3); c.lineTo(15, 12); c.lineTo(-17, 12); c.lineTo(-22, 8); c.closePath();
    c.fillStyle = icon.c2; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-14, 6); c.lineTo(20, 6); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke();
    c.fillStyle = icon.c1; c.fillRect(-12, 7.5, 24, 2.2);
    c.strokeStyle = '#000'; c.lineWidth = 1.7;
    /* motor */
    c.fillStyle = '#222'; c.fillRect(-25, -2, 6, 12); c.strokeRect(-25, -2, 6, 12);
    c.fillStyle = icon.fx; c.fillRect(-26, 1, 2.5, 6);
    /* cabina */
    c.save(); c.translate(1, -8.5);
    c.beginPath(); c.arc(0, 3.5, 11, Math.PI, 0); c.closePath();
    c.fillStyle = 'rgba(190,240,255,0.55)'; c.fill(); c.stroke();
    c.beginPath(); c.rect(-5.5, -5.5, 11, 11); c.clip();
    c.translate(0, 0.5); this.miniCube(c, 11, icon);
    c.restore();
    c.restore();
  },
  ufo(cx, cy, size, rotDeg, icon, an) {
    const c = this.ctx, k = size / 30, t = this.time;
    const flap = an && an.flapT > 0 ? an.flapT : 0;
    c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k, k);
    c.lineJoin = 'round'; c.lineWidth = 1.7; c.strokeStyle = '#000';
    /* propulsor inferior */
    const fl = 3 + 10 * flap + 2 * Math.sin(t * 30);
    c.beginPath(); c.moveTo(-6, 11); c.lineTo(0, 11 + fl); c.lineTo(6, 11); c.closePath();
    c.fillStyle = icon.fx; c.globalAlpha = 0.5 + 0.5 * flap; c.fill(); c.globalAlpha = 1;
    /* patas */
    c.beginPath(); c.moveTo(-10, 10); c.lineTo(-14, 15); c.moveTo(10, 10); c.lineTo(14, 15); c.stroke();
    /* cúpula con cubo */
    c.beginPath(); c.arc(0, -2, 11, Math.PI, 0); c.closePath(); c.fillStyle = 'rgba(190,240,255,0.55)'; c.fill(); c.stroke();
    c.save(); c.beginPath(); c.arc(0, -2, 10, Math.PI, 0); c.clip(); c.translate(0, -6.5); this.miniCube(c, 11, icon); c.restore();
    /* platillo */
    c.beginPath(); c.ellipse(0, 4, 23, 8, 0, 0, Math.PI * 2); c.fillStyle = icon.c2; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(0, 3, 23, 8, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.stroke();
    c.beginPath(); c.ellipse(0, 6.5, 17, 4, 0, 0, Math.PI); c.fillStyle = icon.c1; c.fill();
    c.strokeStyle = '#000';
    /* luces */
    for (let i = -2; i <= 2; i++) {
      c.fillStyle = Math.floor(t * 6 + i) % 2 ? icon.fx : '#fff'; c.beginPath(); c.arc(i * 8, 4 + Math.abs(i) * 0.3, 1.8, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
  wave(cx, cy, size, rotDeg, icon) {
    const c = this.ctx, k = size / 30;
    c.save(); c.translate(cx, cy); c.rotate(rotDeg * Math.PI / 180); c.scale(k * 0.8, k * 0.8);
    c.lineJoin = 'round'; c.lineWidth = 2; c.strokeStyle = '#000';
    c.beginPath(); c.moveTo(18, 0); c.lineTo(-12, -13); c.lineTo(-6, 0); c.lineTo(-12, 13); c.closePath();
    c.fillStyle = icon.c1; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(11, 0); c.lineTo(-5, -6.5); c.lineTo(-2, 0); c.lineTo(-5, 6.5); c.closePath();
    c.fillStyle = icon.c2; c.fill();
    c.beginPath(); c.arc(3, 0, 2.2, 0, Math.PI * 2); c.fillStyle = '#000'; c.fill();
    c.restore();
  },
  ball(cx, cy, size, rotDeg, icon, an) {
    const c = this.ctx, r = size / 2;
    c.save(); c.translate(cx, cy);
    if (an && an.flipT > 0) {
      c.strokeStyle = icon.fx; c.globalAlpha = an.flipT; c.lineWidth = Math.max(1.5, size * 0.1);
      c.beginPath(); c.arc(0, 0, r * (1.15 + (1 - an.flipT) * 0.9), 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    c.rotate(rotDeg * Math.PI / 180);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = icon.c1; c.fill();
    c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.fillStyle = icon.c2; c.fill();
    c.strokeStyle = '#000'; c.lineWidth = Math.max(1.5, size * 0.07);
    c.beginPath(); c.arc(0, 0, r - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
    c.lineWidth = Math.max(1.2, size * 0.06);
    c.beginPath(); c.moveTo(-r * 0.62, 0); c.lineTo(r * 0.62, 0); c.moveTo(0, -r * 0.62); c.lineTo(0, r * 0.62); c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.2, 0, Math.PI * 2); c.fillStyle = icon.c1; c.fill(); c.stroke();
    c.restore();
  },
  player(v, x, y, rot, mode, icon, an) {
    const cx = this.X(v, x + 15), cy = this.Y(v, y + 15), size = 30 * v.s;
    if (mode === 'ship') this.ship(cx, cy, size, rot, icon, an);
    else if (mode === 'ufo') this.ufo(cx, cy, size, rot, icon, an);
    else if (mode === 'wave') this.wave(cx, cy, size, rot, icon, an);
    else if (mode === 'ball') this.ball(cx, cy, size, rot, icon, an);
    else if (mode === 'spider') this.spider(cx, cy, size, rot, icon, an);
    else this.cube(cx, cy, size, rot, icon);
  },
  waveTrail(v, pts, icon) {
    if (pts.length < 2) return;
    const c = this.ctx;
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.strokeStyle = pass ? '#fff' : icon.fx; c.lineWidth = Math.max(1.5, (pass ? 3 : 8) * v.s);
      for (let i = 1; i < pts.length; i++) {
        c.globalAlpha = (i / pts.length) * (pass ? 0.9 : 0.55);
        c.beginPath(); c.moveTo(this.X(v, pts[i - 1].x), this.Y(v, pts[i - 1].y)); c.lineTo(this.X(v, pts[i].x), this.Y(v, pts[i].y)); c.stroke();
      }
    }
    c.globalAlpha = 1;
  },
});
