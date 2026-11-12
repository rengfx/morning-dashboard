// Local preview: node dev/server.mjs [port]
//   http://localhost:8788/?fixture=2026-11-01-sun-real   → page from a fixture (no network)
//   http://localhost:8788/                               → live data (needs network; ICS_URL from env)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import cfg from '../config/dashboard.config.js';
import { scoreDay } from '../lib/score.js';
import { buildDay, DAY_RANGE } from '../lib/fetch.js';
import { readdir } from 'node:fs/promises';
import { addDays } from '../public/js/time.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const port = +(process.argv[2] || 8788);

createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${port}`);
  try {
    if (u.pathname === '/api/today') {
      const t = Date.now();
      let day, errors = [];
      const fx = u.searchParams.get('fixture');
      if (fx) {
        if (!/^[\w-]+$/.test(fx)) throw new Error('bad fixture name');
        day = JSON.parse(await readFile(join(root, 'fixtures', `${fx}.json`), 'utf8')).input;
        const d = +(u.searchParams.get('d') || 0);
        if (d) {
          const want = addDays(day.date, d);
          const names = (await readdir(join(root, 'fixtures'))).filter((n) => n.startsWith(want) && n.endsWith('.json'));
          if (!names.length) { res.writeHead(404, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: `no fixture for ${want}` })); return; }
          day = { ...JSON.parse(await readFile(join(root, 'fixtures', names[0]), 'utf8')).input, now: null };
        }
        day = { ...day, offset: d };
        if (u.searchParams.get('now')) day = { ...day, now: u.searchParams.get('now') };
      } else ({ day, errors } = await buildDay(process.env, cfg, new Date(), u.searchParams.get('d') || 0));
      const out = { ...scoreDay(day, cfg), offset: day.offset || 0, range: DAY_RANGE, hourly: day.hourly, marine: day.marine, tide: day.tide, rain72hMm: day.rain72hMm,
        config: { tideOkMaxFt: cfg.surf.tideFtMLLW.ok[1], sunscreenUv: cfg.sun.sunscreenUv, location: cfg.location },
        errors, generatedAt: new Date().toISOString(), buildMs: Date.now() - t, source: fx ? `fixture:${fx}` : 'live' };
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(out)); return;
    }
    let p = u.pathname === '/' ? '/index.html' : u.pathname;
    if (p.includes('..')) throw new Error('bad path');
    const body = await readFile(join(root, 'public', p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain' }); res.end(String(e.message));
  }
}).listen(port, () => console.log(`dev server on http://localhost:${port}`));
