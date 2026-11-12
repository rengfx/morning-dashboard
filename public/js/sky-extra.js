// Sky page additions: R22 sky notes, planets tonight, R24 pier view.
import { TZ, partsIn, zonedToUtc, addDays, ymd } from './time.js';
import * as A from './astro.js';
import { findSkyEvents, planetsTonight } from './skyevents.js';
import { skyNotesHtml } from './skynotes.js';
import { pierSvg } from './pier.js';

const OBS = { lat: 33.985, lon: -118.47 };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MIN = 60000;
const today = partsIn(new Date(), TZ).date;
const dateStr = new URLSearchParams(location.search).get('date') || today;

// ---- notes (clouds arrive later from /api/today) ----
let events = findSkyEvents({ fromDate: dateStr, days: 4, obs: OBS, tz: TZ });
const drawNotes = () => { $('#skynotes').innerHTML = (skyNotesHtml(events, { title: 'SKY · NEXT 4 DAYS' }) || '<div class="note">No standout sky events in the next 4 days.</div>').replace('class="sec skynotes"', 'class="sec first skynotes"'); };
drawNotes();
fetch('/api/today', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (!d || !d.clouds) return;
  events = findSkyEvents({ fromDate: dateStr, days: 4, obs: OBS, tz: TZ, clouds: d.clouds });
  drawNotes(); chips();
}).catch(() => {});

// ---- planets tonight ----
const pl = planetsTonight({ date: dateStr, obs: OBS, tz: TZ });
$('#planets').innerHTML = pl.length
  ? pl.map((p) => `<li><b>${esc(p.name.toUpperCase())}</b><span>${esc(p.from)}–${esc(p.to)}</span><span>best ${esc(p.best)} · ${p.alt}° ${esc(p.dir)}</span></li>`).join('')
  : '<li class="note">No bright planet above 10° in a dark sky tonight.</li>';

// ---- pier view ----
const night = (date) => {
  const [y, m, d] = ymd(date), t0 = zonedToUtc(y, m, d, 0, 0, 0, TZ).getTime();
  const [y2, m2, d2] = ymd(addDays(date, 1)), t1 = zonedToUtc(y2, m2, d2, 0, 0, 0, TZ).getTime();
  const s = A.riseSet(new Date(t0), OBS), r = A.riseSet(new Date(t1), OBS);
  return { set: t0 + s.setMin * MIN, rise: t1 + r.riseMin * MIN };
};
let N = night(dateStr), ms = N.set + 60 * MIN, mark = null, active = 'tonight';
let heading = (() => { const m = A.moonAltAz(new Date(ms), OBS); return m.alt > 0 ? m.az : 245; })();
const svg = $('#pier'), slider = $('#pier-scrub');
const span = () => [N.set - 30 * MIN, N.rise + 30 * MIN];
function draw() {
  svg.innerHTML = pierSvg({ ms, heading, obs: OBS, tz: TZ, mark });
  const [a, b] = span(); slider.value = Math.round((ms - a) / (b - a) * 1000);
  const p = partsIn(new Date(ms), TZ);
  $('#pier-when').textContent = `${p.weekday} ${p.d} · ${p.time}`;
  $('#pier-range').textContent = `sunset ${partsIn(new Date(N.set), TZ).time} → sunrise ${partsIn(new Date(N.rise), TZ).time}`;
}
function chips() {
  const list = [{ id: 'tonight', label: `TONIGHT ${partsIn(new Date(night(dateStr).set + 60 * MIN), TZ).time}` },
    ...events.slice(0, 4).map((e, i) => ({ id: `e${i}`, label: `${e.weekday} ${e.time} · ${e.title.replace(/^Thin Moon.*/, 'THIN MOON').replace('Full Moon rises at dusk', 'FULL MOON').replace(/^Moon near /, 'MOON+').replace(/ and /, '+').replace(' close', '').toUpperCase()}`, e }))];
  $('#pier-times').innerHTML = list.map((c) => `<button type="button" class="chip${c.id === active ? ' on' : ''}${c.e && c.e.sky === 'cloudy' ? ' cloudy' : ''}" data-id="${c.id}">${esc(c.label)}</button>`).join('');
  for (const btn of $('#pier-times').querySelectorAll('button')) btn.addEventListener('click', () => {
    const c = list.find((x) => x.id === btn.dataset.id); active = c.id;
    if (!c.e) { N = night(dateStr); ms = N.set + 60 * MIN; mark = null; }
    else {
      ms = c.e.at; mark = c.e.bodies;
      const evDate = partsIn(new Date(ms), TZ);
      N = night(evDate.h < 12 ? addDays(evDate.date, -1) : evDate.date); // a morning event belongs to the night before
      const first = c.e.bodies[0] === 'moon' ? A.moonAltAz(new Date(ms), OBS) : A.planetAltAz(c.e.bodies[0], new Date(ms), OBS);
      heading = first.az;
    }
    chips(); draw();
  });
}
slider.addEventListener('input', () => { const [a, b] = span(); ms = a + (b - a) * slider.value / 1000; active = null; chips(); draw(); });
$('#pier-left').addEventListener('click', () => { heading -= 45; draw(); });
$('#pier-right').addEventListener('click', () => { heading += 45; draw(); });
svg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { heading += e.key === 'ArrowLeft' ? -15 : 15; draw(); e.preventDefault(); } });
let drag = null;
svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, h: heading, w: svg.getBoundingClientRect().width }; svg.setPointerCapture(e.pointerId); svg.style.cursor = 'grabbing'; });
svg.addEventListener('pointermove', (e) => { if (!drag) return; heading = drag.h - (e.clientX - drag.x) / drag.w * 110; draw(); });
const end = () => { drag = null; svg.style.cursor = 'grab'; };
svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
chips(); draw();

// ---- faint hour grid on the Moon-height histogram (R23) ----
const g = $('#hist-grid');
if (g) g.innerHTML = Array.from({ length: 11 }, (_, i) => { const x = ((i + 1) * 2 / 24 * 358).toFixed(1); return `<line x1="${x}" y1="0" x2="${x}" y2="52" stroke="#ECEAE4" stroke-opacity="0.1" stroke-dasharray="1 2"/>`; }).join('') + '<line x1="0" y1="26" x2="358" y2="26" stroke="#ECEAE4" stroke-opacity="0.1" stroke-dasharray="1 2"/>';
window.__pier = { set: (o) => { if (o.ms != null) ms = o.ms; if (o.heading != null) heading = o.heading; draw(); } };
