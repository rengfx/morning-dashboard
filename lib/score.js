// Scorer + sorter: rules R1–R20 in SPEC.md. Pure function, no I/O.
// Input: a normalized day (see fixtures/*.json "input"). Output: sections in order + banners.

import { hm, fm } from '../public/js/time.js';
import { classesIn } from './hume.js';

// ---------- data access ----------

/** Value at a local minute from an hourly series. `time` (HH:MM list) is optional: index = hour if absent. */
function series(values, times) {
  const pts = [];
  const seen = new Set();
  (values || []).forEach((v, i) => {
    const t = times ? hm(times[i]) : i * 60;
    if (v == null || seen.has(t)) return; // a repeated hour (DST fall back): keep the first
    seen.add(t); pts.push([t, v]);
  });
  pts.sort((a, b) => a[0] - b[0]);
  return {
    at(min) {
      if (!pts.length) return null;
      if (min <= pts[0][0]) return pts[0][1];
      for (let k = 1; k < pts.length; k++) {
        if (min <= pts[k][0]) {
          const [t0, v0] = pts[k - 1], [t1, v1] = pts[k];
          return v0 + (v1 - v0) * (min - t0) / (t1 - t0);
        }
      }
      return pts[pts.length - 1][1];
    },
    hour(h) { const p = pts.find(([t]) => t === h * 60); return p ? p[1] : null; },
    points: pts,
  };
}

function tideCurve(hilo) {
  const pts = (hilo || []).map((p) => [hm(p.t) + 1440 * (p.dayOffset || 0), p.ft]).sort((a, b) => a[0] - b[0]);
  return (t) => {
    for (let k = 1; k < pts.length; k++) {
      const [a, ha] = pts[k - 1], [b, hb] = pts[k];
      if (a <= t && t <= b) { const x = (t - a) / (b - a); return ha + (hb - ha) * (1 - Math.cos(Math.PI * x)) / 2; }
    }
    return null;
  };
}

const lvlRange = (v, good, ok) => (v == null ? 0 : good[0] <= v && v <= good[1] ? 2 : ok[0] <= v && v <= ok[1] ? 1 : 0);
const MARK = ['BAD', 'OK', 'GOOD'];

// ---------- R5 surf ----------

function surfSlots(inp, cfg, S) {
  const s = cfg.surf;
  const rise = hm(inp.sun.rise), set = hm(inp.sun.set);
  const lo = s.earliest === 'sunrise' || !s.earliest ? rise : Math.max(rise, hm(s.earliest));
  const hi = s.latest === 'sunset' || !s.latest ? set : Math.min(set, hm(s.latest));
  const tide = tideCurve(inp.tide && inp.tide.hilo);
  const slots = [];
  for (let t = Math.ceil(lo / 30) * 30; t + 30 <= hi; t += 30) {
    const v = {
      swell: S.swell.at(t), period: S.period.at(t), dir: S.dir.at(t),
      tide: tide(t), wind: S.wind.at(t), windDir: S.windDir.at(t),
    };
    const f = [
      lvlRange(v.swell, s.swellFt.good, s.swellFt.ok),
      v.period == null ? 0 : v.period >= s.periodS.good ? 2 : v.period >= s.periodS.ok ? 1 : 0,
      lvlRange(v.dir, s.swellDirDeg.good, s.swellDirDeg.ok),
      lvlRange(v.tide, s.tideFtMLLW.good, s.tideFtMLLW.ok),
      v.wind == null ? 0 : v.wind <= s.windMph.good ? 2 : v.wind <= s.windMph.ok ? 1 : 0,
    ];
    if (v.windDir != null && s.offshoreDirDeg[0] <= v.windDir && v.windDir <= s.offshoreDirDeg[1]) f[4] = Math.min(2, f[4] + 1);
    const total = f.reduce((a, b) => a + b, 0);
    slots.push({ t, f, total, noBad: !f.includes(0), v });
  }
  return slots;
}

function runs(slots, pass, minLen) {
  const out = []; let cur = null;
  for (const sl of slots) {
    if (pass(sl) && cur == null) cur = sl.t;
    if (!pass(sl) && cur != null) { out.push([cur, sl.t]); cur = null; }
  }
  if (cur != null) out.push([cur, slots[slots.length - 1].t + 30]);
  return out.filter(([a, b]) => b - a >= minLen);
}

function surfSection(inp, cfg, S, nowMin) {
  const s = cfg.surf;
  const slots = surfSlots(inp, cfg, S);
  const wins = runs(slots, (x) => x.noBad && x.total >= s.minScore, s.minWindowMin);
  const names = ['swell', 'period', 'direction', 'tide', 'wind'];
  let nearMiss = null;
  if (!wins.length) {
    const nm = runs(slots, (x) => x.noBad && x.total >= s.minScore - 1, s.minWindowMin);
    if (nm.length) nearMiss = { start: fm(nm[0][0]), end: fm(nm[0][1]), score: s.minScore - 1, of: 10 };
  }
  const focus = wins.length ? wins[0][0] : nearMiss ? hm(nearMiss.start) : nowMin ?? hm(inp.sun.rise);
  const at = slots.find((x) => x.t >= focus) || slots[slots.length - 1];
  const sec = {
    type: 'surf', spot: s.spot,
    start: wins.length ? fm(wins[0][0]) : null, end: wins.length ? fm(wins[0][1]) : null,
    window: wins.length > 0, laterWindows: wins.slice(1).map(([a, b]) => [fm(a), fm(b)]),
    firstWindowScores: wins.length ? Object.fromEntries(names.map((n, i) => [n, slots.find((x) => x.t === wins[0][0]).f[i]])) : null,
    nearMiss,
    advisory: (inp.rain72hMm || 0) >= cfg.surf.rainAdvisoryMm,
  };
  if (at) {
    const tideNext = tideCurve(inp.tide && inp.tide.hilo)(at.t + 30);
    sec.cells = {
      at: fm(at.t),
      swell: { ft: round1(at.v.swell), level: MARK[at.f[0]] },
      period: { s: Math.round(at.v.period ?? 0), dirDeg: Math.round(at.v.dir ?? 0), level: MARK[Math.min(at.f[1], at.f[2])] },
      tide: { ft: round1(at.v.tide), rising: tideNext != null && at.v.tide != null ? tideNext > at.v.tide : null, level: MARK[at.f[3]] },
      wind: { mph: Math.round(at.v.wind ?? 0), dirDeg: Math.round(at.v.windDir ?? 0), level: MARK[at.f[4]] },
    };
  }
  return sec;
}
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

// ---------- R3 / R6 / R10 / R11 Hume ----------

const TYPE = { am: 'humeAM', pm: 'humePM', day: 'humeDay', hoops: 'basketball' };

/** Window section (Hume AM / PM / all-day, Basketball). `win` = {start, end, source} when the caller picked the window. */
function hume(inp, cfg, which, S, game, nowMin, win) {
  const h = cfg.hume;
  let st, en, source;
  if (win) ({ start: st, end: en, source } = win);
  else {
    const re = new RegExp(h.match, 'i');
    const ev = (inp.calendar || []).filter((e) => re.test(e.title) && (hm(e.start) < 720) === (which === 'am'));
    if (ev.length) { st = ev[0].start; en = ev[0].end; source = 'calendar'; }
    else { [st, en] = h.defaults[which]; source = 'default'; }
  }
  const a = hm(st), b = hm(en);
  const sec = { type: TYPE[which], start: st, end: en, source, status: 'GO', goBy: null };
  // R18 classes that fit inside the window (null = feed not loaded); none for Basketball
  if (which !== 'hoops') sec.classes = inp.humeClasses ? classesIn(inp.humeClasses, st, en).map((c) => (nowMin != null && hm(c.start) <= nowMin ? { ...c, started: true } : c)) : null;
  const hrs = []; for (let x = Math.floor(a / 60); x <= Math.floor((b - 1) / 60); x++) hrs.push(x);
  const pop = hrs.map((x) => [x, S.pop.hour(x) ?? 0]);
  const maxP = pop.reduce((m, p) => (p[1] > m[1] ? p : m), [hrs[0], -1]);

  // R6 rain
  if (pop.some(([, v]) => v >= h.rainOkPct)) {
    const first = pop.find(([, v]) => v >= h.rainNoPct);
    if (first && first[0] * 60 - a >= 30) { let g = first[0] * 60 - 30; g -= g % 30; sec.status = 'GO BY'; sec.goBy = fm(g); }
    else if (first) sec.status = 'RAIN';
  }
  // wind
  const windMax = Math.max(...hrs.map((x) => S.wind.at(x * 60 + 30) ?? 0));
  if (windMax >= h.windNoMph && sec.status === 'GO') sec.status = 'WINDY';

  // R11 Lakers overlap (not for the all-day block or Basketball: those only note the game)
  if (game && (which === 'day' || which === 'hoops')) { if (hm(game.start) < b && hm(game.end) > a) sec.gameNote = `Lakers ${game.start}.`; }
  else if (game && (sec.status === 'GO' || sec.status === 'GO BY')) {
    const g0 = hm(game.start), g1 = hm(game.end);
    if (g0 < b && g1 > a) {
      if (g1 <= b - 30) { sec.status = 'GO AFTER'; sec.goAfter = fm(g1); }
      else {
        sec.status = 'CONFLICT';
        const endS = g0 - 15;
        const keepStart = endS - a >= 60 ? a : endS - (b - a);
        sec.suggest = [fm(keepStart), fm(endS)];
      }
    }
  }

  // R12 / R13 now and passed
  if (nowMin != null) { sec.now = a <= nowMin && nowMin < b; sec.passed = nowMin >= b; }

  // cells
  const rise = hm(inp.sun.rise), set = hm(inp.sun.set), tol = h.darkToleranceMin;
  const tempStart = S.temp.at(a);
  const later = [];
  for (let x = Math.ceil(b / 60); x <= Math.ceil(b / 60) + 3 && x < 24; x++) later.push([x, S.pop.hour(x) ?? 0]);
  let rainLater = later.find(([, v]) => v >= h.rainNoPct);
  // R29 walk home: only for a block that ends when Hume closes that day
  const close = h.close && (cfg.weekendDays.includes(inp.weekday) ? h.close.weekend : h.close.weekday);
  if (which !== 'hoops' && close && en === close) {
    const hr0 = Math.floor(b / 60), hr1 = Math.floor((b + h.walkMin) / 60);
    const pct = Math.max(S.pop.hour(hr0) ?? 0, S.pop.hour(Math.min(23, hr1)) ?? 0);
    const next = S.pop.hour(Math.min(23, hr1 + 1)) ?? 0;
    sec.walkHome = { at: en, pct, rising: next > pct, level: pct >= h.rainNoPct ? 'BAD' : pct >= h.rainOkPct ? 'OK' : 'GOOD' };
    if (rainLater && rainLater[0] <= hr1) rainLater = null; // the walk-home note covers that hour
  }
  sec.cells = {
    rain: { pct: Math.max(0, maxP[1]), at: maxP[1] >= h.rainOkPct ? fm(maxP[0] * 60) : null, level: maxP[1] >= h.rainNoPct ? 'BAD' : maxP[1] >= h.rainOkPct ? 'OK' : 'GOOD' },
    wind: { mph: Math.round(windMax), dirDeg: Math.round(S.windDir.at(a) ?? 0), level: windMax >= h.windNoMph ? 'BAD' : 'GOOD' },
    temp: { f: tempStart == null ? null : Math.round(tempStart), level: tempStart == null ? 'OK' : tempStart < h.coldF ? 'COLD' : tempStart < h.coolF ? 'COOL' : 'GOOD' },
    light: { rise: inp.sun.rise, set: inp.sun.set, dark: a < rise - tol || b > set + tol },
  };
  const dry = maxP[1] < h.rainOkPct;
  const bits = [];
  if (sec.status === 'GO AFTER') bits.push('After the game.');
  else if (sec.status === 'CONFLICT') bits.push(`Lakers at ${game.start}. Go ${sec.suggest[0]}–${sec.suggest[1]}.`);
  else if (sec.status === 'GO BY') bits.push(`Rain near ${fm(pop.find(([, v]) => v >= h.rainNoPct)[0] * 60)}.`);
  else if (sec.status === 'RAIN') bits.push('Rain in the window.');
  else bits.push(dry ? 'Dry.' : 'Low rain chance.');
  if (rainLater && sec.status !== 'RAIN' && sec.status !== 'GO BY') bits.push(`Rain after ${fm(rainLater[0] * 60)}.`);
  if (sec.walkHome && !sec.passed && !(sec.walkHome.level === 'GOOD' && dry)) {
    const w = sec.walkHome;
    bits.push(w.level === 'BAD' ? `Rain on the walk home at ${w.at} (${w.pct}%). Bring a jacket.` : w.level === 'OK' ? `Walk home ${w.at}: ${w.pct}% rain${w.rising ? ', rising' : ''}.` : `Walk home ${w.at}: dry.`);
  }
  if (sec.cells.temp.level === 'COLD' || sec.cells.temp.level === 'COOL') bits.push('Wear a layer.');
  if (sec.gameNote) bits.push(sec.gameNote);
  sec.advice = bits.join(' ');
  return sec;
}

// ---------- R7 sun ----------

function sunSection(inp, cfg, S) {
  let pk = -1, pv = -1;
  for (let x = 0; x < 24; x++) { const v = S.uv.hour(x); if (v != null && v > pv) { pv = v; pk = x; } }
  if (pv < cfg.sun.hideIfMaxUvBelow) return null;
  const half = cfg.sun.windowHours / 2;
  const scr = [];
  for (let x = 0; x < 24; x++) if ((S.uv.hour(x) ?? 0) >= cfg.sun.sunscreenUv) scr.push(x);
  let tp = -1, tv = -999;
  for (let x = 6; x <= 20; x++) { const v = S.temp.hour(x); if (v != null && v > tv) { tv = v; tp = x; } }
  return {
    type: 'sun', start: fm((pk - half) * 60), end: fm((pk + half) * 60), uvPeak: pv, uvPeakAt: fm(pk * 60),
    sunscreen: scr.length ? [fm(scr[0] * 60), fm((scr[scr.length - 1] + 1) * 60)] : null,
    tempPeak: tv > -999 ? Math.round(tv) : null, tempPeakAt: tp >= 0 ? fm(tp * 60) : null,
  };
}

// ---------- main ----------

export function scoreDay(inp, cfg) {
  const hr = inp.hourly || {}, mr = inp.marine || {};
  const S = {
    temp: series(hr.tempF, hr.time), pop: series(hr.precipPct, hr.time), uv: series(hr.uv, hr.time),
    wind: series(hr.windMph, hr.time), windDir: series(hr.windDir, hr.time),
    swell: series(mr.swellFt, mr.time), period: series(mr.swellPeriodS, mr.time), dir: series(mr.swellDirDeg, mr.time),
  };
  const nowMin = inp.now ? hm(inp.now) : null;
  const game = inp.lakers
    ? { type: 'lakers', start: inp.lakers.tipoff, end: fm(hm(inp.lakers.tipoff) + cfg.lakers.gameLengthMin), ...pick(inp.lakers, ['opponentName', 'opponentFull', 'home', 'arena', 'tv']) }
    : null;

  // R19 windows: weekend = one all-day block (open hours); weekday = AM + PM.
  // R20 a Basketball event replaces Hume PM (weather at the court).
  const weekend = cfg.weekendDays.includes(inp.weekday);
  const hoopsRe = new RegExp(cfg.basketball.match, 'i');
  const hoops = (inp.calendar || []).find((e) => hoopsRe.test(e.title));
  const secs = weekend
    ? [hume(inp, cfg, 'day', S, game, nowMin, { start: cfg.hume.weekend[0], end: cfg.hume.weekend[1], source: 'hours' })]
    : [hume(inp, cfg, 'am', S, game, nowMin), ...(hoops && hm(hoops.start) >= 720 ? [] : [hume(inp, cfg, 'pm', S, game, nowMin)])];
  if (hoops) {
    const P = inp.park && inp.park.hourly && Array.isArray(inp.park.hourly.tempF) && inp.park.hourly.tempF.length ? inp.park.hourly : hr;
    const SP = { ...S, temp: series(P.tempF, P.time), pop: series(P.precipPct, P.time), wind: series(P.windMph, P.time), windDir: series(P.windDir, P.time) };
    const bk = hume(inp, cfg, 'hoops', SP, game, nowMin, { start: hoops.start, end: hoops.end, source: 'calendar' });
    bk.place = cfg.basketball.place; bk.parkWeather = P !== hr;
    secs.push(bk);
  }
  if (weekend) {
    secs.push(surfSection(inp, cfg, S, nowMin));
    const sun = sunSection(inp, cfg, S);
    if (sun) secs.push(sun);
  }
  if (game) secs.push(game);

  // R9 sort key: a surf section with no window sorts just after Hume AM.
  const am = secs.find((s) => s.type === 'humeAM' || s.type === 'humeDay');
  const key = (s) => (s.type === 'surf' && !s.window ? (am ? hm(am.start) + 1 : 360) : hm(s.start));
  secs.sort((x, y) => key(x) - key(y) || (x.type === 'humeDay' ? -1 : y.type === 'humeDay' ? 1 : x.type.startsWith('hume') ? -1 : 1));

  const lk = secs.find((s) => s.type === 'lakers'), sn = secs.find((s) => s.type === 'sun');
  if (lk && sn && hm(sn.start) <= hm(lk.start) && hm(lk.start) <= hm(sn.end)) sn.endsAtTipoff = true;
  for (const s of secs) if (nowMin != null && !['humeAM', 'humePM', 'humeDay', 'basketball'].includes(s.type) && s.end) {
    s.now = hm(s.start) <= nowMin && nowMin < hm(s.end); s.passed = nowMin >= hm(s.end);
  }

  // R15 / R16 banners
  const banners = [];
  if (inp.dst) {
    const word = inp.dst.direction === 'back' ? 'BACK' : 'FORWARD';
    banners.push(inp.dst.when === 'tonight'
      ? { kind: 'dst', text: `CLOCKS GO ${word} 1 H AT 02:00 TONIGHT` }
      : { kind: 'dst', text: inp.dst.direction === 'back' ? 'STANDARD TIME NOW' : 'DAYLIGHT TIME NOW' });
  }
  return { date: inp.date, weekday: inp.weekday, now: inp.now || null, sun: inp.sun, banners, order: secs.map((s) => s.type), sections: secs };
}

function pick(o, keys) { const r = {}; for (const k of keys) if (o[k] !== undefined) r[k] = o[k]; return r; }
