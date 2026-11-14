// R24 Pier view: the sky as seen from the end of Venice Pier. Turn 360° (drag, buttons, arrow keys);
// time = tonight after sunset, a sky event, or any time on the slider. Real Moon and planet positions.
import { partsIn, TZ } from './time.js';
import * as A from './astro.js';
import { PLANETS } from './skyevents.js';

const W = 358, H = 230, HOR = 172, FOV = 110, K = 2.3; // px per degree of altitude
const D = Math.PI / 180;
const f = (v) => (Math.round(v * 10) / 10).toString();
const COLS = { mercury: '#B9B6AD', venus: '#E8D9B5', mars: '#E07B5B', jupiter: '#E6C79A', saturn: '#D8C79A' };
const NAME = { mercury: 'MERCURY', venus: 'VENUS', mars: 'MARS', jupiter: 'JUPITER', saturn: 'SATURN' };

// Rough skyline from the pier end (azimuth ranges, degrees): land runs north → east → south; ocean to the west.
import { horizonAt } from './horizon.js';
// R32 skyline = true horizon from terrain data (horizon.js), true height (same scale as the Moon and planets).
const HZ_EX = 1;

const wrap = (a) => ((a % 360) + 540) % 360 - 180;
/** x for an azimuth, or null when outside the view. */
const xOf = (az, h) => { const dx = wrap(az - h); return Math.abs(dx) > FOV / 2 + 6 ? null : W / 2 + dx / FOV * W; };
const yOf = (alt) => HOR - (HOR - 24) * Math.sin(Math.max(-5, Math.min(90, alt)) * D) * (alt < 0 ? 1 : 1); // sine scale keeps high objects in view

function skyColor(sunAlt) {
  if (sunAlt > 0) return ['#24476F', '#6E95BD'];
  if (sunAlt > -6) return ['#1B2440', '#B4694A'];
  if (sunAlt > -12) return ['#0D1426', '#33364F'];
  return ['#05070D', '#0C1220'];
}

/** Moon disc with a lit side (phase) pointing at the Sun. */
function moonDisc(x, y, r, phase, sunDx) {
  const il = A.illumination(phase), right = sunDx >= 0;
  const k = 2 * il - 1; // terminator ellipse: -1 new … 1 full
  const ex = Math.abs(k) * r, sweepOuter = right ? 1 : 0;
  const lit = `M${f(x)} ${f(y - r)} A${f(r)} ${f(r)} 0 0 ${sweepOuter} ${f(x)} ${f(y + r)} A${f(ex)} ${f(r)} 0 0 ${(k > 0) === right ? 1 : 0} ${f(x)} ${f(y - r)} Z`;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#2A2C31"/><path d="${lit}" fill="#F4F1E8"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 5)}" fill="#F4F1E8" fill-opacity="0.08"/>`;
}

export function pierSvg({ ms, heading, obs, tz = TZ, mark = null }) {
  const date = new Date(ms);
  const sun = A.sunAltAz(date, obs), moon = A.moonAltAz(date, obs), phase = A.moonPhase(date);
  const [top, low] = skyColor(sun.alt);
  let b = `<defs><linearGradient id="pv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${low}"/></linearGradient>
<linearGradient id="pv-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1B2C"/><stop offset="1" stop-color="#05080E"/></linearGradient></defs>
<rect x="0" y="0" width="${W}" height="${HOR}" fill="url(#pv-sky)"/>`;
  // altitude guides (faint) every 15°
  for (let a = 15; a <= 60; a += 15) b += `<line x1="0" y1="${f(yOf(a))}" x2="${W}" y2="${f(yOf(a))}" stroke="#ECEAE4" stroke-opacity="0.08" stroke-dasharray="1 3"/><text x="3" y="${f(yOf(a) - 2)}" fill="#ECEAE4" fill-opacity="0.35" font-size="8">${a}°</text>`;
  // azimuth guides every 15°, labels every 45°
  for (let az = 0; az < 360; az += 15) {
    const x = xOf(az, heading); if (x == null || x < 0 || x > W) continue;
    b += `<line x1="${f(x)}" y1="0" x2="${f(x)}" y2="${HOR}" stroke="#ECEAE4" stroke-opacity="${az % 45 ? 0.04 : 0.08}" stroke-dasharray="1 3"/>`;
  }
  // sea, then land and hills
  b += `<rect x="0" y="${HOR}" width="${W}" height="${H - HOR}" fill="url(#pv-sea)"/>`;
  const shape = (from, to, hgt) => {
    const pts = []; for (let az = from; az <= to; az += 1) { const x = xOf(az, heading); if (x != null) pts.push([x, yOf(typeof hgt === 'function' ? hgt(az) : hgt)]); }
    if (pts.length < 2) return '';
    return `<path d="M${f(pts[0][0])} ${HOR} ${pts.map(([x, y]) => `L${f(x)} ${f(y)}`).join(' ')} L${f(pts[pts.length - 1][0])} ${HOR} Z" fill="#0B0D10"/><path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(' ')}" fill="none" stroke="#6B6E75" stroke-width="0.9"/>`;
  };
  b += shape(heading - FOV / 2 - 4, heading + FOV / 2 + 4, (az) => horizonAt(az) * HZ_EX);
  b += `<line x1="0" y1="${HOR}" x2="${W}" y2="${HOR}" stroke="#5B5D62"/>`;
  // compass labels on the horizon
  for (const [az, lab] of [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']]) {
    const x = xOf(az, heading); if (x == null || x < 8 || x > W - 8) continue;
    b += `<text x="${f(x)}" y="${HOR + 13}" fill="#A3A29C" font-size="10" text-anchor="middle">${lab}</text>`;
  }
  // sun (if near or above the horizon)
  { const x = xOf(sun.az, heading); if (x != null && sun.alt > -3) b += `<circle cx="${f(x)}" cy="${f(yOf(Math.max(sun.alt, -1)))}" r="9" fill="#FFD08F"/>`; }
  // planets
  const labels = [];
  for (const p of PLANETS) {
    const q = A.planetAltAz(p, date, obs); if (q.alt < -1) continue;
    const x = xOf(q.az, heading); if (x == null) continue;
    const y = yOf(q.alt), hi = mark && mark.includes(p), hid = q.alt < horizonAt(q.az);
    b += `<circle cx="${f(x)}" cy="${f(y)}" r="${p === 'venus' || p === 'jupiter' ? 3.2 : 2.4}" fill="${COLS[p]}"${hid ? ' fill-opacity="0.35"' : ''}/>${hi ? `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="none" stroke="#B59CFF" stroke-width="1.2"/>` : ''}`;
    if (x >= 0 && x <= W) labels.push([x, y, NAME[p] + (hid ? ' (behind hills)' : ''), COLS[p]]);
  }
  // moon
  { const x = xOf(moon.az, heading); if (x != null && moon.alt > -1) { const y = yOf(moon.alt), mHid = moon.alt < horizonAt(moon.az); b += `<g${mHid ? ' opacity="0.35"' : ''}>` + moonDisc(x, y, 7, phase, wrap(sun.az - moon.az)) + '</g>'; if (mark && mark.includes('moon')) b += `<circle cx="${f(x)}" cy="${f(y)}" r="13" fill="none" stroke="#B59CFF" stroke-width="1.2"/>`; if (x >= 0 && x <= W) labels.push([x, y, `MOON ${Math.round(A.illumination(phase) * 100)}%${mHid ? ' (behind hills)' : ''}`, '#F4F1E8']); } }
  // tap targets (R25): invisible circles over the Moon and planets
  for (const [bd, q] of [['moon', moon], ...PLANETS.map((p) => [p, A.planetAltAz(p, date, obs)])]) {
    if (q.alt < -1) continue; const x = xOf(q.az, heading); if (x == null || x < 0 || x > W) continue;
    b += `<circle cx="${f(x)}" cy="${f(yOf(q.alt))}" r="16" fill="#fff" fill-opacity="0" data-body="${bd}" style="cursor:pointer"/>`;
  }
  // labels: stagger when two sit close
  labels.sort((a, c) => a[0] - c[0]);
  let lastX = -99, row = 0;
  for (const [x, y, t, c] of labels) {
    row = Math.abs(x - lastX) < 50 ? row + 1 : 0; lastX = x;
    // row 0 above the object, row 1 below it, row 2 further above
    const ly = row === 1 ? y + 20 : Math.max(10, y - 12 - (row ? 11 : 0)), an = x < 40 ? 'start' : x > W - 40 ? 'end' : 'middle';
    const lxp = an === 'start' ? Math.max(3, x - 4) : an === 'end' ? Math.min(W - 3, x + 4) : x;
    b += `<text x="${f(lxp)}" y="${f(Math.min(HOR - 3, ly))}" fill="${c}" font-size="9" text-anchor="${an}">${t}</text>`;
  }
  const c = partsIn(date, tz);
  b += `<text x="${W - 4}" y="${H - 20}" fill="#ECEAE4" font-size="10" text-anchor="end">${c.time} · FACING ${A.compass(heading)} ${Math.round(((heading % 360) + 360) % 360)}°</text>`;
  b += `<text x="4" y="${H - 6}" fill="#5B5D62" font-size="8">from the end of Venice Pier · drag to turn · tap a planet</text>`;
  return b;
}
