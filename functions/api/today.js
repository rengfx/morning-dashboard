// Cloudflare Pages Function: GET /api/today → one JSON for the Today page.
// Secret: ICS_URL (Pages → Settings → Variables and Secrets). Never returned.

import cfg from '../../config/dashboard.config.js';
import { buildDay, DAY_RANGE } from '../../lib/fetch.js';
import { scoreDay } from '../../lib/score.js';

export async function onRequestGet({ env, request }) {
  const started = Date.now();
  try {
    const d = new URL(request.url).searchParams.get('d') || 0;
    const { day, errors } = await buildDay(env, cfg, new Date(), d);
    const out = {
      ...scoreDay(day, cfg), offset: day.offset, range: DAY_RANGE,
      hourly: day.hourly, marine: day.marine, tide: day.tide, rain72hMm: day.rain72hMm,
      config: { tideOkMaxFt: cfg.surf.tideFtMLLW.ok[1], sunscreenUv: cfg.sun.sunscreenUv, location: cfg.location },
      errors, generatedAt: new Date().toISOString(), buildMs: Date.now() - started,
    };
    return new Response(JSON.stringify(out), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, max-age=300' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'build failed', message: String(e && e.message || e).slice(0, 200) }), {
      status: 500, headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
}
