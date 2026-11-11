// Low-precision astronomy, no dependencies. Good to ~0.3° for the Moon, ~0.01° for the Sun,
// ~1° for planets (JPL approximate Keplerian elements, valid 1800–2050). Enough for a dashboard.

const D = Math.PI / 180;
const sin = (x) => Math.sin(x * D), cos = (x) => Math.cos(x * D);
const norm = (x) => ((x % 360) + 360) % 360;

export const julian = (date) => date.getTime() / 86400000 + 2440587.5;

export function sunEcliptic(jd) {
  const n = jd - 2451545.0;
  const L = norm(280.46 + 0.9856474 * n), g = norm(357.528 + 0.9856003 * n);
  return { lon: norm(L + 1.915 * sin(g) + 0.020 * sin(2 * g)), lat: 0, eps: 23.439 - 0.0000004 * n };
}

export function moonEcliptic(jd) {
  const T = (jd - 2451545.0) / 36525;
  const lon = 218.32 + 481267.881 * T
    + 6.29 * sin(135.0 + 477198.87 * T) - 1.27 * sin(259.3 - 413335.36 * T)
    + 0.66 * sin(235.7 + 890534.22 * T) + 0.21 * sin(269.9 + 954397.74 * T)
    - 0.19 * sin(357.5 + 35999.05 * T) - 0.11 * sin(186.5 + 966404.03 * T);
  const lat = 5.13 * sin(93.3 + 483202.02 * T) + 0.28 * sin(228.2 + 960400.89 * T)
    - 0.28 * sin(318.3 + 6003.15 * T) - 0.17 * sin(217.6 - 407332.21 * T);
  const par = 0.9508 + 0.0518 * cos(135.0 + 477198.87 * T) + 0.0095 * cos(259.3 - 413335.36 * T)
    + 0.0078 * cos(235.7 + 890534.22 * T) + 0.0028 * cos(269.9 + 954397.74 * T);
  return { lon: norm(lon), lat, parallax: par, distKm: 6378.14 / sin(par) };
}

function eclToEq(lon, lat, eps) {
  const ra = Math.atan2(sin(lon) * cos(eps) - Math.tan(lat * D) * sin(eps), cos(lon)) / D;
  const dec = Math.asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon)) / D;
  return { ra: norm(ra), dec };
}

const gmst = (jd) => norm(280.46061837 + 360.98564736629 * (jd - 2451545.0));

function altAz(ra, dec, jd, obs) {
  const ha = norm(gmst(jd) + obs.lon - ra);
  const alt = Math.asin(sin(obs.lat) * sin(dec) + cos(obs.lat) * cos(dec) * cos(ha)) / D;
  const az = norm(Math.atan2(-sin(ha), Math.tan(dec * D) * cos(obs.lat) - sin(obs.lat) * cos(ha)) / D);
  return { alt, az, ha: ha > 180 ? ha - 360 : ha };
}

export function sunAltAz(date, obs) {
  const jd = julian(date), s = sunEcliptic(jd), q = eclToEq(s.lon, 0, s.eps);
  return altAz(q.ra, q.dec, jd, obs);
}

export function moonAltAz(date, obs) {
  const jd = julian(date), m = moonEcliptic(jd), eps = sunEcliptic(jd).eps, q = eclToEq(m.lon, m.lat, eps);
  const r = altAz(q.ra, q.dec, jd, obs);
  return { ...r, alt: r.alt - m.parallax * cos(r.alt) }; // topocentric
}

/** Sun–Moon elongation 0–360 (0 new, 90 first quarter, 180 full). */
export function moonPhase(date) {
  const jd = julian(date);
  return norm(moonEcliptic(jd).lon - sunEcliptic(jd).lon);
}
export const illumination = (phaseDeg) => (1 - cos(phaseDeg)) / 2;

/** Next time the elongation reaches `target` degrees after `from`. */
export function nextPhase(from, target) {
  const f = (t) => ((moonPhase(new Date(t)) - target + 540) % 360) - 180;
  let t = from.getTime(), step = 6 * 3600000, prev = f(t);
  for (let i = 0; i < 200; i++) {
    const t2 = t + step, v = f(t2);
    if (prev < 0 && v >= 0 && v - prev < 90) {
      let a = t, b = t2;
      for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (f(m) < 0) a = m; else b = m; }
      return new Date(b);
    }
    t = t2; prev = v;
  }
  return null;
}

/** Sunrise/sunset as minutes after `startUtc` (a local midnight). */
export function riseSet(startUtc, obs) {
  let rise = null, set = null, prev = sunAltAz(startUtc, obs).alt + 0.833;
  for (let m = 2; m <= 1440; m += 2) {
    const v = sunAltAz(new Date(startUtc.getTime() + m * 60000), obs).alt + 0.833;
    if (prev < 0 && v >= 0 && rise == null) rise = m - 2 + 2 * (-prev / (v - prev));
    if (prev >= 0 && v < 0 && set == null) set = m - 2 + 2 * (prev / (prev - v));
    prev = v;
  }
  return { riseMin: rise, setMin: set };
}

// JPL approximate Keplerian elements: a, e, I, L, long.peri, long.node + rates per century.
const EL = {
  mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
  earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
};

/** Heliocentric ecliptic position: { lon (deg), r (AU), x, y }. */
export function helio(body, jd) {
  const v = EL[body], T = (jd - 2451545.0) / 36525;
  const [a, e, I, L, wbar, O] = [0, 1, 2, 3, 4, 5].map((i) => v[i] + v[i + 6] * T);
  const M = norm(L - wbar) * D, w = (wbar - O);
  let E = M;
  for (let k = 0; k < 20; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const x = (cos(w) * cos(O) - sin(w) * sin(O) * cos(I)) * xp + (-sin(w) * cos(O) - cos(w) * sin(O) * cos(I)) * yp;
  const y = (cos(w) * sin(O) + sin(w) * cos(O) * cos(I)) * xp + (-sin(w) * sin(O) + cos(w) * cos(O) * cos(I)) * yp;
  return { lon: norm(Math.atan2(y, x) / D), r: Math.hypot(x, y), x, y };
}
