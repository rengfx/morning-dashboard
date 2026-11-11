// Sky page: Earth + Moon (camera locked on Venice), Moon-height histogram with slider,
// and the inner solar system — all on one 00:00 → 24:00 local clock, 12 s loop.
import { TZ, partsIn, zonedToUtc, addDays, ymd } from './time.js';
import * as A from './astro.js';

const OBS = { lat: 33.985, lon: -118.47 };
const LOOP_S = 12;
const D = Math.PI / 180;
const f = (n) => n.toFixed(1);
const f3 = (n) => Math.max(0, Math.min(1, n)).toFixed(3);
const $ = (s) => document.querySelector(s);
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// ---- the day ----
const q = new URLSearchParams(location.search);
const dateStr = q.get('date') || partsIn(new Date(), TZ).date;
const [Y, M, Dd] = ymd(dateStr);
const t0 = zonedToUtc(Y, M, Dd, 0, 0, 0, TZ).getTime();
const t1 = (() => { const [y, m, d] = ymd(addDays(dateStr, 1)); return zonedToUtc(y, m, d, 0, 0, 0, TZ).getTime(); })();
const SPAN = t1 - t0;

// Precompute every 5 minutes (real positions), then interpolate per frame.
const STEP = 5 * 60000;
const N = Math.round(SPAN / STEP);
const S = [];
for (let i = 0; i <= N; i++) {
  const t = new Date(t0 + i * STEP);
  S.push({ t: t.getTime(), elong: A.moonPhase(t), ha: A.sunAltAz(t, OBS).ha, moonAlt: A.moonAltAz(t, OBS).alt, sunAlt: A.sunAltAz(t, OBS).alt });
}
const unwrap = (key) => { for (let i = 1; i < S.length; i++) { while (S[i][key] - S[i - 1][key] < -180) S[i][key] += 360; while (S[i][key] - S[i - 1][key] > 180) S[i][key] -= 360; } };
unwrap('elong'); unwrap('ha');
const at = (p, key) => { const x = p * N, i = Math.min(N - 1, Math.floor(x)), k = x - i; return S[i][key] + (S[i + 1][key] - S[i][key]) * k; };

const jd0 = A.julian(new Date(t0)), jd1 = A.julian(new Date(t1));
const PL = ['mercury', 'venus', 'earth', 'mars'];
const H0 = Object.fromEntries(PL.map((b) => [b, A.helio(b, jd0)])), H1 = Object.fromEntries(PL.map((b) => [b, A.helio(b, jd1)]));
const sat = A.helio('saturn', (jd0 + jd1) / 2);
const nextFull = A.nextPhase(new Date(t0), 180), nextNew = A.nextPhase(new Date(t0), 0);

// ---- static geometry ----
const P = (deg, R) => [179 + R * Math.cos(deg * D), 170 - R * 0.343 * Math.sin(deg * D)];
const K = 32 * D, PER = 360 * K, LONV = -118.47;
const LY = (la) => 174 - la * 0.47;
const LAND = [
  [[-165, 65], [-140, 70], [-95, 72], [-75, 62], [-60, 48], [-80, 30], [-82, 25], [-97, 18], [-105, 20], [-118, 32], [-125, 48], [-140, 58], [-160, 58]],
  [[-80, 10], [-60, 8], [-35, -8], [-40, -22], [-58, -38], [-70, -52], [-75, -40], [-72, -18], [-80, -5]],
  [[-55, 60], [-40, 62], [-20, 72], [-30, 82], [-60, 80]],
  [[-10, 36], [-5, 44], [-10, 52], [5, 58], [20, 70], [40, 68], [40, 45], [30, 35], [35, 30], [50, 12], [40, -15], [30, -34], [18, -35], [12, -15], [8, 5], [-17, 15], [-17, 25]],
  [[40, 68], [80, 75], [140, 72], [170, 65], [140, 50], [122, 32], [120, 22], [105, 10], [100, 22], [80, 8], [72, 22], [55, 25], [48, 30], [40, 45]],
  [[113, -22], [130, -12], [145, -15], [153, -28], [145, -38], [132, -32], [115, -34]],
];
const CLOUD = [[[-150, 40], [-120, 44], [-100, 38], [-125, 34]], [[-40, 10], [0, 14], [30, 6], [-10, 2]], [[60, -30], [110, -26], [140, -34], [90, -38]], [[150, 20], [190, 26], [200, 16], [170, 12]]];
const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;
const shapes = (list, drift) => { let d = ''; for (let c = -1; c <= 1; c++) for (const poly of list) d += 'M' + poly.map((p) => f(179 + (p[0] + drift - LONV) * K + c * PER) + ' ' + f(LY(p[1]))).join(' L') + ' Z '; return d; };
const LANDP = shapes(LAND, 0);

// Solar system frame (tilted top view).
const ROT = -60.5, SR = { mercury: 71, venus: 138, earth: 190, mars: 230 };
const Q = (lon, R) => [168 + R * Math.cos((lon + ROT) * D), 118 - R * 0.32 * Math.sin((lon + ROT) * D)];
const monthLon = (mo) => A.helio('earth', A.julian(new Date(Date.UTC(Y, mo, 1)))).lon;
let ssTicks = ''; for (let mo = 0; mo < 12; mo++) { const l = monthLon(mo), a = Q(l, 184), b = Q(l, 196); ssTicks += `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} `; }
const mLab = [0, 3, 6, 9].map((mo) => { const qq = Q(monthLon(mo), 208); return [Math.max(12, Math.min(346, qq[0])), qq[1] + 3, MON[mo]]; });
const helioAt = (b, p) => { const a = H0[b], c = H1[b]; let dl = c.lon - a.lon; if (dl < -180) dl += 360; return { lon: a.lon + dl * p, r: a.r + (c.r - a.r) * p }; };

// Histogram (static).
function histogram() {
  const n = 96, bw = 358 / n; let day = '', night = '', bands = '';
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n, alt = at(p, 'moonAlt'), sunUp = at(p, 'sunAlt') > -0.833, x = f(i * bw);
    if (!sunUp) bands += `M${x} 0 h${f(bw)} v52 h-${f(bw)} Z `;
    if (alt > 0) { const seg = `M${x} 52 h${f(bw - 0.5)} v-${f(Math.sin(alt * D) * 46)} h-${f(bw - 0.5)} Z `; if (sunUp) day += seg; else night += seg; }
  }
  return { day, night, bands };
}
const HIST = histogram();

const clock = (p) => partsIn(new Date(t0 + p * SPAN), TZ);

// ---- frame ----
function earthMoon(p) {
  const ha = at(p, 'ha');                      // Venice angle from the Sun (0 = noon)
  const sig = -(ha + 90);                      // camera turns so Venice faces the viewer
  const elong = at(p, 'elong');
  const mDeg = elong + sig, m = P(mDeg, 140), sm = Math.sin(mDeg * D);
  const sunP = P(sig, 215), sunL = P(sig, 196);
  const anti = (sig + 180) * D, ux = Math.cos(anti), uy = -0.343 * Math.sin(anti), ul = Math.hypot(ux, uy) || 1, nx = -uy / ul, ny = ux / ul;
  const shadow = [[179 + nx * 30, 170 + ny * 30], [179 + ux * 165 + nx * 16, 170 + uy * 165 + ny * 16], [179 + ux * 165 - nx * 16, 170 + uy * 165 - ny * 16], [179 - nx * 30, 170 - ny * 30]].map((qq) => f(qq[0]) + ',' + f(qq[1])).join(' ');
  const lit = (1 - Math.sin(sig * D)) / 2, dark = 1 - lit, sunRight = Math.cos(sig * D) >= 0;
  const quarter = (k) => { const a = P(sig + 90 * k, 140), l = P(sig + 90 * k, 160); return [a, [Math.max(24, Math.min(334, l[0])), l[1] + 4]]; };
  const path = (toP) => { const out = []; for (let k = 0; k <= 120; k++) { const pp = toP * k / 120, s2 = -(at(pp, 'ha') + 90), qq = P(at(pp, 'elong') + s2, 140); out.push(f(qq[0]) + ',' + f(qq[1])); } return out.join(' '); };
  const up = at(p, 'moonAlt') > 0, vy = LY(34), vFill = up ? '#F2B35E' : '#A3A29C';
  const el = ((elong % 360) + 360) % 360, illum = Math.round(A.illumination(el) * 100);
  const c = clock(p);
  const Qs = [0, 1, 2, 3].map(quarter), LBL = ['NEW', '1ST QTR', 'FULL', 'LAST QTR'];
  return `<defs>
<radialGradient id="mo-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD08F" stop-opacity="0.9"/><stop offset="0.35" stop-color="#F2B35E" stop-opacity="0.35"/><stop offset="1" stop-color="#F2B35E" stop-opacity="0"/></radialGradient>
<radialGradient id="mo-moon" cx="${f3(0.5 + 0.24 * Math.cos(sig * D))}" cy="0.42" r="0.8"><stop offset="0" stop-color="#FAF8F2"/><stop offset="0.4" stop-color="#B9B6AD"/><stop offset="0.75" stop-color="#3A3B3F"/><stop offset="1" stop-color="#111214"/></radialGradient>
<linearGradient id="mo-night" x1="${sunRight ? 0 : 1}" y1="0" x2="${sunRight ? 1 : 0}" y2="0"><stop offset="0" stop-color="#03050A" stop-opacity="0.92"/><stop offset="${f3(dark - 0.08)}" stop-color="#03050A" stop-opacity="0.72"/><stop offset="${f3(dark + 0.06)}" stop-color="#03050A" stop-opacity="0.04"/><stop offset="1" stop-color="#03050A" stop-opacity="0"/></linearGradient>
<radialGradient id="mo-shine" cx="${f3(0.5 + 0.25 * Math.cos(sig * D))}" cy="0.34" r="0.55"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${(0.35 * lit).toFixed(2)}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<radialGradient id="mo-limb" cx="0.5" cy="0.5" r="0.5"><stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
<clipPath id="mo-clip"><circle cx="179" cy="170" r="32"/></clipPath></defs>
<g fill="#5B5D62"><circle cx="30" cy="58" r="0.8"/><circle cx="96" cy="72" r="0.6"/><circle cx="250" cy="60" r="0.8"/><circle cx="300" cy="96" r="0.6"/><circle cx="60" cy="262" r="0.7"/><circle cx="270" cy="270" r="0.7"/><circle cx="140" cy="84" r="0.5"/></g>
<circle cx="${f(sunP[0])}" cy="${f(sunP[1])}" r="110" fill="url(#mo-sun)"/>
<text x="${f(Math.max(24, Math.min(334, sunL[0])))}" y="${f(Math.max(56, Math.min(276, sunL[1] - 16)))}" fill="#F2B35E" font-size="10" text-anchor="middle">SUN</text>
<polygon points="${shadow}" fill="#000" fill-opacity="0.32"/>
<path d="M39 170 A140 48 0 0 1 319 170" fill="none" stroke="#3A3D43" stroke-width="1.5" stroke-dasharray="3 4"/>
<polyline points="${PATH_DAY}" fill="none" stroke="#F2B35E" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>
<polyline points="${path(p)}" fill="none" stroke="#F2B35E" stroke-width="2" stroke-linecap="round"/>
${sm >= 0 ? `<circle cx="${f(m[0])}" cy="${f(m[1])}" r="${f(11 - 2 * sm)}" fill="url(#mo-moon)"/>` : ''}
<line x1="161" y1="128" x2="197" y2="212" stroke="#5B5D62"/>
<circle cx="179" cy="170" r="32" fill="#173E73"/>
<g clip-path="url(#mo-clip)"><path d="${LANDP}" fill="#5F8F5B" stroke="#7FAE74" stroke-width="0.4" stroke-linejoin="round"/>
<ellipse cx="179" cy="140" rx="17" ry="5" fill="#DCE6EE" fill-opacity="0.85"/>
<ellipse cx="179" cy="174" rx="32" ry="5" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="0.6"/><ellipse cx="179" cy="158" rx="27" ry="4" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="0.6"/><ellipse cx="179" cy="190" rx="27" ry="4" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="0.6"/>
<path d="${shapes(CLOUD, p * 36)}" fill="#fff" fill-opacity="0.18"/>
<circle cx="179" cy="170" r="32" fill="url(#mo-limb)"/><rect x="147" y="138" width="64" height="64" fill="url(#mo-night)"/><circle cx="179" cy="170" r="32" fill="url(#mo-shine)"/></g>
<circle cx="179" cy="170" r="33.5" fill="none" stroke="#9DB4FF" stroke-opacity="0.3" stroke-width="2"/>
<path d="M319 170 A140 48 0 0 1 39 170" fill="none" stroke="#5B5D62" stroke-width="1.5"/>
${Qs.map(([a, l], i) => `<circle cx="${f(a[0])}" cy="${f(a[1])}" r="2.5" fill="#5B5D62"/><text x="${f(l[0])}" y="${f(l[1])}" fill="#A3A29C" font-size="9" text-anchor="middle">${LBL[i]}</text>`).join('')}
${up ? `<line x1="179" y1="${f(vy)}" x2="${f(m[0])}" y2="${f(m[1])}" stroke="#F2B35E" stroke-dasharray="2 2" opacity="0.9"/>` : ''}
<circle cx="179" cy="${f(vy)}" r="3" fill="${vFill}" stroke="#0A0B0D"/><text x="185" y="${f(vy - 6)}" fill="${vFill}" font-size="9">VENICE</text>
${sm < 0 ? `<circle cx="${f(m[0])}" cy="${f(m[1])}" r="${f(11 - 2 * sm)}" fill="url(#mo-moon)"/>` : ''}
<text x="16" y="24" fill="#ECEAE4" font-size="11">${c.weekday} ${c.d} ${MON[c.mo - 1]} · ${c.time} · SUN–MOON ${Math.round(el <= 180 ? el : 360 - el)}°</text>
<text x="16" y="38" fill="${vFill}" font-size="10">MOON ${up ? 'UP' : 'DOWN'} OVER VENICE · ${illum}% ${el < 180 ? 'WAXING' : 'WANING'}</text>
<text x="16" y="290" fill="#5B5D62" font-size="9">amber dashes = path for the day · not to scale</text>`;
}
let PATH_DAY = '';
{ const out = []; for (let k = 0; k <= 120; k++) { const pp = k / 120, s2 = -(at(Math.min(pp, 0.9999), 'ha') + 90), qq = P(at(Math.min(pp, 0.9999), 'elong') + s2, 140); out.push(f(qq[0]) + ',' + f(qq[1])); } PATH_DAY = out.join(' '); }

function solar(p) {
  const pos = Object.fromEntries(PL.map((b) => { const h = helioAt(b, p); return [b, { ...h, xy: Q(h.lon, SR[b]) }]; }));
  const e = pos.earth.xy, v = pos.venus.xy, me = pos.mercury.xy, ma = pos.mars.xy;
  const moonLon = A.moonEcliptic(A.julian(new Date(t0 + p * SPAN))).lon;
  const mq = [Math.cos((moonLon + ROT) * D), -0.32 * Math.sin((moonLon + ROT) * D)];
  const toSun = [168 - e[0], 118 - e[1]], tl = Math.hypot(...toSun) || 1;
  const au = (b) => [pos[b].r * Math.cos(pos[b].lon * D), pos[b].r * Math.sin(pos[b].lon * D)];
  const vd = Math.hypot(au('earth')[0] - au('venus')[0], au('earth')[1] - au('venus')[1]);
  const sd = Math.hypot(au('earth')[0] - sat.r * Math.cos(sat.lon * D), au('earth')[1] - sat.r * Math.sin(sat.lon * D));
  const earthPath = (toP) => { const o = []; for (let k = 0; k <= 24; k++) { const qq = Q(helioAt('earth', toP * k / 24).lon, SR.earth); o.push(f(qq[0]) + ',' + f(qq[1])); } return o.join(' '); };
  const kmToday = 2 * Math.PI * 149.6 * pos.earth.r / 365.256 * p * (SPAN / 86400000);
  return `<defs><radialGradient id="ss-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE2A8"/><stop offset="0.3" stop-color="#F2B35E" stop-opacity="0.55"/><stop offset="1" stop-color="#F2B35E" stop-opacity="0"/></radialGradient>
<radialGradient id="ss-earth" cx="${(0.5 + 0.3 * toSun[0] / tl).toFixed(2)}" cy="${(0.5 + 0.3 * toSun[1] / tl).toFixed(2)}" r="0.8"><stop offset="0" stop-color="#A9C8F5"/><stop offset="0.45" stop-color="#3F72C2"/><stop offset="0.8" stop-color="#16294A"/><stop offset="1" stop-color="#070B14"/></radialGradient></defs>
<ellipse cx="168" cy="118" rx="230" ry="74" fill="none" stroke="#2B2D31"/><ellipse cx="168" cy="118" rx="190" ry="61" fill="none" stroke="#5E8BD6" stroke-opacity="0.5" stroke-width="1.5"/><ellipse cx="168" cy="118" rx="138" ry="44" fill="none" stroke="#2B2D31"/><ellipse cx="168" cy="118" rx="71" ry="23" fill="none" stroke="#2B2D31"/>
<path d="${ssTicks}" fill="none" stroke="#5E8BD6" stroke-opacity="0.6"/>
${mLab.filter(([x, y]) => Math.hypot(x - e[0], y - e[1]) > 60).map(([x, y, t]) => `<text x="${f(x)}" y="${f(y)}" fill="#5B5D62" font-size="8" text-anchor="middle">${t}</text>`).join('')}
<circle cx="168" cy="118" r="60" fill="url(#ss-sun)"/><circle cx="168" cy="118" r="14" fill="#FFD08F"/><text x="168" y="98" fill="#F2B35E" font-size="9" text-anchor="middle">SUN</text>
<circle cx="${f(ma[0])}" cy="${f(ma[1])}" r="3.5" fill="#D9785B"/><text x="${f(ma[0] - 8)}" y="${f(ma[1] - 6)}" fill="#D9785B" font-size="8" text-anchor="end">MARS</text>
<circle cx="${f(me[0])}" cy="${f(me[1])}" r="2.5" fill="#B9B6AD"/><text x="${f(me[0])}" y="${f(me[1] + 14)}" fill="#A3A29C" font-size="8" text-anchor="middle">MERCURY</text>
<line x1="${f(v[0])}" y1="${f(v[1])}" x2="${f(e[0])}" y2="${f(e[1])}" stroke="#5B5D62" stroke-dasharray="2 2"/>
<circle cx="${f(v[0])}" cy="${f(v[1])}" r="4.5" fill="#E8D9B5"/><text x="${f(v[0])}" y="${f(v[1] - 9)}" fill="#E8D9B5" font-size="8" text-anchor="middle">VENUS · ${vd.toFixed(2)} AU</text>
<polyline points="${earthPath(1)}" fill="none" stroke="#F2B35E" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
<polyline points="${earthPath(p)}" fill="none" stroke="#F2B35E" stroke-width="3" stroke-linecap="round"/>
<circle cx="${f(e[0] + 15 * mq[0])}" cy="${f(e[1] + 15 * mq[1])}" r="2.5" fill="#ECEAE4"/>
<circle cx="${f(e[0])}" cy="${f(e[1])}" r="9" fill="url(#ss-earth)"/><circle cx="${f(e[0])}" cy="${f(e[1])}" r="10.5" fill="none" stroke="#9DB4FF" stroke-opacity="0.4" stroke-width="1.2"/>
<text x="${f(e[0] - 14)}" y="${f(e[1] + 24)}" fill="#9DB4FF" font-size="10" font-weight="600" text-anchor="end">EARTH · YOU</text>
<text x="354" y="226" fill="#D8C79A" font-size="8" text-anchor="end">SATURN ${sd.toFixed(1)} AU</text>
<text x="8" y="244" fill="#F2B35E" font-size="9">EARTH MOVED ${(kmToday / 1).toFixed(1)}M KM TODAY</text>
<text x="354" y="244" fill="#5B5D62" font-size="8" text-anchor="end">not to scale</text>`;
}

// ---- loop ----
let p = Math.max(0, Math.min(0.999, (Date.now() - t0) / SPAN)), playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, last = null, raf = null;
const em = $('#earthmoon'), ss = $('#solar'), head = $('#playhead'), slider = $('#scrub'), btn = $('#play');
$('#hist-day').setAttribute('d', HIST.day); $('#hist-night').setAttribute('d', HIST.night); $('#hist-bands').setAttribute('d', HIST.bands);
$('#ticks').innerHTML = [0, 4, 8, 12, 16, 20].map((h) => `<span>${String(h).padStart(2, '0')}:00</span>`).join('');
const fmtDate = (d) => `${MON[partsIn(d, TZ).mo - 1]} ${partsIn(d, TZ).d}`;
$('#c-full').textContent = nextFull ? fmtDate(nextFull) : '—';
$('#c-new').textContent = nextNew ? fmtDate(nextNew) : '—';
$('#c-dark').textContent = nextNew ? `${fmtDate(new Date(nextNew.getTime() - 3 * 864e5))}–${partsIn(new Date(nextNew.getTime() + 3 * 864e5), TZ).d}` : '—';
$('#loop').textContent = `LOOP · ${LOOP_S} s`;

function draw() {
  em.innerHTML = earthMoon(p); ss.innerHTML = solar(p);
  const x = f(Math.max(1, Math.min(357, p * 358)));
  head.setAttribute('x1', x); head.setAttribute('x2', x); $('#playdot').setAttribute('cx', x);
  slider.value = Math.round(p * 1000);
  btn.textContent = playing ? 'PAUSE' : 'PLAY';
}
function frame(ts) {
  if (last != null) p = (p + (ts - last) / (LOOP_S * 1000)) % 1;
  last = ts; draw();
  raf = playing ? requestAnimationFrame(frame) : null;
}
slider.addEventListener('input', () => { playing = false; last = null; p = slider.value / 1000; draw(); });
btn.addEventListener('click', () => { playing = !playing; last = null; if (playing) raf = requestAnimationFrame(frame); else draw(); });
document.addEventListener('visibilitychange', () => { last = null; });
draw();
if (playing) raf = requestAnimationFrame(frame);
window.__sky = { setP: (v) => { playing = false; p = v; draw(); } };
