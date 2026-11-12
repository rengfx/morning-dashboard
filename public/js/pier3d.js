// R25 Where to look: a zoomed-out 3D scene of Venice Pier with a sky dome and a sight line to one object.
// Orthographic camera above and behind you; drag to orbit. Pure SVG string.
import * as A from './astro.js';
import { partsIn, TZ } from './time.js';

const W = 358, H = 250, CX = 179, CY = 168, S = 78; // screen centre (observer) and scale
const D = Math.PI / 180;
const f = (v) => (Math.round(v * 10) / 10).toString();
const PIER_BEARING = 240;   // the pier points out to sea, WSW (Venice Fishing Pier)
const PIER_LEN = 1.15;      // scene units (pier ≈ 400 m; not to scale with the dome)
const R = 1.25;             // sky dome radius
const COL = { mercury: '#B9B6AD', venus: '#E8D9B5', mars: '#E07B5B', jupiter: '#E6C79A', saturn: '#D8C79A', moon: '#F4F1E8' };
const NAME = { mercury: 'MERCURY', venus: 'VENUS', mars: 'MARS', jupiter: 'JUPITER', saturn: 'SATURN', moon: 'MOON' };

/** Camera: bearing it looks toward (deg) and elevation (deg). Returns project(x east, y north, z up) → [sx, sy, depth]. */
function camera(bearing, elev) {
  const fx = Math.sin(bearing * D), fy = Math.cos(bearing * D), ce = Math.cos(elev * D), se = Math.sin(elev * D);
  return ([x, y, z]) => {
    const right = x * fy - y * fx;                 // across the screen
    const fwd = x * fx + y * fy;                   // into the screen (horizontal)
    const up = -fwd * se + z * ce;                 // screen up
    const depth = fwd * ce + z * se;               // larger = farther
    return [CX + right * S, CY - up * S, depth];
  };
}
const dirVec = (az, alt, r = 1) => [r * Math.cos(alt * D) * Math.sin(az * D), r * Math.cos(alt * D) * Math.cos(az * D), r * Math.sin(alt * D)];
const fists = (alt) => Math.max(0, Math.round(alt / 10));

export function bodyPosition(body, ms, obs) {
  return body === 'moon' ? A.moonAltAz(new Date(ms), obs) : A.planetAltAz(body, new Date(ms), obs);
}

/** Words for the person: direction, height, fists. */
/** R26 most recent sunset at or before `ms` (the sun's last crossing of −0.833°): {ms, az}. */
export function lastSunset(ms, obs) {
  const alt = (t) => A.sunAltAz(new Date(t), obs).alt + 0.833;
  let t = ms, prev = alt(t);
  for (let k = 0; k < 36 * 30; k++) { // 2-min steps back, up to 36 h
    const t2 = t - 120000, v = alt(t2);
    if (v >= 0 && prev < 0) { const at = t2 + 120000 * v / (v - prev); return { ms: at, az: A.sunAltAz(new Date(at), obs).az }; }
    t = t2; prev = v;
  }
  return null;
}

export function lookText(body, pos) {
  if (pos.alt < 0) return `${NAME[body]} is below the horizon at this time.`;
  const az = Math.round(((pos.az % 360) + 360) % 360), alt = Math.round(pos.alt);
  const n = fists(pos.alt);
  return `Face ${A.compass(az)} (${az}°) and look ${alt}° up${n ? `, about ${n} fist${n > 1 ? 's' : ''} above the horizon at arm's length` : ', just above the horizon'}.`;
}

export function pier3dSvg({ body, ms, obs, camBearing = null, elev = 28 }) {
  const pos = bodyPosition(body, ms, obs);
  const cam = camBearing == null ? pos.az - 60 : camBearing; // default: behind and to the left, so the sight line shows in profile
  const P = camera(cam, elev);
  const path = (pts, attrs) => `<path d="${pts.map((p, i) => { const [x, y] = P(p); return `${i ? 'L' : 'M'}${f(x)} ${f(y)}`; }).join(' ')}" ${attrs}/>`;
  const ring = (alt, n = 96) => Array.from({ length: n + 1 }, (_, i) => dirVec(i / n * 360, alt, R));
  let b = `<defs><radialGradient id="p3-sea" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#11243A"/><stop offset="1" stop-color="#070B12"/></radialGradient></defs>
<rect x="0" y="0" width="${W}" height="${H}" fill="#07080A"/>`;
  // ground: sea disc, land on the shore side (east of a coastline across the pier root)
  b += path(ring(0, 96).map(([x, y]) => [x * 1.35, y * 1.35, 0]), 'fill="url(#p3-sea)" stroke="none"');
  const shore = dirVec(PIER_BEARING + 180, 0, PIER_LEN);               // pier root on the beach
  const along = [Math.sin((PIER_BEARING - 90) * D), Math.cos((PIER_BEARING - 90) * D), 0];  // coastline direction
  const inland = [-Math.sin(PIER_BEARING * D), -Math.cos(PIER_BEARING * D), 0];
  const L = 1.45, c0 = [shore[0] - along[0] * L, shore[1] - along[1] * L, 0], c1 = [shore[0] + along[0] * L, shore[1] + along[1] * L, 0];
  const far = (p) => [p[0] + inland[0] * 0.55, p[1] + inland[1] * 0.55, 0];
  b += path([c0, c1, far(c1), far(c0), c0], 'fill="#1A1813" stroke="none"');
  b += path([c0, c1], 'fill="none" stroke="#C9B98F" stroke-opacity="0.5" stroke-width="2"');    // sand line
  b += `<text x="${f(P(far(shore))[0])}" y="${f(P(far(shore))[1] + 4)}" fill="#5B5D62" font-size="8" text-anchor="middle">VENICE</text>`;
  // pier deck (two rails) + pier end platform
  const side = [along[0] * 0.035, along[1] * 0.035, 0];
  const rail = (s) => [[shore[0] + s * side[0], shore[1] + s * side[1], 0.02], [s * side[0], s * side[1], 0.02]];
  b += path([...rail(1), ...rail(-1).reverse()], 'fill="#3A3B3F" stroke="#7A7B80" stroke-width="0.8"');
  // dome: back half first (dashed), then the sight line, then the front half
  const seg = (pts, front) => { let d = '', open = false; for (const p of pts) { const [x, y, z] = P(p); const isFront = z < 0.02; if (isFront === front) { d += `${open ? 'L' : 'M'}${f(x)} ${f(y)} `; open = true; } else open = false; } return d; };
  const domeLines = [ring(0), ring(30), ring(60)];
  const meridian = (az) => Array.from({ length: 31 }, (_, i) => dirVec(az, i * 3, R));
  for (const az of [0, 90, 180, 270]) domeLines.push(meridian(az));
  for (const l of domeLines) b += `<path d="${seg(l, false)}" fill="none" stroke="#ECEAE4" stroke-opacity="0.08" stroke-dasharray="2 3"/>`;
  // compass letters on the horizon ring
  for (const [az, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const [x, y] = P(dirVec(az, 0, R * 1.2)); b += `<text x="${f(x)}" y="${f(y + 3)}" fill="#A3A29C" font-size="10" text-anchor="middle">${t}</text>`; }
  // R26 sunset reference: where the sun last went down (half sun on the horizon ring)
  const ss = lastSunset(ms, obs);
  if (ss) {
    const [sx, sy, sz] = P(dirVec(ss.az, 0, R)), front = sz < 0.02;
    const [rx, ry] = P(dirVec(ss.az, 0, R * 1.08));
    b += path([[0, 0, 0.01], dirVec(ss.az, 0, R)], `fill="none" stroke="#FF8A65" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="1 3"`);
    b += `<circle cx="${f(sx)}" cy="${f(sy)}" r="16" fill="#FF8A65" fill-opacity="0.12"/><path d="M${f(sx - 8)} ${f(sy)} A8 8 0 0 1 ${f(sx + 8)} ${f(sy)} Z" fill="#FFB36B" fill-opacity="${front ? 1 : 0.75}"/><line x1="${f(sx - 13)}" y1="${f(sy)}" x2="${f(sx + 13)}" y2="${f(sy)}" stroke="#FFB36B" stroke-width="1.2"/>`;
    const day = partsIn(new Date(ss.ms), TZ), here = partsIn(new Date(ms), TZ);
    const rt = sx >= CX; b += `<text x="${f(sx + (rt ? 14 : -14))}" y="${f(sy + 12)}" fill="#FF8A65" font-size="9" text-anchor="${rt ? 'start' : 'end'}">SUNSET ${day.date !== here.date ? day.weekday + ' ' : ''}${day.time}</text><text x="${f(sx + (rt ? 14 : -14))}" y="${f(sy + 23)}" fill="#FF8A65" font-size="9" text-anchor="${rt ? 'start' : 'end'}">${A.compass(ss.az)} ${Math.round(ss.az)}°</text>`;
  }
  // observer
  const [ox, oy] = P([0, 0, 0]), [hx, hy] = P([0, 0, 0.12]);
  b += `<line x1="${f(ox)}" y1="${f(oy)}" x2="${f(hx)}" y2="${f(hy)}" stroke="#F2B35E" stroke-width="2.5" stroke-linecap="round"/><circle cx="${f(hx)}" cy="${f(hy - 3)}" r="3" fill="#F2B35E"/>`;
  b += `<text x="${f(ox - 8)}" y="${f(oy + 14)}" fill="#F2B35E" font-size="9" text-anchor="end">YOU · PIER END</text>`;
  const col = COL[body] || '#ECEAE4';
  if (pos.alt >= 0) {
    // ground arrow (direction to face) and the altitude arc up to the object
    const g = dirVec(pos.az, 0, R), top = dirVec(pos.az, pos.alt, R);
    b += path([[0, 0, 0.12], g], `fill="none" stroke="${col}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="4 3"`);
    b += path(Array.from({ length: 25 }, (_, i) => dirVec(pos.az, pos.alt * i / 24, R * 0.45)), `fill="none" stroke="#B59CFF" stroke-width="1.5"`);
    const mid = P(dirVec(pos.az + 14, pos.alt / 2, R * 0.45));
    b += `<text x="${f(mid[0])}" y="${f(mid[1])}" fill="#B59CFF" font-size="10" text-anchor="middle">${Math.round(pos.alt)}°</text>`;
    b += path([[0, 0, 0.12], top], `fill="none" stroke="${col}" stroke-width="2"`);
    const [tx, ty] = P(top), [gx, gy] = P(dirVec(pos.az, 0, R * 0.8));
    b += `<circle cx="${f(tx)}" cy="${f(ty)}" r="6" fill="${col}" stroke="#07080A" stroke-width="2"/><circle cx="${f(tx)}" cy="${f(ty)}" r="11" fill="none" stroke="#B59CFF" stroke-width="1.2"/>`;
    b += `<text x="${f(tx)}" y="${f(ty - 15)}" fill="${col}" font-size="11" font-weight="600" text-anchor="middle">${NAME[body]}</text>`;
    b += `<text x="${f(gx)}" y="${f(gy + 13)}" fill="${col}" font-size="10" text-anchor="middle">${A.compass(pos.az)} ${Math.round(((pos.az % 360) + 360) % 360)}°</text>`;
  }
  for (const l of domeLines) b += `<path d="${seg(l, true)}" fill="none" stroke="#ECEAE4" stroke-opacity="0.16"/>`;
  b += `<text x="6" y="${H - 6}" fill="#5B5D62" font-size="8">not to scale · drag to turn the camera</text>`;
  return { svg: b, pos, sunset: ss };
}
