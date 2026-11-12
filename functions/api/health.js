// Public health check: which sources load, and nothing else (no calendar, weather, or game content).
// Used to verify a deploy without the access key.
import cfg from '../../config/dashboard.config.js';
import { buildDay } from '../../lib/fetch.js';

export async function onRequestGet({ env }) {
  const t = Date.now();
  let errors = [], counts = {};
  try {
    const { day, errors: e } = await buildDay(env, cfg);
    errors = e.map((x) => ({ source: x.source, message: x.message }));
    counts = { hourly: (day.hourly.time || []).length, swell: (day.marine.time || []).length, tides: day.tide.hilo.length, calendarEvents: day.calendar.length, lakersGameToday: !!day.lakers, humeClassesToday: day.humeClasses ? day.humeClasses.length : null };
  } catch (e) { errors = [{ source: 'build', message: 'failed' }]; }
  return new Response(JSON.stringify({
    ok: errors.length === 0, errors, counts,
    secrets: { ICS_URL: !!env.ICS_URL, ACCESS_KEY: !!env.ACCESS_KEY },
    ms: Date.now() - t, at: new Date().toISOString(),
  }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
