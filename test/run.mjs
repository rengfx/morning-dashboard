// Test harness: fixtures × sections coverage table, plus ICS, time, and astronomy checks.
// Run: node test/run.mjs   (exit code 1 on any failure)

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreDay } from '../lib/score.js';
import { parseICS, eventsOn, parseGame } from '../lib/ics.js';
import { dstInfo } from '../public/js/time.js';
import * as astro from '../public/js/astro.js';
import cfgMod from '../config/dashboard.config.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = cfgMod;
let fails = 0;
const rows = [];

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function subset(exp, act, path = '') {
  const bad = [];
  for (const [k, v] of Object.entries(exp)) {
    const a = act ? act[k] : undefined;
    if (v && typeof v === 'object' && !Array.isArray(v)) bad.push(...subset(v, a, `${path}${k}.`));
    else if (!eq(v, a === undefined && v === null ? null : a)) bad.push(`${path}${k}: want ${JSON.stringify(v)} got ${JSON.stringify(a)}`);
  }
  return bad;
}

// ---- 1. scorer fixtures ----
const files = readdirSync(join(root, 'fixtures')).filter((f) => f.endsWith('.json')).sort();
const types = ['humeAM', 'surf', 'sun', 'lakers', 'humePM'];
const table = [];
for (const f of files) {
  const fx = JSON.parse(readFileSync(join(root, 'fixtures', f), 'utf8'));
  const out = scoreDay(fx.input, cfg);
  const row = { fixture: f.replace('.json', ''), order: eq(out.order, fx.expected.order) ? 'pass' : 'FAIL' };
  const notes = [];
  if (row.order === 'FAIL') notes.push(`order: want ${fx.expected.order} got ${out.order}`);
  for (const t of types) {
    const exp = fx.expected.sections.find((s) => s.type === t);
    const act = out.sections.find((s) => s.type === t);
    if (!exp) { row[t] = act ? 'extra?' : '—'; if (act) notes.push(`${t}: not expected`); continue; }
    const bad = subset(exp, act);
    row[t] = bad.length ? 'FAIL' : 'pass';
    notes.push(...bad.map((b) => `${t}.${b}`));
  }
  if (fx.expected.banners) {
    const bad = subset({ b: fx.expected.banners }, { b: out.banners });
    row.banners = bad.length ? 'FAIL' : 'pass'; notes.push(...bad);
  } else row.banners = '—';
  if (notes.length) fails++;
  table.push(row);
  if (notes.length) rows.push(`  ${row.fixture}\n    ${notes.join('\n    ')}`);
}
console.log('\nSCORER · fixtures × sections');
console.table(table);
if (rows.length) console.log('Failures:\n' + rows.join('\n'));

// ---- 2. ICS, time, astronomy checks ----
const checks = [];
const check = (name, ok, info = '') => { checks.push({ check: name, result: ok ? 'pass' : 'FAIL', info }); if (!ok) fails++; };

const lakersText = readFileSync(join(root, 'fixtures/lakers-sample.ics'), 'utf8');
const lakers = parseICS(lakersText);
check('lakers feed complete', lakers.complete);
const g25 = eventsOn(lakers, '2026-10-25').map((e) => parseGame(e))[0];
check('Oct 25 tip-off 14:00 LA (Denver 15:00)', g25 && g25.tipoff === '14:00', JSON.stringify(g25));
check('Oct 25 away · Jazz · Delta Center · LOCAL', g25 && !g25.home && g25.opponentName === 'Jazz' && g25.arena === 'Delta Center' && g25.tv === 'LOCAL');
const g27 = eventsOn(lakers, '2026-10-27').map((e) => parseGame(e))[0];
check('Oct 27 20:00 home · Trail Blazers · NBC / Peacock', g27 && g27.tipoff === '20:00' && g27.home && g27.opponentName === 'Trail Blazers' && g27.arena === 'Crypto.com Arena' && g27.tv === 'NBC / Peacock', JSON.stringify(g27));
check('no Lakers game Oct 26', eventsOn(lakers, '2026-10-26').length === 0);
check('cut-off feed is rejected', parseICS(lakersText.slice(0, lakersText.length - 300)).complete === false);

const routine = parseICS(readFileSync(join(root, 'fixtures/routine-sample.ics'), 'utf8'));
const r = (d) => eventsOn(routine, d).filter((e) => /hume/i.test(e.title)).map((e) => `${e.start}-${e.end}`).join(',');
check('weekly Hume Oct 25 (PDT)', r('2026-10-25') === '07:00-10:00,16:00-19:00', r('2026-10-25'));
check('weekly Hume Nov 1 keeps 07:00 after DST', r('2026-11-01') === '07:00-10:00,16:00-19:00', r('2026-11-01'));
check('EXDATE removes Nov 8 AM', r('2026-11-08') === '16:00-19:00', r('2026-11-08'));
check('RECURRENCE-ID moves Nov 15 AM to 08:00', r('2026-11-15') === '08:00-10:00,16:00-19:00', r('2026-11-15'));
check('no Hume on a Tuesday', r('2026-10-27') === '', r('2026-10-27'));

check('DST: Oct 31 → back tonight', eq(dstInfo('2026-10-31'), { when: 'tonight', direction: 'back' }));
check('DST: Nov 1 → today', eq(dstInfo('2026-11-01'), { when: 'today', direction: 'back' }));
check('DST: Oct 30 → none', dstInfo('2026-10-30') === null);

// Astronomy: reference values (Venus inferior conjunction 2026-10-24; full Moon 2026-10-26).
const jd = (iso) => astro.julian(new Date(iso));
const he = astro.helio('earth', jd('2026-10-24T07:00:00Z')), hv = astro.helio('venus', jd('2026-10-24T07:00:00Z'));
const dl = Math.abs(((he.lon - hv.lon + 540) % 360) - 180);
check('Venus–Earth longitude < 2° on Oct 24 (inferior conjunction)', dl < 2, `${dl.toFixed(2)}°`);
const full = astro.nextPhase(new Date('2026-10-20T00:00:00Z'), 180);
check('full Moon on Oct 26 UTC', full.toISOString().startsWith('2026-10-26'), full.toISOString());
// Published times (calendar-12.com, checked 2026-10-31): full 10-26 04:13Z, last qtr 11-01 20:30Z, new 11-09 07:03Z, first qtr 11-17 11:49Z.
for (const [name, deg, ref] of [['full', 180, '2026-10-26T04:13Z'], ['last quarter', 270, '2026-11-01T20:30Z'], ['new', 0, '2026-11-09T07:03Z'], ['first quarter', 90, '2026-11-17T11:49Z']]) {
  const got = astro.nextPhase(new Date('2026-10-20T00:00:00Z'), deg), mins = Math.abs(got - new Date(ref)) / 60000;
  check(`${name} Moon within 30 min of published`, mins <= 30, `${mins.toFixed(0)} min off`);
}
const VEN = { lat: 33.985, lon: -118.47 };
const altNight = astro.moonAltAz(new Date('2026-10-26T05:00:00Z'), VEN).alt; // Oct 25 22:00 PDT
const altDay = astro.moonAltAz(new Date('2026-10-25T17:00:00Z'), VEN).alt;   // Oct 25 10:00 PDT
check('full-ish Moon high at 22:00, below horizon at 10:00', altNight > 20 && altDay < 0, `${altNight.toFixed(1)}° / ${altDay.toFixed(1)}°`);
const sunNoon = astro.sunAltAz(new Date('2026-10-25T19:45:00Z'), VEN).alt;
check('Sun altitude near local noon ≈ 43°', Math.abs(sunNoon - 43) < 2, `${sunNoon.toFixed(1)}°`);
const rs = astro.riseSet(new Date('2026-10-25T07:00:00Z'), VEN);
check('sunrise ≈ 07:05 PDT Oct 25 (±4 min)', Math.abs(rs.riseMin - (7 * 60 + 5)) <= 4, `${Math.round(rs.riseMin)} min`);

// ---- 3. fetchers with a fake network (no real API calls) ----
const { buildDay } = await import('../lib/fetch.js');
const SECRET = 'https://p01-caldav.icloud.com/published/2/SECRET-TOKEN-123';
const fxR = JSON.parse(readFileSync(join(root, 'fixtures/2026-10-31-sat-real.json'), 'utf8')).input;
const hrs = (d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`);
const days = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
const fake = {
  'api.open-meteo.com': {
    hourly: {
      time: days.flatMap(hrs),
      temperature_2m: days.flatMap(() => fxR.hourly.tempF), precipitation_probability: days.flatMap(() => fxR.hourly.precipPct),
      precipitation: days.flatMap((d) => Array(24).fill(d === '2026-10-30' ? 0.2 : 0)), uv_index: days.flatMap(() => fxR.hourly.uv),
      wind_speed_10m: days.flatMap(() => fxR.hourly.windMph), wind_direction_10m: days.flatMap(() => fxR.hourly.windDir),
    },
    daily: { time: days, sunrise: days.map((d) => `${d}T07:11`), sunset: days.map((d) => `${d}T18:01`) },
  },
  'marine-api.open-meteo.com': { hourly: { time: days.flatMap(hrs), swell_wave_height: days.flatMap(() => fxR.marine.swellFt), swell_wave_period: days.flatMap(() => fxR.marine.swellPeriodS), swell_wave_direction: days.flatMap(() => fxR.marine.swellDirDeg) } },
  'api.tidesandcurrents.noaa.gov': { predictions: [{ t: '2026-10-30 20:12', v: '-0.323', type: 'L' }, { t: '2026-10-31 06:51', v: '3.168', type: 'L' }, { t: '2026-10-31 13:26', v: '5.492', type: 'H' }, { t: '2026-11-01 04:03', v: '3.813', type: 'H' }] },
};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  const u = new URL(url);
  if (url === SECRET) return new Response(readFileSync(join(root, 'fixtures/routine-sample.ics'), 'utf8'));
  if (u.hostname === 'nbaschedules.com') return new Response('BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:x'); // cut off on purpose
  if (fake[u.hostname]) return new Response(JSON.stringify(fake[u.hostname]));
  return new Response('nope', { status: 404 });
};
const { day, errors } = await buildDay({ ICS_URL: SECRET.replace('https:', 'webcal:') }, cfg, new Date('2026-10-31T16:55:00Z'));
globalThis.fetch = realFetch;
check('fetch: local date + now from UTC', day.date === '2026-10-31' && day.now === '09:55' && day.weekday === 'SAT', `${day.date} ${day.now}`);
check('fetch: 24 hourly rows for today', day.hourly.time.length === 24 && day.hourly.tempF[12] === fxR.hourly.tempF[12]);
check('fetch: sunrise/sunset from daily', day.sun.rise === '07:11' && day.sun.set === '18:01');
check('fetch: tide dayOffsets', JSON.stringify(day.tide.hilo.map((x) => x.dayOffset)) === '[-1,0,0,1]');
check('fetch: 72 h rain sum', Math.abs(day.rain72hMm - 4.8) < 0.01, String(day.rain72hMm));
check('fetch: webcal ICS read, no Hume on Saturday', Array.isArray(day.calendar) && day.calendar.length === 0);
check('fetch: cut-off Lakers feed → error, no game', day.lakers === null && errors.some((e) => e.source === 'lakers' && /cut off/.test(e.message)), JSON.stringify(errors));
check('fetch: DST banner input', JSON.stringify(day.dst) === '{"when":"tonight","direction":"back"}');
const blob = JSON.stringify({ day, errors, scored: scoreDay(day, cfg) });
check('secret ICS_URL never in output', !blob.includes('SECRET-TOKEN') && !blob.includes('icloud'));

// ---- 4. key gate ----
const { onRequest: gate } = await import('../functions/_middleware.js');
const nxt = () => new Response('OK'), genv = { ACCESS_KEY: 'k3y' };
check('gate: no key → 401', (await gate({ request: new Request('https://d.x/'), env: genv, next: nxt })).status === 401);
check('gate: wrong key → 401', (await gate({ request: new Request('https://d.x/?key=bad'), env: genv, next: nxt })).status === 401);
const g3 = await gate({ request: new Request('https://d.x/?key=k3y'), env: genv, next: nxt });
check('gate: right key → cookie + redirect', g3.status === 302 && /HttpOnly/.test(g3.headers.get('set-cookie')));
check('gate: cookie → page', (await gate({ request: new Request('https://d.x/api/today', { headers: { cookie: g3.headers.get('set-cookie').split(';')[0] } }), env: genv, next: nxt })).status === 200);
check('gate: /api/health and /robots.txt stay public', (await gate({ request: new Request('https://d.x/api/health'), env: genv, next: nxt })).status === 200 && (await gate({ request: new Request('https://d.x/robots.txt'), env: genv, next: nxt })).status === 200);
check('gate: key saved with a trailing newline still works', (await gate({ request: new Request('https://d.x/?key=k3y'), env: { ACCESS_KEY: 'k3y\n' }, next: nxt })).status === 302);
check('gate: off when ACCESS_KEY unset', (await gate({ request: new Request('https://d.x/'), env: {}, next: nxt })).status === 200);

console.log('\nICS · TIME · ASTRONOMY · FETCH · GATE');
console.table(checks);
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
