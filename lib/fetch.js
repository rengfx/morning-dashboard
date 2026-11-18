// Fetchers: build one normalized day (the scorer input) from live sources.
// Runs in Cloudflare Workers (Pages Functions) and in Node 18+ (global fetch).
// Secrets: ICS_URL comes from env only and never appears in output or error text.

import { TZ, partsIn, addDays, weekdayOf, dstInfo } from '../public/js/time.js';
import { pressureAt, daySeries, workPressure } from './pressure.js';
import { parseICS, eventsOn, parseGame } from './ics.js';
import { scheduleUrl, parseClasses } from './hume.js';
import { scoreboardUrl, parseScoreboard, teamGames, teamScheduleGames, lakersTv } from './nba.js';

const hasCache = typeof caches !== 'undefined' && caches.default;

async function getText(url, ttlMin, label) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal, cf: { cacheTtl: ttlMin * 60, cacheEverything: true } });
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? `${label}: timeout` : e.message.startsWith(label) ? e.message : `${label}: fetch failed`);
  } finally { clearTimeout(timer); }
}
const getJSON = async (url, ttl, label) => JSON.parse(await getText(url, ttl, label));

/** ICS with "keep the last good copy" (SPEC 4.1). The cache key is a hash, not the URL. */
async function getICS(url, ttl, label) {
  const key = hasCache ? new Request(`https://cache.local/ics/${await sha(url)}`) : null;
  try {
    const cal = parseICS(await getText(url, ttl, label));
    if (!cal.complete) throw new Error(`${label}: file cut off`);
    if (key) await caches.default.put(key, new Response(JSON.stringify(cal), { headers: { 'cache-control': 'max-age=604800' } }));
    return { cal };
  } catch (e) {
    if (key) { const hit = await caches.default.match(key); if (hit) return { cal: await hit.json(), stale: e.message }; }
    throw e;
  }
}
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}

const hhmm = (iso) => iso.slice(11, 16);

/** Pick today's hourly rows from an Open-Meteo hourly block. */
function today(hourly, date, keys) {
  const out = { time: [] };
  for (const k of Object.keys(keys)) out[k] = [];
  hourly.time.forEach((t, i) => {
    if (!t.startsWith(date)) return;
    out.time.push(hhmm(t));
    for (const [k, src] of Object.entries(keys)) out[k].push(hourly[src][i]);
  });
  return out;
}

/** Days the page can show, relative to today (the forecast reaches 7 days). */
export const DAY_RANGE = [-1, 6];

/** Build one day. `offset` = days from today (−1 … +6). Only today gets a "now". */
export async function buildDay(env, cfg, nowDate = new Date(), offset = 0) {
  const tz = cfg.location.tz || TZ;
  const p = partsIn(nowDate, tz);
  offset = Math.max(DAY_RANGE[0], Math.min(DAY_RANGE[1], Math.trunc(+offset || 0)));
  const date = addDays(p.date, offset), errors = [];
  const { lat, lon } = cfg.location;
  const L = cfg.surf.marinePoint;
  const ymd8 = (d) => d.replace(/-/g, '');

  const urls = {
    forecast: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + '&hourly=temperature_2m,precipitation_probability,precipitation,uv_index,wind_speed_10m,wind_direction_10m,cloud_cover,pressure_msl'
      + `&daily=sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=mm&timezone=${encodeURIComponent(tz)}&past_days=4&forecast_days=8`,
    marine: `https://marine-api.open-meteo.com/v1/marine?latitude=${L.lat}&longitude=${L.lon}`
      + `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,sea_surface_temperature&length_unit=imperial&timezone=${encodeURIComponent(tz)}&past_days=2&forecast_days=8`,
    park: cfg.basketball ? `https://api.open-meteo.com/v1/forecast?latitude=${cfg.basketball.lat}&longitude=${cfg.basketball.lon}`
      + '&hourly=temperature_2m,precipitation_probability,wind_speed_10m,wind_direction_10m'
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=${encodeURIComponent(tz)}&past_days=1&forecast_days=8` : null,
    work: cfg.work ? `https://api.open-meteo.com/v1/forecast?latitude=${cfg.work.lat}&longitude=${cfg.work.lon}&hourly=pressure_msl&timezone=${encodeURIComponent(tz)}&past_days=2&forecast_days=8` : null,
    tides: `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${cfg.surf.tideStation}&product=predictions&interval=hilo&datum=MLLW&units=english&time_zone=lst_ldt&format=json&application=morning-dashboard`
      + `&begin_date=${ymd8(addDays(date, -1))}&end_date=${ymd8(addDays(date, 1))}`,
  };
  const C = cfg.cacheMin;
  const icsUrl = env && env.ICS_URL ? String(env.ICS_URL).replace(/^webcal:/i, 'https:') : null;

  const HC = cfg.hume.classes;
  const XL = (cfg.nba && cfg.nba.extra) || [], TS = (cfg.nba && cfg.nba.teamSchedules) || [];
  const [fc, mr, td, rt, lk, hc, pk, nb, xs, ts, lt, wk] = await Promise.allSettled([
    getJSON(urls.forecast, C.weather, 'weather'),
    getJSON(urls.marine, C.marine, 'marine'),
    getJSON(urls.tides, C.tides, 'tides'),
    icsUrl ? getICS(icsUrl, C.ics, 'calendar') : Promise.reject(new Error('calendar: ICS_URL not set')),
    getICS(cfg.lakers.icsUrl, C.lakers, 'lakers'),
    HC ? getJSON(scheduleUrl(HC, date, tz), C.hume || 60, 'hume classes').then((j) => parseClasses(j, date, tz)) : Promise.resolve(null),
    urls.park ? getJSON(urls.park, C.weather, 'court weather') : Promise.resolve(null),
    cfg.nba ? getJSON(scoreboardUrl(cfg.nba.scoreboardUrl, date), C.nba || 30, 'nba').then((j) => parseScoreboard(j, tz)) : Promise.resolve(null),
    Promise.allSettled(XL.map((x) => getJSON(scoreboardUrl(x.url, date), C.nba || 30, x.league.toLowerCase()).then((j) => teamGames(j, x.league, x.teams, tz)))),
    Promise.allSettled(TS.map((x) => getJSON(x.url, C.teamSchedule || 360, x.league.toLowerCase()).then((j) => teamScheduleGames(j, x.league, x.team, date, tz)))),
    cfg.lakersTv ? getJSON(cfg.lakersTv.url, C.teamSchedule || 360, 'lakers tv').then((j) => lakersTv(j, date, tz)) : Promise.resolve(null),
    urls.work && cfg.work.days.includes(weekdayOf(date)) ? getJSON(urls.work, C.weather, 'work pressure') : Promise.resolve(null),
  ]);
  const err = (r, src) => { if (r.status === 'rejected') errors.push({ source: src, message: r.reason.message }); };
  err(fc, 'weather'); err(mr, 'marine'); err(td, 'tides'); err(rt, 'calendar'); err(lk, 'lakers'); err(hc, 'hume classes'); err(pk, 'court weather'); err(nb, 'nba'); err(lt, 'lakers tv'); err(wk, 'work pressure');
  const extra = [];
  if (xs.status === 'fulfilled') xs.value.forEach((r, i) => { if (r.status === 'fulfilled') extra.push(...r.value); else errors.push({ source: XL[i].league.toLowerCase(), message: r.reason?.message || 'failed' }); });
  if (ts.status === 'fulfilled') ts.value.forEach((r, i) => { if (r.status === 'fulfilled') extra.push(...r.value); else errors.push({ source: TS[i].league.toLowerCase(), message: r.reason?.message || 'failed' }); });
  for (const [r, src] of [[rt, 'calendar'], [lk, 'lakers']]) if (r.status === 'fulfilled' && r.value.stale) errors.push({ source: src, message: `using last good copy (${r.value.stale})` });

  const day = { date, offset, weekday: weekdayOf(date), now: offset === 0 ? p.time : null, sun: null, calendar: [], hourly: {}, marine: {}, tide: { station: cfg.surf.tideStation, hilo: [] }, lakers: null, nba: nb.status === 'fulfilled' ? nb.value : null, sportsExtra: extra.sort((a, b) => a.tip.localeCompare(b.tip)), humeClasses: hc.status === 'fulfilled' ? hc.value : null, rain72hMm: 0, dst: dstInfo(date, tz) };

  if (fc.status === 'fulfilled') {
    const j = fc.value;
    day.hourly = today(j.hourly, date, { tempF: 'temperature_2m', precipPct: 'precipitation_probability', precipMm: 'precipitation', uv: 'uv_index', windMph: 'wind_speed_10m', windDir: 'wind_direction_10m' });
    const di = j.daily.time.indexOf(date);
    if (di >= 0) day.sun = { rise: hhmm(j.daily.sunrise[di]), set: hhmm(j.daily.sunset[di]) };
    // 72 h rain up to now (today) or up to 06:00 on another day
    const nowKey = offset === 0 ? `${date}T${p.time.slice(0, 2)}:00` : `${date}T06:00`;
    const idx = j.hourly.time.indexOf(nowKey);
    if (idx >= 0) {
      const win = j.hourly.precipitation.slice(Math.max(0, idx - 72), idx + 1);
      day.rain72hMm = Math.round(win.reduce((a, b) => a + (b || 0), 0) * 10) / 10;
      // R42 ocean advisory ends 72 h after the last hour with measurable rain (≥ 0.2 mm)
      let last = -1; for (let k = idx; k >= Math.max(0, idx - 72); k--) if ((j.hourly.precipitation[k] || 0) >= 0.2) { last = k; break; }
      if (last >= 0) day.lastRain = j.hourly.time[last]; // local 'YYYY-MM-DDTHH:00'
      // R47 pressure: now, change over the last 24 h, the largest 24-h change in the next 24 h
      const pa = pressureAt(j.hourly.time, j.hourly.pressure_msl, idx); if (pa) day.pressure = pa;
    }
  }
  if (!day.sun) day.sun = { rise: '06:45', set: '17:30' }; // placeholder so the page still renders; errors[] says why
  if (mr.status === 'fulfilled') {
    const mh = mr.value.hourly;
    const hasSst = Array.isArray(mh.sea_surface_temperature);
    day.marine = today(mh, date, { swellFt: 'swell_wave_height', swellPeriodS: 'swell_wave_period', swellDirDeg: 'swell_wave_direction', ...(hasSst ? { seaTemp: 'sea_surface_temperature' } : {}) });
    if (hasSst) { // convert to °F unless the feed already says °F
      const unit = (mr.value.hourly_units && mr.value.hourly_units.sea_surface_temperature) || '°C';
      day.marine.seaTempF = day.marine.seaTemp.map((v) => (v == null ? null : Math.round((/F/i.test(unit) ? v : v * 9 / 5 + 32) * 10) / 10));
      delete day.marine.seaTemp;
    }
  }
  if (pk.status === 'fulfilled' && pk.value && pk.value.hourly) day.park = { hourly: today(pk.value.hourly, date, { tempF: 'temperature_2m', precipPct: 'precipitation_probability', windMph: 'wind_speed_10m', windDir: 'wind_direction_10m' }) };
  // R49 pressure chart (Venice, whole day) and work-hours pressure (Torrance, work days only)
  if (fc.status === 'fulfilled') { const ps = daySeries(fc.value.hourly.time, fc.value.hourly.pressure_msl, date); if (ps) day.pressureDay = { home: ps }; }
  if (wk.status === 'fulfilled' && wk.value && wk.value.hourly) {
    const H = wk.value.hourly, w = workPressure(H.time, H.pressure_msl, date, cfg.work.start, cfg.work.end);
    if (w) day.workPressure = { place: cfg.work.place, start: cfg.work.start, end: cfg.work.end, ...w };
    const ws = daySeries(H.time, H.pressure_msl, date); if (ws) day.pressureDay = { ...(day.pressureDay || {}), work: ws };
  }
  if (fc.status === 'fulfilled' && Array.isArray(fc.value.hourly.cloud_cover)) { // R22 sky notes: clouds from today 00:00 for 7 days
    const H = fc.value.hourly, i0 = H.time.indexOf(`${p.date}T00:00`);
    if (i0 >= 0) day.clouds = { start: H.time[i0], pct: H.cloud_cover.slice(i0, i0 + 7 * 24) };
  }
  if (td.status === 'fulfilled' && td.value.predictions) {
    day.tide.hilo = td.value.predictions.map((x) => {
      const d = x.t.slice(0, 10);
      return { t: x.t.slice(11, 16), ft: +x.v, type: x.type, dayOffset: d < date ? -1 : d > date ? 1 : 0 };
    });
  }
  if (rt.status === 'fulfilled') day.calendar = eventsOn(rt.value.cal, date, tz).filter((e) => !e.allDay).map(({ title, start, end }) => ({ title, start, end }));
  if (lk.status === 'fulfilled') {
    const g = eventsOn(lk.value.cal, date, tz).map((e) => parseGame(e, cfg.lakers.team)).filter(Boolean)[0];
    if (g) day.lakers = { ...g, watch: lt.status === 'fulfilled' && lt.value ? lt.value : null };
  }
  return { day, errors };
}
