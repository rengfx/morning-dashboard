// R22 sky notes: worth-seeing Moon and planet events for the next few days, plus planets tonight.
// Pure functions (browser and Node). Shown only when something qualifies; nothing on quiet days.
import { TZ, partsIn, zonedToUtc, addDays, ymd, weekdayOf } from './time.js';
import * as A from './astro.js';

export const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const NAME = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', moon: 'Moon' };
const MIN = 60000;
const LIM = { dark: -8, minAlt: 8, moonPlanet: 7, planetPair: 2.5, thinLo: 1.5, thinHi: 15, cloudy: 60, partly: 30 };

const hhmm = (ms, tz) => partsIn(new Date(ms), tz).time;
const moonAt = (ms, obs) => A.moonAltAz(new Date(ms), obs);
const illum = (ms) => A.illumination(A.moonPhase(new Date(ms)));
const waxing = (ms) => A.moonPhase(new Date(ms)) < 180;

/** First time in [a, b] when f(t) crosses zero upward (dir 1) or downward (dir -1); 2-min steps. */
function cross(a, b, f, dir) {
  let prev = f(a);
  for (let t = a + 2 * MIN; t <= b; t += 2 * MIN) { const v = f(t); if (dir > 0 ? prev < 0 && v >= 0 : prev >= 0 && v < 0) return t; prev = v; }
  return null;
}

function sunTimes(date, obs, tz) {
  const [y, m, d] = ymd(date), t0 = zonedToUtc(y, m, d, 0, 0, 0, tz).getTime();
  const rs = A.riseSet(new Date(t0), obs);
  return { t0, rise: t0 + rs.riseMin * MIN, set: t0 + rs.setMin * MIN };
}

/** Cloud cover % at a time from the /api/today `clouds` block ({start: 'YYYY-MM-DDT00:00', pct: [hourly]}). */
export function cloudAt(clouds, ms, tz = TZ) {
  if (!clouds || !clouds.start || !clouds.pct) return null;
  const p = partsIn(new Date(ms), tz), d0 = clouds.start.slice(0, 10);
  const days = Math.round((Date.UTC(...ymd(p.date).map((v, i) => (i === 1 ? v - 1 : v))) - Date.UTC(...ymd(d0).map((v, i) => (i === 1 ? v - 1 : v)))) / 864e5);
  const i = days * 24 + p.h;
  return i >= 0 && i < clouds.pct.length && clouds.pct[i] != null ? clouds.pct[i] : null;
}

/** Events from `fromDate` for `days` days. Each: {date, at (ms), time, title, detail, kind, cloud, sky}. */
export function findSkyEvents({ fromDate, days = 4, obs, tz = TZ, clouds = null }) {
  const out = [];
  for (let k = 0; k < days; k++) {
    const date = addDays(fromDate, k), S = sunTimes(date, obs, tz);
    const evening = [], morning = [];
    for (let t = S.set + 20 * MIN; t <= S.set + 5 * 60 * MIN; t += 10 * MIN) evening.push(t);
    for (let t = S.rise - 3 * 60 * MIN; t <= S.rise - 20 * MIN; t += 10 * MIN) morning.push(t);

    // 1 thin crescent after sunset / before sunrise
    { const t = S.set + 25 * MIN, m = moonAt(t, obs), il = illum(t) * 100;
      if (waxing(t) && il >= LIM.thinLo && il <= LIM.thinHi && m.alt >= 4) {
        const set = cross(t, t + 4 * 60 * MIN, (x) => moonAt(x, obs).alt, -1);
        out.push({ date, at: t, kind: 'moon', key: `thin-eve-${date}`, bodies: ['moon'], title: 'Thin Moon after sunset', detail: `${Math.round(il)}% crescent, low in the ${A.compass(m.az)}${set ? `. Sets ${hhmm(set, tz)}` : ''}.`, metric: il });
      } }
    { const t = S.rise - 35 * MIN, m = moonAt(t, obs), il = illum(t) * 100;
      if (!waxing(t) && il >= LIM.thinLo && il <= LIM.thinHi && m.alt >= 4) {
        out.push({ date, at: t, kind: 'moon', key: `thin-morn-${date}`, bodies: ['moon'], title: 'Thin Moon before sunrise', detail: `${Math.round(il)}% crescent, low in the ${A.compass(m.az)}. Sunrise ${hhmm(S.rise, tz)}.`, metric: il });
      } }
    // 2 full Moon rising at dusk
    { const rise = cross(S.set - 90 * MIN, S.set + 90 * MIN, (x) => moonAt(x, obs).alt, 1);
      if (rise && illum(rise) >= 0.97 && Math.abs(rise - S.set) <= 75 * MIN) {
        out.push({ date, at: rise, kind: 'moon', key: `full-rise-${date}`, bodies: ['moon'], title: 'Full Moon rises at dusk', detail: `Rises ${hhmm(rise, tz)} in the ${A.compass(moonAt(rise + 10 * MIN, obs).az)}. Sunset ${hhmm(S.set, tz)}.`, metric: 0 });
      } }
    // 3 Moon near a planet, 4 two planets close (dark sky, both above 8°)
    for (const [list, part] of [[evening, 'evening'], [morning, 'morning']]) {
      let bestM = {}, bestP = {};
      for (const t of list) {
        if (A.sunAltAz(new Date(t), obs).alt > LIM.dark) continue;
        const m = moonAt(t, obs), P = Object.fromEntries(PLANETS.map((b) => [b, A.planetAltAz(b, new Date(t), obs)]));
        for (const b of PLANETS) {
          if (P[b].alt < LIM.minAlt) continue;
          if (m.alt >= LIM.minAlt) { const s = A.separation(m, P[b]); if (s < LIM.moonPlanet && (!bestM[b] || s < bestM[b].s)) bestM[b] = { s, t, alt: P[b].alt, az: P[b].az }; }
          for (const c of PLANETS) if (c > b && P[c].alt >= LIM.minAlt) {
            const s = A.separation(P[b], P[c]); const key = `${b}-${c}`;
            if (s < LIM.planetPair && (!bestP[key] || s < bestP[key].s)) bestP[key] = { s, t, alt: (P[b].alt + P[c].alt) / 2, az: P[b].az, b, c };
          }
        }
      }
      for (const [b, v] of Object.entries(bestM)) out.push({ date, at: v.t, kind: 'moon-planet', key: `moon-${b}-${part}`, bodies: ['moon', b], title: `Moon near ${NAME[b]}`, detail: `${v.s.toFixed(1)}° apart, ${A.compass(v.az)}, ${Math.round(v.alt)}° up.`, metric: v.s });
      for (const [key, v] of Object.entries(bestP)) out.push({ date, at: v.t, kind: 'planets', key: `pair-${key}`, bodies: [v.b, v.c], title: `${NAME[v.b]} and ${NAME[v.c]} close`, detail: `${v.s.toFixed(1)}° apart, ${A.compass(v.az)}, ${Math.round(v.alt)}° up.`, metric: v.s });
    }
  }
  // Keep the best day for repeating events (a planet pair, the Moon near the same planet in the same part of the night).
  const best = new Map();
  for (const e of out) { const k = e.kind === 'planets' || e.kind === 'moon-planet' ? e.key : e.key; const o = best.get(k); if (!o || e.metric < o.metric) best.set(k, e); }
  return [...best.values()].sort((a, b) => a.at - b.at).map(({ metric, key, ...e }) => {
    const cloud = cloudAt(clouds, e.at, tz);
    return { ...e, weekday: weekdayOf(e.date), time: hhmm(e.at, tz), cloud, sky: cloud == null ? 'unknown' : cloud >= LIM.cloudy ? 'cloudy' : cloud >= LIM.partly ? 'partly' : 'clear' };
  });
}

/** Planets above 10° in a dark sky tonight (sunset+30 min → next sunrise−30 min). */
export function planetsTonight({ date, obs, tz = TZ }) {
  const S = sunTimes(date, obs, tz), N = sunTimes(addDays(date, 1), obs, tz);
  const res = [];
  for (const b of PLANETS) {
    let first = null, last = null, top = null;
    for (let t = S.set + 30 * MIN; t <= N.rise - 30 * MIN; t += 10 * MIN) {
      if (A.sunAltAz(new Date(t), obs).alt > LIM.dark) continue;
      const p = A.planetAltAz(b, new Date(t), obs);
      if (p.alt < 10) continue;
      if (first == null) first = t; last = t;
      if (!top || p.alt > top.alt) top = { t, alt: p.alt, az: p.az };
    }
    if (first != null) res.push({ body: b, name: NAME[b], from: hhmm(first, tz), to: hhmm(last, tz), best: hhmm(top.t, tz), bestMs: top.t, alt: Math.round(top.alt), dir: A.compass(top.az), fromMs: first });
  }
  return res.sort((a, b) => a.fromMs - b.fromMs);
}
