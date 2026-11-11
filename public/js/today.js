// Today page: fetch /api/today and render the B2 instrument panel.
import { COL, scale, pts, valAt, tideFn, text, rect, vline, poly, lx, darkBands, ticks, rainBars, nowLine, svg, hm, fm, esc, W } from './charts.js';
import { moonPhase, illumination } from './astro.js';

const $ = (s) => document.querySelector(s);
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const dir = (d) => COMPASS[Math.round(((d % 360) + 360) % 360 / 22.5) % 16];
const MARK = { GOOD: ['✓', 'good'], OK: ['~ OK', 'ok'], BAD: ['✗', 'bad'], COOL: ['~ COOL', 'ok'], COLD: ['~ COLD', 'ok'] };
const NAMES = { humeAM: 'HUME MORNING', humePM: 'HUME EVENING', surf: 'SURF', sun: 'SUN', lakers: 'LAKERS' };
const STRIP = { humeAM: COL.green, humePM: COL.green, surf: COL.sky, sun: COL.coral, lakers: COL.gold };
const STATUS_COL = { GO: COL.green, 'GO AFTER': COL.green, 'GO BY': COL.amber, WINDY: COL.amber, RAIN: COL.coral, CONFLICT: COL.coral };

const cell = (l, v, m) => `<div class="cell"><span class="l">${esc(l)}</span><span class="v">${esc(v)}</span>${m ? `<span class="m ${m[1]}">${esc(m[0])}</span>` : ''}</div>`;
const cells = (...c) => `<div class="cells" style="--n:${c.length}">${c.join('')}</div>`;
const head = (n, name, right) => `<div class="row"><span>${n} · ${esc(name)}</span><span>${esc(right || '')}</span></div>`;
const status = (big, col, small) => `<div class="status"><b style="color:${col}">${esc(big)}</b>${small ? `<span>${esc(small)}</span>` : ''}</div>`;
const lvl = (l, word) => (l === 'GOOD' ? ['✓' + (word ? ' ' + word : ''), 'good'] : l === 'OK' ? ['~ ' + (word || 'OK'), 'ok'] : ['✗' + (word ? ' ' + word : ''), 'bad']);

// ---------- charts ----------

function stripChart(d) {
  const sc = scale(5, 22), H = 34;
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H);
  b += rainBars(sc, pts(d.hourly.precipPct, d.hourly.time), H, 8, 40);
  d.sections.forEach((s, i) => {
    let a = s.start, e = s.end;
    if (s.type === 'surf' && !s.window) {
      if (s.nearMiss) b += rect(sc.x(hm(s.nearMiss.start)), 20, sc.x(hm(s.nearMiss.end)) - sc.x(hm(s.nearMiss.start)), 11, 'none', `rx="2" stroke="${COL.sky}" stroke-opacity="0.6" stroke-dasharray="2 2"`);
      return;
    }
    if (!a || !e) return;
    const half = s.type === 'lakers' && d.sections.some((o) => o !== s && o.start && hm(o.start) < hm(e) && hm(o.end) > hm(a));
    const x0 = sc.x(hm(a)), x1 = sc.x(hm(e)), y = 3, h = half ? 14 : 28;
    b += rect(x0, y, x1 - x0, h, STRIP[s.type], `rx="3" fill-opacity="${s.passed ? 0.35 : 1}"`);
    if (s.status === 'CONFLICT') b += rect(x0, 2, x1 - x0, 30, 'none', `rx="3" stroke="${COL.coral}" stroke-width="1.5" stroke-dasharray="3 2"`);
    b += text((x0 + x1) / 2, y + h - (half ? 4 : 10), `${i + 1}${s.type === 'lakers' ? ' LAL' : ''}`, COL.night, { anchor: 'middle', bold: true });
  });
  b += nowLine(sc, d.now, 38);
  b += ticks(sc, 50, 3);
  const said = d.sections.map((s, i) => `${i + 1} ${NAMES[s.type]} ${s.start ? s.start + ' to ' + s.end : 'no window'}${s.passed ? ', passed' : ''}`).join('; ');
  return svg(54, `Today in order, 5 AM to 10 PM: ${said}.`, b);
}

function humeChart(d, s) {
  const am = s.type === 'humeAM';
  const h0 = am ? Math.min(5, Math.floor(hm(s.start) / 60) - 1) : Math.min(16, Math.floor(hm(s.start) / 60) - 1);
  const h1 = am ? Math.max(11, Math.ceil(hm(s.end) / 60) + 1) : 22;
  const sc = scale(h0, h1), H = 72;
  const temp = pts(d.hourly.tempF, d.hourly.time).filter(([t]) => t >= sc.t0 && t <= sc.t1);
  const lo = Math.min(...temp.map((p) => p[1])), hi = Math.max(...temp.map((p) => p[1]));
  const ty = (v) => 60 - (v - lo) / Math.max(4, hi - lo) * 44;
  const pop = pts(d.hourly.precipPct, d.hourly.time);
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H) + rainBars(sc, pop, H, 60);
  const game = d.sections.find((x) => x.type === 'lakers');
  if (game && hm(game.start) < sc.t1 && hm(game.end) > sc.t0) {
    const g0 = sc.x(hm(game.start)), g1 = sc.x(hm(game.end));
    b += rect(g0, 0, g1 - g0, H, COL.gold, 'fill-opacity="0.18"') + vline(g0, 0, H, COL.gold, 'stroke-width="1.5"');
    b += text(g0 + 4, 66, `LAL ${game.start}`, COL.gold, { bold: true });
  }
  const x0 = sc.x(hm(s.start)), x1 = sc.x(hm(s.end));
  if (s.status === 'CONFLICT') {
    b += rect(x0, 0, x1 - x0, H, 'none', `stroke="${COL.coral}" stroke-width="1.5" stroke-dasharray="3 2"`);
    const s0 = sc.x(hm(s.suggest[0])), s1 = sc.x(hm(s.suggest[1]));
    b += rect(s0, 0, s1 - s0, H, COL.green, `fill-opacity="0.14" stroke="${COL.green}" stroke-width="1.5"`);
    b += text(s0 + 4, 13, `${s.suggest[0]}–${s.suggest[1]}`, COL.green, { bold: true });
  } else {
    b += rect(x0, 0, x1 - x0, H, COL.green, `fill-opacity="0.14" stroke="${COL.green}" stroke-width="1.5"`);
    const tag = s.status === 'GO AFTER' ? `GO AFTER ${s.goAfter}` : s.status === 'GO BY' ? `BY ${s.goBy}` : s.status;
    const tx = s.status === 'GO AFTER' ? sc.x(hm(s.goAfter)) + 5 : s.status === 'GO BY' ? sc.x(hm(s.goBy)) - 4 : x0 + 6;
    b += text(tx, 13, tag, STATUS_COL[s.status] || COL.green, { bold: true, anchor: s.status === 'GO BY' ? 'end' : 'start' });
    if (s.status === 'GO BY') b += vline(sc.x(hm(s.goBy)), 0, H, COL.amber, 'stroke-width="1.5" stroke-dasharray="3 2"');
    if (s.status === 'GO AFTER') b += vline(sc.x(hm(s.goAfter)), 0, H, COL.green, 'stroke-width="1.5" stroke-dasharray="3 2"');
  }
  b += poly(temp.map(([t, v]) => [sc.x(t), ty(v)]), COL.coral, 'stroke-width="2"');
  if (temp.length) {
    const [ta, va] = temp[0], [tb, vb] = temp[temp.length - 1];
    b += text(4, ty(va) - 6, `${Math.round(va)}°@${fm(ta)}`, COL.coral) + text(W - 4, ty(vb) - 6, `${Math.round(vb)}°@${fm(tb)}`, COL.coral, { anchor: 'end' });
  }
  const sunT = am ? hm(d.sun.rise) : hm(d.sun.set);
  if (sunT > sc.t0 && sunT < sc.t1) b += text(sc.x(sunT) + 3, 40, `${am ? '↑' : '↓'}${am ? d.sun.rise : d.sun.set}`, COL.muted);
  const maxPop = Math.max(0, ...pop.filter(([t]) => t >= sc.t0 && t < sc.t1).map((p) => p[1]));
  if (maxPop >= 40) { const pk = pop.find(([t, v]) => v === maxPop && t >= sc.t0); b += text(...(([x, a]) => [x, 28, `${maxPop}%@${fm(pk[0])}`, COL.sky, { anchor: a }])(lx(sc.x(pk[0] + 30)))); }
  else if (maxPop === 0) b += text(W - 4, 66, '0% rain', COL.faint, { anchor: 'end' });
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
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H);
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
  if (wind.length && Math.max(...wind.map((p) => p[1])) >= 10) { const pk = wind.reduce((m, p) => (p[1] > m[1] ? p : m)); const [tx, an] = lx(sc.x(pk[0])); b += text(tx, wy(pk[1]) - 6, `${Math.round(pk[1])}mph@${fm(pk[0])}`, COL.sky, { anchor: an }); }
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
  let b = rect(0, 0, W, H, COL.panel) + darkBands(sc, d.sun.rise, d.sun.set, H) + rainBars(sc, pts(d.hourly.precipPct, d.hourly.time), H, 40, 20);
  const a = sc.x(hm(s.start)), e = sc.x(hm(s.end));
  b += rect(a, 0, e - a, H, COL.amber, `fill-opacity="0.18" stroke="${COL.amber}" stroke-width="1.5"`) + text((a + e) / 2, 12, 'SUN', COL.amber, { anchor: 'middle', bold: true, size: 11 });
  const y3 = uy(d.config.sunscreenUv);
  b += `<line x1="0" y1="${y3.toFixed(1)}" x2="${W}" y2="${y3.toFixed(1)}" stroke="${COL.violet}" stroke-opacity="0.4" stroke-dasharray="1 3"></line>` + text(W - 4, y3 - 4, `UV ${d.config.sunscreenUv} · sunscreen`, COL.violet, { anchor: 'end', size: 9 });
  b += poly(temp.map(([t, v]) => [sc.x(t), ty(v)]), COL.coral, 'stroke-width="2"');
  b += poly(uv.map(([t, v]) => [sc.x(t), uy(v)]), COL.violet, 'stroke-width="2" stroke-dasharray="4 3"');
  if (s.tempPeakAt) { const x = sc.x(hm(s.tempPeakAt)), [tx, an] = lx(x + 30); b += `<circle cx="${x.toFixed(1)}" cy="${ty(s.tempPeak).toFixed(1)}" r="3" fill="${COL.coral}"></circle>` + text(tx, Math.min(ty(s.tempPeak), uy(s.uvPeak)) - 9, `${s.tempPeak}°@${s.tempPeakAt}`, COL.coral, { anchor: an, size: 11 }); }
  { const x = sc.x(hm(s.uvPeakAt)), [tx, an] = lx(x); b += `<circle cx="${x.toFixed(1)}" cy="${uy(s.uvPeak).toFixed(1)}" r="3" fill="${COL.violet}"></circle>` + text(tx, Math.max(ty(s.tempPeak ?? 0), uy(s.uvPeak)) + 18, `${Math.round(s.uvPeak)}@${s.uvPeakAt}`, COL.violet, { anchor: an, size: 11 }); }
  const game = d.sections.find((x) => x.type === 'lakers');
  if (game && hm(game.start) > sc.t0 && hm(game.start) < sc.t1) { const x = sc.x(hm(game.start)); b += vline(x, 0, H, COL.gold, 'stroke-width="1.5"') + text(x + 4, 24, 'LAL', COL.gold, { bold: true }); }
  b += rect(0, H, W, 1, COL.rule) + nowLine(sc, d.now, H) + ticks(sc, 146, 2);
  return svg(150, `Sun chart, 6 AM to 8 PM: temperature peak ${s.tempPeak} degrees at ${s.tempPeakAt}; UV peak ${s.uvPeak} at ${s.uvPeakAt}; sun window ${s.start} to ${s.end}.`, b)
    + `<div class="legend"><span style="color:${COL.coral}">— temp °F</span>  <span style="color:${COL.violet}">╌ UV index</span>  <span style="color:${COL.amber}">▮ sun window</span>${game ? `  <span style="color:${COL.gold}">┃ tip-off</span>` : ''}</div>`;
}

// ---------- sections ----------

function humeSec(d, s, n) {
  const right = `${s.start}–${s.end}${s.source === 'default' ? ' (usual)' : ''}`;
  if (s.passed) return `<section class="sec passed${n === 1 ? ' first' : ''}">${head(n, NAMES[s.type], right)}<span style="font-size:15px">PASSED · ${esc(s.advice)}</span></section>`;
  const c = s.cells;
  const big = s.status === 'GO BY' ? `GO BY ${s.goBy}` : s.status === 'GO AFTER' ? `GO AFTER ${s.goAfter}` : s.status;
  const rainM = c.rain.level === 'GOOD' ? ['✓', 'good'] : c.rain.level === 'OK' ? ['~ LOW', 'ok'] : ['✗', 'bad'];
  const tempM = c.temp.level === 'GOOD' ? ['✓', 'good'] : MARK[c.temp.level] || ['~', 'ok'];
  return `<section class="sec${n === 1 ? ' first' : ''}">${head(n, NAMES[s.type], right)}
${status(big + (s.now ? ' · NOW' : ''), STATUS_COL[s.status] || COL.green, s.advice)}
${cells(cell('RAIN', `${c.rain.pct}%`, c.rain.at ? [`${rainM[0]} @${c.rain.at}`, rainM[1]] : rainM), cell('WIND', `${c.wind.mph} ${dir(c.wind.dirDeg)}`, c.wind.level === 'GOOD' ? ['✓', 'good'] : ['✗ WINDY', 'bad']), cell('TEMP', c.temp.f == null ? '—' : `${c.temp.f}°`, tempM), cell('LIGHT', s.type === 'humeAM' ? `↑${c.light.rise}` : `↓${c.light.set}`, c.light.dark ? ['~ DARK', 'ok'] : ['✓', 'good']))}
${humeChart(d, s)}</section>`;
}

function surfSec(d, s, n) {
  const c = s.cells;
  const right = c ? `${c.swell.ft} ft · ${c.period.s}s ${dir(c.period.dirDeg)}` : '';
  const big = s.window ? `${s.start}–${s.end}` : 'NO GOOD WINDOW';
  const small = s.window ? 'first good window' : s.nearMiss ? `Best try ${s.nearMiss.start}–${s.nearMiss.end} · ${s.nearMiss.score}/${s.nearMiss.of}` : '';
  const cs = c ? cells(
    cell('SWELL', `${c.swell.ft} ft`, lvl(c.swell.level, c.swell.level === 'GOOD' ? 'GOOD' : c.swell.level === 'OK' ? 'OK' : 'SMALL')),
    cell('PERIOD', `${c.period.s}s ${dir(c.period.dirDeg)}`, lvl(c.period.level, c.period.level === 'GOOD' ? 'GOOD' : c.period.level === 'OK' ? 'DIR OK' : 'BAD')),
    cell(`TIDE ${c.at}`, `${c.tide.ft} ft ${c.tide.rising == null ? '' : c.tide.rising ? '↑' : '↓'}`, lvl(c.tide.level, c.tide.level === 'BAD' ? 'HIGH' : '')),
    cell('WIND', `${c.wind.mph} ${dir(c.wind.dirDeg)}`, lvl(c.wind.level))) : '';
  return `<section class="sec">${head(n, `SURF · ${(s.spot || '').toUpperCase()}`, right)}
${s.advisory ? '<div class="banner red">RAIN ADVISORY · avoid ocean contact ~72 h after rain</div>' : ''}
${status(big + (s.now ? ' · NOW' : ''), s.window ? COL.amber : COL.muted, small)}${cs}${surfChart(d, s)}</section>`;
}

function sunSec(d, s, n) {
  return `<section class="sec">${head(n, 'SUN', `2 H AROUND UV PEAK${s.endsAtTipoff ? ' · ENDS AT TIP-OFF' : ''}`)}
${status(`${s.start}–${s.end}${s.now ? ' · NOW' : ''}`, s.passed ? COL.muted : COL.amber, `UV ${Math.round(s.uvPeak)}@${s.uvPeakAt}${s.tempPeak != null ? ` · ${s.tempPeak}°@${s.tempPeakAt}` : ''}`)}
${sunChart(d, s)}${cells(cell('SUNSCREEN', s.sunscreen ? `${s.sunscreen[0]}–${s.sunscreen[1]}` : 'not needed'), cell('SUNRISE', d.sun.rise), cell('SUNSET', d.sun.set))}</section>`;
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
${cells(cell('TIP-OFF', s.start), cell('ENDS', `~${s.end}`), cell('WHERE', s.home ? 'HOME' : 'AWAY'), cell('TV', s.tv || '—'))}
${rel ? `<span class="note">${esc(rel)}</span>` : ''}</section>`;
}

// ---------- page ----------

function render(d) {
  const [y, m, dd] = d.date.split('-').map(Number);
  const nowShown = d.now || new Date(d.generatedAt).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
  const shown = d.source && d.source.startsWith('fixture') ? new Date(`${d.date}T12:00:00-08:00`) : new Date();
  const ph = moonPhase(shown), il = Math.round(illumination(ph) * 100);
  const weekend = d.weekday === 'SAT' || d.weekday === 'SUN';
  const lateBy = (src) => (d.errors || []).filter((e) => e.source === src);
  const late = (d.errors || []).map((e) => `<div class="late">DATA LATE · ${esc(e.source)} · ${esc(e.message.replace(/^\w+:\s*/, ''))}</div>`).join('');
  let n = 0;
  const body = d.sections.map((s) => { n++; return s.type === 'surf' ? surfSec(d, s, n) : s.type === 'sun' ? sunSec(d, s, n) : s.type === 'lakers' ? lakersSec(d, s, n) : humeSec(d, s, n); }).join('\n');
  $('main').innerHTML = `
<header class="head"><h1>${d.weekday} ${dd} ${MON[m - 1]}</h1><span class="meta">VENICE · ${esc(nowShown)} · <a href="sky.html">MOON ${il}% ${ph < 180 ? '↑' : '↓'} →</a></span></header>
<div style="display:flex;flex-direction:column;gap:6px">
<div class="row"><span>TODAY · IN ORDER</span><span>${weekend ? 'WEEKEND' : 'WEEKDAY'} · ${d.sections.length} ITEMS</span></div>
${d.banners.map((b) => `<div class="banner">${esc(b.text)}</div>`).join('')}${late}
${stripChart(d)}
<div class="legend">${d.sections.map((s, i) => `<span style="color:${s.passed ? COL.faint : STRIP[s.type]}">${i + 1} ${NAMES[s.type].replace('HUME MORNING', 'Hume AM').replace('HUME EVENING', 'Hume PM').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}${s.passed ? ' (passed)' : s.type === 'surf' && !s.window ? ' (none)' : ''}</span>`).join(' · ')} · ┃ now</div>
</div>
${body}
<footer class="foot"><span>Updated ${esc(new Date(d.generatedAt).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' }))}${lateBy('weather').length ? ' · weather late' : ''}</span><button id="refresh" type="button">REFRESH</button></footer>`;
  $('#refresh').addEventListener('click', load);
  document.title = `${d.weekday} ${dd} ${MON[m - 1]} · Morning`;
}

async function load() {
  const t0 = performance.now();
  try {
    const r = await fetch('/api/today' + location.search, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    render(d);
    window.__renderMs = Math.round(performance.now() - t0);
  } catch (e) {
    $('main').innerHTML = `<p class="skeleton">Could not load today’s data (${esc(e.message)}).<br><button type="button" onclick="location.reload()">TRY AGAIN</button></p>`;
  }
}

load();
setInterval(load, 30 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') navigator.serviceWorker.register('/sw.js');
