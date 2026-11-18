// Today page: fetch /api/today and render the B2 instrument panel.
import { COL, scale, pts, valAt, tideFn, text, rect, vline, poly, lx, darkBands, ticks, rainBars, nowLine, svg, grid, peakDot, hm, fm, esc, W } from './charts.js';
import { moonPhase, illumination } from './astro.js';
import { findSkyEvents } from './skyevents.js';
import { skyNotesHtml } from './skynotes.js';
import { marks, toggle, weekCount, resetDay } from './humelog.js';

const $ = (s) => document.querySelector(s);
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const dir = (d) => COMPASS[Math.round(((d % 360) + 360) % 360 / 22.5) % 16];
const MARK = { GOOD: ['✓', 'good'], OK: ['~ OK', 'ok'], BAD: ['✗', 'bad'], COOL: ['~ COOL', 'ok'], COLD: ['~ COLD', 'ok'] };
const NAMES = { humeAM: 'HUME MORNING', humePM: 'HUME EVENING', humeDay: 'HUME DAY', basketball: 'BASKETBALL', rollerblade: 'ROLLERBLADE', surf: 'SURF', sun: 'SUN', lakers: 'LAKERS' };
const STRIP = { humeAM: COL.green, humePM: COL.green, humeDay: COL.green, basketball: COL.violet, rollerblade: COL.amber, surf: COL.sky, sun: COL.coral, lakers: COL.gold };
const STATUS_COL = { GO: COL.green, 'GO AFTER': COL.green, 'GO BY': COL.amber, WINDY: COL.amber, RAIN: COL.coral, CONFLICT: COL.coral };

const cell = (l, v, m) => `<div class="cell"><span class="l">${esc(l)}</span><span class="v">${esc(v)}</span>${m ? `<span class="m ${m[1]}">${esc(m[0])}</span>` : ''}</div>`;
const cells = (...c) => `<div class="cells" style="--n:${c.length}">${c.join('')}</div>`;
const head = (n, name, right, hide) => `<div class="row"><span>${n} · ${esc(name)}</span><span>${esc(right || '')}${hide ? ` <button type="button" class="xbtn" data-hide="${hide}" aria-label="Hide for today">✕</button>` : ''}</span></div>`;
const status = (big, col, small) => `<div class="status"><b style="color:${col}">${esc(big)}</b>${small ? `<span>${esc(small)}</span>` : ''}</div>`;
const lvl = (l, word) => (l === 'GOOD' ? ['✓' + (word ? ' ' + word : ''), 'good'] : l === 'OK' ? ['~ ' + (word || 'OK'), 'ok'] : ['✗' + (word ? ' ' + word : ''), 'bad']);

// ---------- charts ----------

/** R49 whole day (waking hours) as a Gantt chart: one row per item, label column on the left. */
const GLAB = { humeAM: 'HUME AM', humePM: 'HUME PM', humeDay: 'HUME DAY', basketball: 'HOOPS', rollerblade: 'BLADE', surf: 'SURF', sun: 'SUN', lakers: 'LAKERS', work: 'WORK' };
function ganttChart(d) {
  const H0 = 5, H1 = 23, LW = 66, PW = W - LW, RH = 17, TOP = 4;
  const x = (min) => LW + Math.max(0, Math.min(PW, (min - H0 * 60) / ((H1 - H0) * 60) * PW));
  const wk = d.config.work && d.config.work.days.includes(d.weekday) ? d.config.work : null;
  const rows = [...(wk ? [{ type: 'work', start: wk.start, end: wk.end, n: '' }] : []), ...d.sections.map((s, i) => ({ ...s, n: i + 1 }))].sort((a, b) => (a.start ? hm(a.start) : 9999) - (b.start ? hm(b.start) : 9999));
  const Hc = TOP + rows.length * RH + 2, H = Hc + 14;
  let b = rect(LW, 0, PW, Hc, COL.panel);
  const r = hm(d.sun.rise), st = hm(d.sun.set);
  if (r > H0 * 60) b += rect(LW, 0, x(r) - LW, Hc, COL.night);
  if (st < H1 * 60) b += rect(x(st), 0, W - x(st), Hc, COL.night);
  for (let h = H0 + 1; h < H1; h++) b += vline(x(h * 60), 0, Hc, '#ECEAE4', `stroke-opacity="${h % 3 ? 0.05 : 0.12}" stroke-width="0.6" stroke-dasharray="1 2"`);
  rows.forEach((s, i) => {
    const y = TOP + i * RH, col = s.type === 'work' ? COL.muted : STRIP[s.type] || COL.green, dim = s.passed || s.went || s.hidden;
    b += text(2, y + 11, `${s.n ? s.n + ' ' : ''}${GLAB[s.type] || s.type.toUpperCase()}`, dim ? COL.faint : col, { size: 9, bold: !dim });
    if (s.type === 'surf' && !s.window) {
      if (s.nearMiss) b += rect(x(hm(s.nearMiss.start)), y + 3, x(hm(s.nearMiss.end)) - x(hm(s.nearMiss.start)), RH - 6, 'none', `rx="2" stroke="${COL.sky}" stroke-opacity="0.6" stroke-dasharray="2 2"`);
      else b += text(LW + 4, y + 11, 'no window', COL.faint, { size: 9 });
      return;
    }
    if (!s.start || !s.end) return;
    const x0 = x(hm(s.start)), x1 = x(hm(s.end)), w = x1 - x0;
    b += rect(x0, y + 3, w, RH - 6, col, `rx="2" fill-opacity="${dim ? 0.3 : s.type === 'work' ? 0.45 : 0.9}"`);
    if (s.status === 'CONFLICT') b += rect(x0, y + 2, w, RH - 4, 'none', `rx="2" stroke="${COL.coral}" stroke-width="1.2" stroke-dasharray="3 2"`);
    const lab = s.went ? '✓' : `${s.start}–${s.end}`;
    if (w >= 62) b += text(x0 + 3, y + 11.5, lab, COL.night, { size: 8.5, bold: true });
    else b += x1 + 64 < W ? text(x1 + 3, y + 11.5, lab, dim ? COL.faint : col, { size: 8.5 }) : text(x0 - 3, y + 11.5, lab, dim ? COL.faint : col, { size: 8.5, anchor: 'end' });
  });
  if (d.now) { const t = hm(d.now); if (t >= H0 * 60 && t <= H1 * 60) b += vline(x(t), 0, Hc, COL.text, 'stroke-width="1.5"'); }
  for (let h = H0; h <= H1; h += 3) b += text(x(h * 60), H - 2, String(h).padStart(2, '0'), COL.muted, { anchor: h === H0 ? 'start' : h === H1 ? 'end' : 'middle', size: 9 });
  const said = rows.map((s) => `${GLAB[s.type] || s.type} ${s.start ? s.start + ' to ' + s.end : 'no window'}${s.passed ? ', passed' : ''}`).join('; ');
  return svg(H, `Whole day, 5 AM to 11 PM: ${said}.`, b);
}

/** R49 pressure over the whole day: home (Venice) and work (Torrance) lines, work hours shaded. */
function pressChart(d) {
  const pd = d.pressureDay; if (!pd || !pd.home) return '';
  const H = 74, sc = scale(0, 24), wk = d.config.work && d.config.work.days.includes(d.weekday) ? d.config.work : null;
  const all = [...pd.home, ...(pd.work || [])].filter((v) => v != null);
  let lo = Math.min(...all), hi = Math.max(...all); if (hi - lo < 6) { const m = (hi + lo) / 2; lo = m - 3; hi = m + 3; }
  const y = (v) => 60 - (v - lo) / (hi - lo) * 50;
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H - 12) + grid(sc, H - 12, 2);
  if (wk) b += rect(sc.x(hm(wk.start)), 0, sc.x(hm(wk.end)) - sc.x(hm(wk.start)), H - 12, COL.violet, 'fill-opacity="0.10"') + text(sc.x(hm(wk.start)) + 3, 10, `WORK ${wk.place.toUpperCase()}`, COL.violet, { size: 8.5 });
  const line = (arr) => arr.map((v, h) => (v == null ? null : [sc.x(h * 60), y(v)])).filter(Boolean);
  b += poly(line(pd.home), COL.text, 'stroke-width="1.8"');
  if (pd.work) b += poly(line(pd.work), COL.violet, 'stroke-width="1.6" stroke-dasharray="4 2"');
  b += text(W - 2, 10, `${Math.round(hi)}`, COL.faint, { anchor: 'end', size: 8.5 }) + text(W - 2, 60, `${Math.round(lo)}`, COL.faint, { anchor: 'end', size: 8.5 });
  b += nowLine(sc, d.now, H - 12) + ticks(sc, H - 1, 6);
  return svg(H, `Pressure today, hPa: ${Math.round(lo)} to ${Math.round(hi)}.`, b)
    + `<div class="legend">— Venice hPa${pd.work ? `  <span style="color:${COL.violet}">╌ ${esc((wk && wk.place) || 'work')}</span>` : ''}  ▮ dark</div>`;
}


function humeChart(d, s) {
  const am = s.type === 'humeAM', allDay = s.type === 'humeDay';
  const hr = s.type === 'basketball' && d.park && d.park.tempF ? d.park : d.hourly;
  const h0 = allDay ? 6 : Math.min(am ? 5 : 16, Math.floor(hm(s.start) / 60) - 1, s.suggest ? Math.floor(hm(s.suggest[0]) / 60) : 99);
  const h1 = allDay ? 20 : am ? Math.max(11, Math.ceil(hm(s.end) / 60) + 1) : Math.min(24, Math.max(22, Math.ceil(hm(s.end) / 60) + 1));
  const sc = scale(h0, h1), H = 72;
  const temp = pts(hr.tempF, hr.time).filter(([t]) => t >= sc.t0 && t <= sc.t1);
  const lo = Math.min(...temp.map((p) => p[1])), hi = Math.max(...temp.map((p) => p[1]));
  const ty = (v) => 60 - (v - lo) / Math.max(4, hi - lo) * 44;
  const pop = pts(hr.precipPct, hr.time);
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H) + grid(sc, H) + rainBars(sc, pop, H, 60);
  const game = d.sections.find((x) => x.type === 'lakers');
  if (game && hm(game.start) < sc.t1 && hm(game.end) > sc.t0) {
    const g0 = sc.x(hm(game.start)), g1 = sc.x(hm(game.end));
    b += rect(g0, 0, g1 - g0, H, COL.gold, 'fill-opacity="0.18"') + vline(g0, 0, H, COL.gold, 'stroke-width="1.5"');
    b += text(g0 + 4, 66, `LAL ${game.start}`, COL.gold, { bold: true });
  }
  const x0 = sc.x(hm(s.start)), x1 = sc.x(hm(s.end)), wc = STRIP[s.type] || COL.green;
  if (s.status === 'CONFLICT') {
    b += rect(x0, 0, x1 - x0, H, 'none', `stroke="${COL.coral}" stroke-width="1.5" stroke-dasharray="3 2"`);
    const s0 = sc.x(hm(s.suggest[0])), s1 = sc.x(hm(s.suggest[1]));
    b += rect(s0, 0, s1 - s0, H, COL.green, `fill-opacity="0.14" stroke="${COL.green}" stroke-width="1.5"`);
    b += text(s0 + 4, 66, `GO ${s.suggest[0]}–${s.suggest[1]}`, COL.green, { bold: true });
  } else {
    b += rect(x0, 0, x1 - x0, H, wc, `fill-opacity="0.14" stroke="${wc}" stroke-width="1.5"`);
    const tag = s.status === 'GO AFTER' ? `GO AFTER ${s.goAfter}` : s.status === 'GO BY' ? `BY ${s.goBy}` : s.status;
    const tx = s.status === 'GO AFTER' ? sc.x(hm(s.goAfter)) + 5 : s.status === 'GO BY' ? sc.x(hm(s.goBy)) - 4 : x0 + 6;
    b += text(tx, 13, tag, s.status === 'GO' ? wc : STATUS_COL[s.status] || COL.green, { bold: true, anchor: s.status === 'GO BY' ? 'end' : 'start' });
    if (s.status === 'GO BY') b += vline(sc.x(hm(s.goBy)), 0, H, COL.amber, 'stroke-width="1.5" stroke-dasharray="3 2"');
    if (s.status === 'GO AFTER') b += vline(sc.x(hm(s.goAfter)), 0, H, COL.green, 'stroke-width="1.5" stroke-dasharray="3 2"');
  }
  b += poly(temp.map(([t, v]) => [sc.x(t), ty(v)]), COL.coral, 'stroke-width="2"');
  if (temp.length) {
    const [ta, va] = temp[0], [tb, vb] = temp[temp.length - 1];
    b += text(4, ty(va) - 6, `${Math.round(va)}°@${fm(ta)}`, COL.coral) + text(W - 4, ty(vb) - 6, `${Math.round(vb)}°@${fm(tb)}`, COL.coral, { anchor: 'end' });
  }
  if (temp.length > 2) { // R23 peak dot when the warmest point is inside the chart
    const pk = temp.reduce((m, p) => (p[1] > m[1] ? p : m));
    if (pk !== temp[0] && pk !== temp[temp.length - 1]) { const x = sc.x(pk[0]), [tx, an] = lx(x); b += peakDot(x, ty(pk[1]), COL.coral, H) + text(tx, ty(pk[1]) - 8, `${Math.round(pk[1])}°@${fm(pk[0])}`, COL.coral, { anchor: an }); }
  }
  if (s.walkHome && s.walkHome.level !== 'GOOD') { // R29 walk-home tag at closing time
    const xe = sc.x(hm(s.end)), wcol = s.walkHome.level === 'BAD' ? COL.coral : COL.amber;
    b += text(xe > W - 60 ? xe - 3 : xe + 3, 24, `WALK ${s.walkHome.pct}%`, wcol, { anchor: xe > W - 60 ? 'end' : 'start', size: 10 });
  }
  for (const [sunT, lab] of [[hm(d.sun.rise), `↑${d.sun.rise}`], [hm(d.sun.set), `↓${d.sun.set}`]]) if ((allDay || (am ? lab[0] === '↑' : lab[0] === '↓')) && sunT > sc.t0 && sunT < sc.t1) b += text(sc.x(sunT) + 3, 40, lab, COL.muted);
  const maxPop = Math.max(0, ...pop.filter(([t]) => t >= sc.t0 && t < sc.t1).map((p) => p[1]));
  if (maxPop >= 40) { const pk = pop.find(([t, v]) => v === maxPop && t >= sc.t0); b += text(...(([x, a]) => [x, 28, `${maxPop}%@${fm(pk[0])}`, COL.sky, { anchor: a }])(lx(sc.x(pk[0] + 30)))); }
  else if (maxPop === 0) b += text(W / 2, H - 4, '0% rain', COL.faint, { anchor: 'middle' });
  b += rect(0, H, W, 1, COL.rule) + nowLine(sc, d.now, H) + ticks(sc, 88, sc.h1 - sc.h0 > 8 ? 2 : 1);
  return svg(92, `${NAMES[s.type]} chart, ${fm(sc.t0)} to ${fm(sc.t1)}: window ${s.start} to ${s.end}, status ${s.status}${s.suggest ? `, suggested ${s.suggest[0]} to ${s.suggest[1]}` : ''}. Peak rain chance ${maxPop} percent.`, b)
    + `<div class="legend"><span style="color:${COL.coral}">— temp °F</span>  <span style="color:${COL.sky}">▮ rain %</span>  ▮ dark${game ? `  <span style="color:${COL.gold}">▮ game</span>` : ''}</div>`;
}

function surfChart(d, s) {
  const sc = scale(6, 22), H = 124;
  const tide = tideFn(d.tide.hilo);
  const samples = []; for (let t = sc.t0; t <= sc.t1; t += 15) { const v = tide(t); if (v != null) samples.push([t, v]); }
  const tmax = Math.max(6.5, ...samples.map((p) => p[1])), tmin = Math.min(-1, ...samples.map((p) => p[1]));
  const ty = (v) => 116 - (v - tmin) / (tmax - tmin) * 100;
  const wind = pts(d.hourly.windMph, d.hourly.time).filter(([t]) => t >= sc.t0 && t <= sc.t1);
  const wmax = Math.max(15, ...wind.map((p) => p[1]));
  const wy = (v) => 120 - v / wmax * 100;
  const okY = ty(d.config.tideOkMaxFt);
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H) + grid(sc, H);
  b += vline(0, 0, 0, 'none') + `<line x1="0" y1="${okY.toFixed(1)}" x2="${W}" y2="${okY.toFixed(1)}" stroke="${COL.green}" stroke-opacity="0.45" stroke-dasharray="1 3"></line>`;
  b += text(W - 4, okY + 12, `tide OK below ${d.config.tideOkMaxFt} ft`, COL.green, { anchor: 'end', size: 9 });
  if (s.window) {
    const a = sc.x(hm(s.start)), e = sc.x(hm(s.end));
    b += rect(a, 0, e - a, H, COL.amber, `fill-opacity="0.2" stroke="${COL.amber}" stroke-width="1.5"`) + text((a + e) / 2, 13, 'GO', COL.amber, { anchor: 'middle', bold: true });
    for (const [p, q] of s.laterWindows) { const a2 = sc.x(hm(p)), e2 = sc.x(hm(q)); b += rect(a2, 0, e2 - a2, H, 'none', `stroke="${COL.amber}" stroke-opacity="0.6" stroke-dasharray="3 3"`) + text((a2 + e2) / 2, 13, '2nd', COL.amber, { anchor: 'middle' }); }
  } else if (s.nearMiss) {
    const a = sc.x(hm(s.nearMiss.start)), e = sc.x(hm(s.nearMiss.end));
    b += rect(a, 0, e - a, H, 'none', `stroke="${COL.sky}" stroke-opacity="0.75" stroke-dasharray="3 3"`) + text((a + e) / 2, 13, `${s.nearMiss.score}/10`, COL.sky, { anchor: 'middle' });
  } else b += text(W / 2, 14, 'NO WINDOW', COL.faint, { anchor: 'middle', bold: true, size: 11 });
  b += poly(samples.map(([t, v]) => [sc.x(t), ty(v)]), COL.text, 'stroke-width="2"');
  b += poly(wind.map(([t, v]) => [sc.x(t), wy(v)]), COL.sky, 'stroke-width="1.5" stroke-dasharray="4 3"');
  for (const p of d.tide.hilo) {
    const t = hm(p.t) + 1440 * (p.dayOffset || 0); if (t < sc.t0 || t > sc.t1) continue;
    const x = sc.x(t), y = ty(p.ft), [tx, an] = lx(x);
    b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${COL.text}"></circle>` + text(tx, p.type === 'H' ? y + 16 : y - 8, `${p.type} ${p.ft.toFixed(1)}@${p.t}`, COL.muted, { anchor: an });
  }
  if (wind.length && Math.max(...wind.map((p) => p[1])) >= 10) { const pk = wind.reduce((m, p) => (p[1] > m[1] ? p : m)); const [tx, an] = lx(sc.x(pk[0])); b += peakDot(sc.x(pk[0]), wy(pk[1]), COL.sky, H) + text(tx, wy(pk[1]) - 8, `${Math.round(pk[1])}mph@${fm(pk[0])}`, COL.sky, { anchor: an }); }
  b += rect(0, H, W, 1, COL.rule) + nowLine(sc, d.now, H, true) + ticks(sc, 140, 3);
  return svg(144, `Surf chart, 6 AM to 10 PM: tide curve with highs and lows, wind line, ${s.window ? `first window ${s.start} to ${s.end}` : s.nearMiss ? `no window, best try ${s.nearMiss.start} to ${s.nearMiss.end}` : 'no window'}.`, b)
    + `<div class="legend">— tide ft  <span style="color:${COL.sky}">╌ wind mph</span>  <span style="color:${COL.green}">┄ tide OK</span>${s.window ? `  <span style="color:${COL.amber}">▮ window</span>` : s.nearMiss ? `  <span style="color:${COL.sky}">┆ best try</span>` : ''}</div>`;
}

function sunChart(d, s) {
  const sc = scale(6, 20), H = 130;
  const temp = pts(d.hourly.tempF, d.hourly.time).filter(([t]) => t >= sc.t0 && t <= sc.t1);
  const uv = pts(d.hourly.uv, d.hourly.time).filter(([t]) => t >= sc.t0 && t <= sc.t1);
  const lo = Math.min(...temp.map((p) => p[1])), hi = Math.max(...temp.map((p) => p[1]));
  const ty = (v) => 118 - (v - lo) / Math.max(6, hi - lo) * 90;
  const umax = Math.max(5, ...uv.map((p) => p[1]));
  const uy = (v) => 130 - v / umax * 110;
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H) + grid(sc, H) + rainBars(sc, pts(d.hourly.precipPct, d.hourly.time), H, 40, 20);
  const a = sc.x(hm(s.start)), e = sc.x(hm(s.end));
  b += rect(a, 0, e - a, H, COL.amber, `fill-opacity="0.18" stroke="${COL.amber}" stroke-width="1.5"`) + text((a + e) / 2, 12, 'SUN', COL.amber, { anchor: 'middle', bold: true, size: 11 });
  const y3 = uy(d.config.sunscreenUv);
  b += `<line x1="0" y1="${y3.toFixed(1)}" x2="${W}" y2="${y3.toFixed(1)}" stroke="${COL.violet}" stroke-opacity="0.4" stroke-dasharray="1 3"></line>` + text(W - 4, y3 - 4, `UV ${d.config.sunscreenUv} · sunscreen`, COL.violet, { anchor: 'end', size: 9 });
  b += poly(temp.map(([t, v]) => [sc.x(t), ty(v)]), COL.coral, 'stroke-width="2"');
  b += poly(uv.map(([t, v]) => [sc.x(t), uy(v)]), COL.violet, 'stroke-width="2" stroke-dasharray="4 3"');
  if (s.tempPeakAt) { const x = sc.x(hm(s.tempPeakAt)), [tx, an] = lx(x + 30); b += peakDot(x, ty(s.tempPeak), COL.coral, H) + text(tx, Math.min(ty(s.tempPeak), uy(s.uvPeak)) - 9, `${s.tempPeak}°@${s.tempPeakAt}`, COL.coral, { anchor: an, size: 11 }); }
  { const x = sc.x(hm(s.uvPeakAt)), [tx, an] = lx(x); b += peakDot(x, uy(s.uvPeak), COL.violet, H) + text(tx, Math.max(ty(s.tempPeak ?? 0), uy(s.uvPeak)) + 18, `${Math.round(s.uvPeak)}@${s.uvPeakAt}`, COL.violet, { anchor: an, size: 11 }); }
  const game = d.sections.find((x) => x.type === 'lakers');
  if (game && hm(game.start) > sc.t0 && hm(game.start) < sc.t1) { const x = sc.x(hm(game.start)); b += vline(x, 0, H, COL.gold, 'stroke-width="1.5"') + text(x + 4, 24, 'LAL', COL.gold, { bold: true }); }
  b += rect(0, H, W, 1, COL.rule) + nowLine(sc, d.now, H) + ticks(sc, 146, 2);
  return svg(150, `Sun chart, 6 AM to 8 PM: temperature peak ${s.tempPeak} degrees at ${s.tempPeakAt}; UV peak ${s.uvPeak} at ${s.uvPeakAt}; sun window ${s.start} to ${s.end}.`, b)
    + `<div class="legend"><span style="color:${COL.coral}">— temp °F</span>  <span style="color:${COL.violet}">╌ UV index</span>  <span style="color:${COL.amber}">▮ sun window</span>${game ? `  <span style="color:${COL.gold}">┃ tip-off</span>` : ''}</div>`;
}

// ---------- sections ----------

function humeSec(d, s, n) {
  const right = `${s.start}–${s.end}${s.source === 'default' ? ' (usual)' : s.source === 'hours' ? ' (open)' : ''}`;
  const name = s.type === 'basketball' && s.place ? `BASKETBALL · ${s.place.toUpperCase()}` : NAMES[s.type];
  if (s.went && !wentOpen.has(s.type)) return `<button type="button" class="sec wentmin${n === 1 ? ' first' : ''}" data-wentopen="${s.type}">${head(n, `${name} · ✓ WENT`, `${right} ▾`)}</button>`; // R46
  if (s.passed) return `<section class="sec passed${n === 1 ? ' first' : ''}">${head(n, name, right)}<span style="font-size:15px">PASSED · ${esc(s.advice)}</span></section>`;
  const c = s.cells;
  const big = s.status === 'GO BY' ? `GO BY ${s.goBy}` : s.status === 'GO AFTER' ? `GO AFTER ${s.goAfter}` : s.status;
  const rainM = c.rain.level === 'GOOD' ? ['✓', 'good'] : c.rain.level === 'OK' ? ['~ LOW', 'ok'] : ['✗', 'bad'];
  const tempM = c.temp.level === 'GOOD' ? ['✓', 'good'] : MARK[c.temp.level] || ['~', 'ok'];
  return `<section class="sec${n === 1 ? ' first' : ''}">${head(n, name, right)}
${status(big + (s.now ? ' · NOW' : ''), STATUS_COL[s.status] || COL.green, s.advice)}${s.workout ? `<div class="wkrow"><div class="wk">${esc(s.workout)}</div>${s.workoutMoves ? `<div class="wkm">${esc(s.workoutMoves)}</div>` : ''}</div>` : ''}
${cells(cell('RAIN', `${c.rain.pct}%`, c.rain.at ? [`${rainM[0]} @${c.rain.at}`, rainM[1]] : rainM), cell('WIND', `${c.wind.mph} ${dir(c.wind.dirDeg)}`, c.wind.level === 'GOOD' ? ['✓', 'good'] : ['✗ WINDY', 'bad']), cell('TEMP', c.temp.f == null ? '—' : `${c.temp.f}°`, tempM), cell('LIGHT', s.type === 'humeAM' ? `↑${c.light.rise}` : `↓${c.light.set}`, s.type === 'humeDay' ? [`↑${c.light.rise}`, 'faint'] : c.light.dark ? ['~ DARK', 'ok'] : ['✓', 'good']))}
${humeChart(d, s)}${classList(d, s)}</section>`;
}

function classList(d, s) {
  if (!s.classes) return '';
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const url = d.config && ((ios && d.config.humeAppUrl) || d.config.humeBookUrl);
  const left = s.classes.filter((c) => !c.started); // R34 a class goes away once it has started
  const gone = s.classes.length - left.length;
  // R51 each class opens its own booking page (app link when one is known, else the web Sign Up page)
  const tpl = d.config && ((ios && d.config.humeClassAppUrl) || d.config.humeClassUrl);
  const rows = left.map((c) => {
    const st = c.started ? ['STARTED', 'faint'] : c.state === 'CLOSED' ? ['CLOSED', 'faint'] : c.state === 'FULL' ? [c.waitlist ? `FULL · WL ${c.waitlist}` : 'FULL', 'bad'] : [`${c.left} OPEN`, c.left <= 2 ? 'ok' : 'good'];
    const href = tpl && c.id && c.state !== 'CLOSED' ? tpl.replace('{id}', encodeURIComponent(c.id)) : null;
    const inner = `<span class="t">${esc(c.start)}</span><span class="n">${esc(c.name)}<small>${esc([c.host, `${c.min} min`].filter(Boolean).join(' · '))}</small></span><span class="s ${st[1]}">${esc(st[0])}${href ? ' ↗' : ''}</span>`;
    return `<li class="${c.started ? 'gone' : ''}">${href ? `<a class="cls" href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>` : inner}</li>`;
  }).join('');
  return `<div class="classes"><div class="row"><span>CLASSES IN WINDOW · ${left.length}${gone ? ` <small class="faint">(${gone} started)</small>` : ''}</span><span>${url ? `<a href="${esc(url)}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${ios ? 'HUME APP ↗' : 'BOOK ↗'}</a>` : ''}</span></div>${rows ? `<ul>${rows}</ul>` : `<div class="note">${gone ? 'No more classes in this window today.' : 'No class fits in this window.'}</div>`}</div>`;
}

/** R21 sea surface temperature (°F) at the window start, or 08:00. */
function water(d, s) {
  const m = d.marine || {};
  if (!m.seaTempF) return null;
  const v = valAt(pts(m.seaTempF, m.time), hm(s.window ? s.start : '08:00'));
  return v == null ? null : Math.round(v);
}

function surfSec(d, s, n) {
  const c = s.cells;
  const right = c ? `${c.swell.ft} ft · ${c.period.s}s ${dir(c.period.dirDeg)}` : '';
  const big = s.window ? `${s.start}–${s.end}` : 'NO GOOD WINDOW';
  const wt = water(d, s);
  const small = (s.advisory ? 'RAIN ADVISORY (see top) · ' : '') + (s.window ? 'first good window' : s.nearMiss ? `Best try ${s.nearMiss.start}–${s.nearMiss.end} · ${s.nearMiss.score}/${s.nearMiss.of}` : '') + (wt != null ? ` · water ${wt}°F` : '');
  const cs = c ? cells(
    cell('SWELL', `${c.swell.ft} ft`, lvl(c.swell.level, c.swell.level === 'GOOD' ? 'GOOD' : c.swell.level === 'OK' ? 'OK' : 'SMALL')),
    cell('PERIOD', `${c.period.s}s ${dir(c.period.dirDeg)}`, lvl(c.period.level, c.period.level === 'GOOD' ? 'GOOD' : c.period.level === 'OK' ? 'DIR OK' : 'BAD')),
    cell(`TIDE ${c.at}`, `${c.tide.ft} ft ${c.tide.rising == null ? '' : c.tide.rising ? '↑' : '↓'}`, lvl(c.tide.level, c.tide.level === 'BAD' ? 'HIGH' : '')),
    cell('WIND', `${c.wind.mph} ${dir(c.wind.dirDeg)}`, lvl(c.wind.level))) : '';
  return `<section class="sec">${head(n, `SURF · ${(s.spot || '').toUpperCase()}`, right, 'surf')}
${status(big + (s.now ? ' · NOW' : ''), s.window ? COL.amber : COL.muted, small)}${cs}${surfChart(d, s)}</section>`;
}

function sunSec(d, s, n) {
  return `<section class="sec">${head(n, 'SUN', `${hm(s.end) - hm(s.start)} MIN AROUND UV PEAK${s.endsAtTipoff ? ' · ENDS AT TIP-OFF' : ''}`)}
${status(`${s.start}–${s.end}${s.now ? ' · NOW' : ''}`, s.passed ? COL.muted : COL.amber, `UV ${Math.round(s.uvPeak)}@${s.uvPeakAt}${s.tempPeak != null ? ` · ${s.tempPeak}°@${s.tempPeakAt}` : ''}`)}
${sunChart(d, s)}${cells(cell('SUNSCREEN', s.sunscreen ? `${s.sunscreen[0]}–${s.sunscreen[1]}` : 'not needed'), cell('LOW UV FROM', s.lowUvFrom || '—', s.lowUvFrom ? [`UV < ${d.config.sunscreenUv}`, 'good'] : null), cell('SUNSET', d.sun.set))}</section>`;
}

function lakersSec(d, s, n) {
  const pm = d.sections.find((x) => x.type === 'humePM');
  let rel = '';
  if (pm && pm.status === 'CONFLICT') rel = `Starts during Hume PM (${pm.start}–${pm.end}).`;
  else if (pm && pm.status === 'GO AFTER') rel = `Overlaps the first ${hm(s.end) - hm(pm.start)} min of Hume PM.`;
  else {
    const next = d.sections.find((x) => x !== s && x.start && hm(x.start) >= hm(s.end));
    const prev = [...d.sections].reverse().find((x) => x !== s && x.end && hm(x.end) <= hm(s.start));
    if (next) { const g = hm(next.start) - hm(s.end); rel = `Ends ~${g >= 60 ? Math.round(g / 60) + ' h' : g + ' min'} before ${NAMES[next.type].toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}.`; }
    else if (prev) { const g = hm(s.start) - hm(prev.end); rel = `Starts ${g >= 60 ? Math.round(g / 60) + ' h' : g + ' min'} after ${NAMES[prev.type].toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} ends.`; }
  }
  return `<section class="sec${s.passed ? ' passed' : ''}">${head(n, 'LAKERS', `${s.home ? 'VS' : '@'} ${((s.opponentFull || '').replace(s.opponentName || '', '').trim() || s.opponentName || '').toUpperCase()} ·${s.home ? 'HOME' : 'AWAY'}`)}
${status(s.start + (s.now ? ' · LIVE' : ''), COL.gold, `${s.home ? 'vs' : 'at'} ${s.opponentName || ''}${s.arena ? ' · ' + s.arena : ''}`)}
${cells(cell('TIP-OFF', s.start), cell('ENDS', `~${s.end}`), cell('WHERE', s.home ? 'HOME' : 'AWAY'), tvCell(s, d.date))}
${rel ? `<span class="note">${esc(rel)}</span>` : ''}${s.home && d.config && d.config.tickets && d.config.tickets.LAL && !s.passed ? `<a class="tix-link" href="${esc(d.config.tickets.LAL)}" target="_blank" rel="noopener">TICKETS ON SEATGEEK ↗</a>` : ''}</section>`;
}

// ---------- page ----------

const WIN = { humeAM: ['am', 'AM'], humePM: ['pm', 'PM'], humeDay: ['day', 'DAY'] };

/** R27 today on a weekday: the Hume morning block goes away once its time has passed. */
function hideDone(d) {
  const off = d.offset || 0;
  if (off > 0) { const hid = new Set(hiddenRead()[d.date] || []); return hid.size ? { ...d, sections: d.sections.map((s) => (hid.has(s.type) ? { ...s, hidden: true } : s)) } : d; }
  const m = marks(d.date);
  // R46 (replaces R30): a Hume block marked WENT shrinks to one line (weekdays AM/PM, weekend all-day on VISIT 1)
  const wentKey = { humeAM: 'am', humePM: 'pm', humeDay: 'day' };
  const hid = new Set(hiddenRead()[d.date] || []);
  let sections = d.sections.map((s) => (wentKey[s.type] && m[wentKey[s.type]] ? { ...s, went: true } : hid.has(s.type) ? { ...s, hidden: true } : s));
  if (d.weekday !== 'SAT' && d.weekday !== 'SUN') sections = sections.filter((s) => !(off === 0 && s.type === 'humeAM' && s.passed && !s.went && !m.amKeep)); // R27
  return { ...d, sections };
}
// R50 Surf / Rollerblade hidden for a day (✕). Per browser; wrapped because storage can be blocked.
const HKEY = 'hidden-v1';
const hiddenRead = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '{}') || {}; } catch { return {}; } };
function hiddenSet(date, type, on) {
  try { const all = hiddenRead(), l = new Set(all[date] || []); on ? l.add(type) : l.delete(type); if (l.size) all[date] = [...l]; else delete all[date]; localStorage.setItem(HKEY, JSON.stringify(all)); return true; } catch { return false; }
}
const wentOpen = new Set(); // R46 blocks the user tapped open again (this page view only)

/** R28 Hume log line: one toggle per Hume window of the day + this week's count. Today and earlier only. */
function humeLog(d, all) {
  if ((d.offset || 0) > 0) return '';
  const wins = all.filter((s) => WIN[s.type]);
  if (!wins.length) return '';
  const m = marks(d.date);
  // R35 weekend all-day block: two visit buttons (VISIT 1, VISIT 2)
  const keys = wins.flatMap((s) => (s.type === 'humeDay' ? [['day', 'VISIT 1'], ['day2', 'VISIT 2']] : [WIN[s.type]]));
  const btns = keys.map(([k, lab]) => { const on = !!m[k]; return `<button type="button" class="went${on ? ' on' : ''}" data-went="${k}" aria-pressed="${on}">${lab} ${on ? '✓' : 'WENT?'}</button>`; }).join('');
  const n = weekCount(d.date);
  const any = Object.keys(m).length > 0;
  return `<section class="sec humelog"><div class="row"><span>HUME LOG</span><span>${n} THIS WEEK</span></div><div class="chips">${btns}${any ? '<button type="button" class="went reset" data-reset>RESET DAY</button>' : ''}</div></section>`;
}

/** R33 first NBA tip-off (fantasy lock). Amber in the last hour, faint once games have started. */
let nbaOpen = false; // R34 expand state survives re-renders and day swipes
/** R33/R37 SPORTS line: lead = first NBA tip-off; expanded = every NBA game + LA teams in other leagues. */
function nbaLine(d) {
  const g = d.nba, xs = d.sportsExtra || [], tk = (d.config && d.config.tickets) || {};
  if (!g && !xs.length) return '';
  const lead = g ? { lg: 'NBA', tip: g.first.tip, m: g.first.matchup } : { lg: xs[0].league, tip: xs[0].tip, m: xs[0].matchup };
  const now = d.now ? hm(d.now) : null, t = hm(lead.tip);
  const live = now != null && now >= t, soon = now != null && !live && t - now <= 60;
  const cls = live ? 'nba gone' : soon ? 'nba soon' : 'nba';
  const tail = live ? ' · STARTED' : soon ? ` · ${t - now} MIN` : '';
  const row = (x, lg) => {
    const key = (t) => (lg ? tk[`${lg}:${t}`] : tk[t]);
    const local = x.venue && (d.config.localVenues || []).includes(x.venue);
    const tix = (x.home && key(x.home)) || (local && x.team && key(x.team)) || null; // R38 home game, or a followed team at an LA venue // R38 a local (home) game of a team with a ticket link
    const res = x.state === 'pre' ? '' : [x.score, x.detail].filter(Boolean).join(' · ');
    return `<li class="${x.state}${tix ? ' tix ' + String(key(x.home) ? x.home : x.team).replace(/\W/g, '') : ''}"><span class="t">${esc(x.tip)}</span><span class="m">${lg ? `<em>${esc(lg)}</em> ` : ''}${esc(x.matchup)}${tix && x.state === 'pre' ? ` <a href="${esc(tix)}" target="_blank" rel="noopener">TICKETS ↗</a>` : ''}</span><span class="d">${esc(res)}</span></li>`;
  };
  const rows = (g ? g.games.map((x) => row(x)) : []).join('') + (xs.length ? `<li class="sub"><span></span><span>OTHER LA TEAMS</span><span></span></li>${xs.map((x) => row(x, x.league)).join('')}` : '');
  const n = (g ? g.count : 0) + xs.length, right = `${g && xs.length ? `${g.count}+${xs.length}` : n} GAME${n === 1 ? '' : 'S'}`;
  return `<details class="nbabox"${nbaOpen ? ' open' : ''}><summary class="${cls}" title="Tap to show all games"><span>${lead.lg} <b>${esc(lead.tip)}</b> · ${esc(lead.m)}${tail}</span><span class="n">${right} <i class="car">▾</i></span></summary><ul class="nbagames">${rows}</ul></details>`;
}

/** R47 pressure line: hPa now, change in the last 24 h, largest 24-h swing in the next 24 h. Amber at WATCH, coral at FLAG. */
function pressLine(d) {
  const p = d.pressure;
  if (!p) return '';
  const sg = (v) => (v == null ? '—' : `${v > 0 ? '↑' : v < 0 ? '↓' : ''}${Math.abs(v).toFixed(1)}`);
  const home = p.hPa != null ? `<div class="press ${p.level.toLowerCase()}"><span>PRESSURE <b>${p.hPa}</b> hPa · 24H ${sg(p.d24)}</span><span>${p.next ? `NEXT 24H ${sg(p.next.d24)}` : ''} <i class="car">▾</i></span></div>` : '';
  const w = p.work;
  const work = w ? `<div class="press ${w.level.toLowerCase()}"><span>${esc(w.place.toUpperCase())} ${esc(w.start)}–${esc(w.end)} <b>${w.hPa}</b></span><span>${w.worst ? `MAX 24H ${sg(w.worst.d24)} @${esc(w.worst.at.slice(11, 16))}` : ''}</span></div>` : '';
  return `<details class="pressbox"${pressOpen ? ' open' : ''}><summary>${home}${work}</summary>${pressChart(d)}</details>`;
}
let pressOpen = false;

/** R39 evening rollerblade on the boardwalk. */
// R40 body weight lives on this phone only (never in the repo): set by ?w=<lb> (or <kg>kg), e.g. from an iPhone Shortcut.
const WKEY = 'weight-v1';
(function takeWeight() {
  try {
    const q = new URLSearchParams(location.search).get('w'); if (!q) return;
    const m = /^(\d+(?:\.\d+)?)(kg|lb)?$/i.exec(q.trim()); if (!m) return;
    const lb = /kg/i.test(m[2] || '') ? +m[1] / 0.4536 : +m[1];
    if (lb > 60 && lb < 500) localStorage.setItem(WKEY, JSON.stringify({ lb: Math.round(lb * 10) / 10, at: new Date().toISOString().slice(0, 10) }));
    const u = new URL(location.href); u.searchParams.delete('w'); history.replaceState(null, '', u.pathname + u.search + u.hash);
  } catch { /* storage blocked: calories show SET WEIGHT */ }
})();
const weight = () => { try { return JSON.parse(localStorage.getItem(WKEY) || 'null'); } catch { return null; } };

/** R41 Lakers TV: ✓ when Spectrum SportsNet carries it (Darin's plan in the NBA app); ✗ + network when national only. */
function tvCell(s, date) {
  const SHORT = { 'Prime Video': 'PRIME', 'NBA TV': 'NBA TV', Peacock: 'PEACOCK' };
  const w = s.watch, nat = w && w.national.length ? w.national.map((x) => SHORT[x] || x.toUpperCase()).join('/') : null;
  // R43 on-plan / LOCAL games: the cell is a button into the NBA app (that day's games; nba.com/games is a universal link)
  const link = (html) => `<a class="cell cell-link" href="https://www.nba.com/games?date=${esc(date)}" target="_blank" rel="noopener" title="Open the NBA app on this day's games">${html}</a>`;
  const inner = (l, v, m) => cell(l, v, m).replace(/^<div class="cell">/, '').replace(/<\/div>$/, '');
  if (!w) return /LOCAL/i.test(s.tv || '') ? link(inner('TV', 'WATCH ↗', ['LOCAL ✓', 'good'])) : cell('TV', s.tv || '—');
  if (w.onPlan) return link(inner('TV', 'WATCH ↗', [nat ? `SPECTRUM · ${nat}` : 'SPECTRUM ✓', 'good']));
  return cell('TV', nat || s.tv || '—', ['✗ NATIONAL', 'bad']);
}

function rollerSec(d, s, n) {
  const c = s.cells, go = s.status === 'GO', wt = weight();
  const age = wt && wt.at ? Math.round((Date.parse(d.date) - Date.parse(wt.at)) / 864e5) : 0, stale = age > 7; // R40 weekly check-in
  const kcal = wt && s.met ? Math.round((s.met - 1) * wt.lb * 0.4536 * (s.minutes || 60) / 60 / 10) * 10 : null; // above rest
  const right = go ? `${s.start}–${s.end}` : `starts ${s.checked[0]}–${s.checked[1]}`;
  const L = s.limits || { rainPct: 20, minTempF: 60, maxWindMph: 10 };
  const more = go && s.goodStarts.length > 1 ? `Other good starts: ${s.goodStarts.slice(1).join(', ')}.` : '';
  return `<section class="sec${s.passed ? ' passed' : ''}">${head(n, 'ROLLERBLADE · BOARDWALK', right, 'rollerblade')}
${status(go ? (s.now ? 'GO · NOW' : 'GO') : s.status, go ? COL.green : s.status === 'TOO COLD' ? COL.sky : COL.coral, s.advice)}
${cells(cell('RAIN', `${c.rain.pct}%`, c.rain.pct >= L.rainPct ? ['✗', 'bad'] : ['✓', 'good']), cell('TEMP', c.temp.f == null ? '—' : `${c.temp.f}°`, c.temp.f != null && c.temp.f < L.minTempF ? [`< ${L.minTempF}°`, 'bad'] : ['✓', 'good']), cell('WIND', `${c.wind.mph} mph`, c.wind.mph >= L.maxWindMph ? [`≥ ${L.maxWindMph}`, 'bad'] : ['✓', 'good']), cell('CALORIES', kcal != null ? `~${kcal}` : '—', kcal != null ? (stale ? [`UPDATE WEIGHT (${age} D)`, 'ok'] : [`EXTRA · ${wt.lb} LB`, 'good']) : ['SET WEIGHT', 'faint']))}
${more ? `<span class="note">${esc(more)}</span>` : ''}</section>`;
}

function render(dIn) {
  const d = hideDone(dIn);
  const [y, m, dd] = d.date.split('-').map(Number);
  const off = d.offset || 0;
  const [lo, hi] = d.range || [-1, 6];
  const nowShown = d.now || new Date(d.generatedAt).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
  const fixture = d.source && d.source.startsWith('fixture');
  const shown = fixture || off ? new Date(`${d.date}T12:00:00-08:00`) : new Date();
  const ph = moonPhase(shown), il = Math.round(illumination(ph) * 100);
  const weekend = d.weekday === 'SAT' || d.weekday === 'SUN';
  const rel = off === 0 ? esc(nowShown) : off === 1 ? 'TOMORROW' : off === -1 ? 'YESTERDAY' : `IN ${off} DAYS`;
  const lateBy = (src) => (d.errors || []).filter((e) => e.source === src);
  const late = (d.errors || []).map((e) => `<div class="late">DATA LATE · ${esc(e.source)} · ${esc(e.message.replace(/^\w+:\s*/, ''))}</div>`).join('');
  let n = 0;
  const body = d.sections.map((s) => { n++; if (s.hidden) return `<button type="button" class="sec wentmin${n === 1 ? ' first' : ''}" data-unhide="${s.type}">${head(n, `${NAMES[s.type]} · HIDDEN`, 'SHOW ▾')}</button>`; return s.type === 'surf' ? surfSec(d, s, n) : s.type === 'sun' ? sunSec(d, s, n) : s.type === 'lakers' ? lakersSec(d, s, n) : s.type === 'rollerblade' ? rollerSec(d, s, n) : humeSec(d, s, n); }).join('\n');
  let sky = '';
  try { // R22 sky notes for this day and the next 3 (nothing on quiet days)
    const ev = findSkyEvents({ fromDate: d.date, days: 4, obs: { lat: d.config.location.lat, lon: d.config.location.lon }, tz: d.config.location.tz, clouds: d.clouds });
    sky = skyNotesHtml(ev, { link: `sky.html${off ? `?date=${d.date}` : ''}` });
  } catch (e) { sky = ''; }
  const dots = Array.from({ length: hi - lo + 1 }, (_, i) => `<i class="${i + lo === off ? 'on' : ''}${i + lo === 0 ? ' today' : ''}"></i>`).join('');
  $('main').innerHTML = `
<header class="head">
<div class="daynav">
<button class="nav" type="button" data-step="-1" aria-label="Previous day" ${off <= lo ? 'disabled' : ''}>‹</button>
<h1>${off ? `<button class="date" type="button" data-today aria-label="Back to today">${d.weekday} ${dd} ${MON[m - 1]}</button>` : `${d.weekday} ${dd} ${MON[m - 1]}`}</h1>
<button class="nav" type="button" data-step="1" aria-label="Next day" ${off >= hi ? 'disabled' : ''}>›</button>
</div>
<span class="meta">${off ? `<b class="when">${rel}</b>` : rel} · <a href="sky.html${off ? `?date=${d.date}` : ''}">MOON ${il}% ${ph < 180 ? '↑' : '↓'}</a></span>
</header>
<div class="dots" aria-hidden="true">${dots}</div>
<div style="display:flex;flex-direction:column;gap:6px">
<div class="row"><span>${off ? 'DAY' : 'TODAY'} · IN ORDER</span><span>${weekend ? 'WEEKEND' : 'WEEKDAY'} · ${d.sections.length} ITEM${d.sections.length === 1 ? '' : 'S'}</span></div>
${d.banners.map((b) => `<div class="banner${b.kind === 'ocean' ? ' red' : b.kind === 'pressure' ? ' amber' : ''}">${esc(b.text)}</div>`).join('')}${late}
${pressLine(d)}
${nbaLine(d)}
${ganttChart(d)}
</div>
${body}
${humeLog(d, dIn.sections)}
${sky}
<footer class="foot"><span>Updated ${esc(new Date(d.generatedAt).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }))}${lateBy('weather').length ? ' · weather late' : ''} · swipe for other days</span><button id="refresh" type="button">REFRESH</button></footer>`;
  $('#refresh').addEventListener('click', () => { cache.delete(off); load(off, 0); });
  for (const b of document.querySelectorAll('[data-went]')) b.addEventListener('click', () => {
    if (!toggle(d.date, b.dataset.went)) { b.textContent = 'NOT SAVED'; return; }
    const y = scrollY; render(dIn); scrollTo(0, y);
  });
  for (const b of document.querySelectorAll('[data-hide]')) b.addEventListener('click', (e) => { e.stopPropagation(); hiddenSet(d.date, b.dataset.hide, true); const y = scrollY; render(dIn); scrollTo(0, y); });
  for (const b of document.querySelectorAll('[data-unhide]')) b.addEventListener('click', () => { hiddenSet(d.date, b.dataset.unhide, false); const y = scrollY; render(dIn); scrollTo(0, y); });
  const pb = document.querySelector('.pressbox');
  if (pb) pb.addEventListener('toggle', () => { pressOpen = pb.open; });
  const nb = document.querySelector('.nbabox');
  if (nb) nb.addEventListener('toggle', () => { nbaOpen = nb.open; });
  for (const b of document.querySelectorAll('[data-wentopen]')) b.addEventListener('click', () => { wentOpen.add(b.dataset.wentopen); const y = scrollY; render(dIn); scrollTo(0, y); });
  const rs = document.querySelector('[data-reset]');
  if (rs) rs.addEventListener('click', () => { resetDay(d.date); const y = scrollY; render(dIn); scrollTo(0, y); });
  for (const b of document.querySelectorAll('[data-step]')) b.addEventListener('click', () => go(+b.dataset.step));
  const t = document.querySelector('[data-today]'); if (t) t.addEventListener('click', () => go(-off));
  document.title = `${d.weekday} ${dd} ${MON[m - 1]} · Morning`;
}

// ---------- days: swipe, buttons, keys ----------

const cache = new Map();            // offset → { data, at }
const FRESH = 5 * 60 * 1000;
let offset = (() => { const v = +(new URLSearchParams(location.hash.slice(1)).get('d') || 0); return Number.isFinite(v) ? v : 0; })();
let range = [-1, 6];

function apiUrl(off) {
  const q = new URLSearchParams(location.search);
  if (off) q.set('d', off); else q.delete('d');
  const s = q.toString();
  return '/api/today' + (s ? '?' + s : '');
}

async function fetchDay(off) {
  const hit = cache.get(off);
  if (hit && Date.now() - hit.at < FRESH) return hit.data;
  const r = await fetch(apiUrl(off), { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  if (data.range) range = data.range;
  cache.set(off, { data, at: Date.now() });
  return data;
}

async function load(off = offset, dir = 0) {
  const t0 = performance.now();
  const main = $('main');
  try {
    const d = await fetchDay(off);
    offset = off;
    history.replaceState(null, '', off ? `#d=${off}` : location.pathname + location.search);
    if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      main.style.transition = 'none'; main.style.transform = `translateX(${dir * 28}px)`; main.style.opacity = '0.3';
      render(d);
      requestAnimationFrame(() => { main.style.transition = 'transform .18s ease-out, opacity .18s ease-out'; main.style.transform = ''; main.style.opacity = ''; });
    } else render(d);
    window.__renderMs = Math.round(performance.now() - t0);
    for (const n of [off - 1, off + 1]) if (n >= range[0] && n <= range[1] && !cache.has(n)) fetchDay(n).catch(() => {}); // preload neighbours
  } catch (e) {
    if (dir && main.querySelector('.head')) {          // keep the day on screen; show a short note
      const n = document.createElement('div'); n.className = 'late'; n.textContent = `Could not load that day (${e.message}).`;
      main.querySelector('.head').after(n); setTimeout(() => n.remove(), 4000);
    } else main.innerHTML = `<p class="skeleton">Could not load this day (${esc(e.message)}).<br><button type="button" onclick="location.reload()">TRY AGAIN</button></p>`;
  }
}

function go(step) {
  const next = Math.max(range[0], Math.min(range[1], offset + step));
  if (next !== offset) load(next, step > 0 ? 1 : -1);
}

let sx = null, sy = null;
document.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (sx == null) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  sx = sy = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) go(dx < 0 ? 1 : -1); // swipe left = next day
}, { passive: true });
document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
});

load();
setInterval(() => { cache.delete(offset); load(offset); }, 30 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(offset); });
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') navigator.serviceWorker.register('/sw.js');
