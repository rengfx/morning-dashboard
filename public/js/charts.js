// SVG chart helpers for the Today page. Width is 358 user units; the SVG scales to the screen.
import { hm, fm } from './time.js';

export const COL = {
  panel: '#15171A', night: '#07080A', rule: '#2B2D31', text: '#ECEAE4', muted: '#A3A29C', faint: '#5B5D62',
  amber: '#F2B35E', green: '#7DD3A0', coral: '#FF8A65', violet: '#B59CFF', sky: '#7FC8F8', gold: '#FDB927',
};
const W = 358;
const f = (v) => (Math.round(v * 10) / 10).toString();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function scale(h0, h1) {
  const t0 = h0 * 60, t1 = h1 * 60;
  return { x: (min) => Math.max(0, Math.min(W, (min - t0) / (t1 - t0) * W)), t0, t1, h0, h1 };
}

/** [[min, value]] from an hourly block (time list optional). */
export function pts(values, times) {
  const out = []; const seen = new Set();
  (values || []).forEach((v, i) => { const t = times ? hm(times[i]) : i * 60; if (v != null && !seen.has(t)) { seen.add(t); out.push([t, v]); } });
  return out.sort((a, b) => a[0] - b[0]);
}
export const valAt = (p, t) => { for (let k = 1; k < p.length; k++) if (t <= p[k][0]) { const [a, va] = p[k - 1], [b, vb] = p[k]; return va + (vb - va) * (t - a) / (b - a); } return p.length ? p[p.length - 1][1] : null; };

export function tideFn(hilo) {
  const p = (hilo || []).map((x) => [hm(x.t) + 1440 * (x.dayOffset || 0), x.ft]).sort((a, b) => a[0] - b[0]);
  return (t) => { for (let k = 1; k < p.length; k++) { const [a, ha] = p[k - 1], [b, hb] = p[k]; if (a <= t && t <= b) return ha + (hb - ha) * (1 - Math.cos(Math.PI * (t - a) / (b - a))) / 2; } return null; };
}

export const text = (x, y, s, col, o = {}) => `<text x="${f(x)}" y="${f(y)}" fill="${col}" font-size="${o.size || 10}" font-family="IBM Plex Mono, monospace"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.bold ? ' font-weight="600"' : ''}>${esc(s)}</text>`;
export const rect = (x, y, w, h, fill, o = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(Math.max(0, w))}" height="${f(Math.max(0, h))}" fill="${fill}" ${o}></rect>`;
export const vline = (x, y0, y1, col, o = '') => `<line x1="${f(x)}" y1="${y0}" x2="${f(x)}" y2="${y1}" stroke="${col}" ${o}></line>`;
export const poly = (p, col, o = '') => (p.length < 2 ? '' : `<polyline points="${p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="${col}" stroke-linejoin="round" stroke-linecap="round" ${o}></polyline>`);

/** Label x that stays inside the chart: returns [x, anchor]. */
export const lx = (x) => (x < 40 ? [x + 4, 'start'] : x > W - 40 ? [x - 4, 'end'] : [x, 'middle']);

export function darkBands(sc, rise, set, H) {
  let s = '';
  const r = hm(rise), st = hm(set);
  if (r > sc.t0) s += rect(0, 0, sc.x(r), H, COL.night);
  if (st < sc.t1) s += rect(sc.x(st), 0, W - sc.x(st), H, COL.night);
  return s;
}
export function ticks(sc, y, step) {
  let s = '';
  for (let h = sc.h0; h <= sc.h1; h += step) {
    const x = sc.x(h * 60), a = h === sc.h0 ? 'start' : h === sc.h1 ? 'end' : 'middle';
    s += text(a === 'start' ? 1 : a === 'end' ? W - 1 : x, y, String(h % 24).padStart(2, '0'), COL.muted, { anchor: a });
  }
  return s;
}
export function rainBars(sc, pop, H, maxH, minPct = 1) {
  let s = '';
  for (const [t, v] of pop) {
    if (v < minPct || t < sc.t0 || t >= sc.t1) continue;
    const x0 = sc.x(t), x1 = sc.x(Math.min(t + 60, sc.t1));
    s += rect(x0 + 2, H - v / 100 * maxH, x1 - x0 - 4, v / 100 * maxH, COL.sky, 'fill-opacity="0.85"');
  }
  return s;
}
export const nowLine = (sc, now, H, label = false) => {
  if (now == null) return '';
  const t = hm(now); if (t < sc.t0 || t > sc.t1) return '';
  const x = sc.x(t);
  return vline(x, 0, H, COL.text, 'stroke-width="1.5"') + (label ? text(x + 4, 12, 'NOW', COL.text) : '');
};
export const svg = (h, label, body) => `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
export { fm, hm, esc, W };
