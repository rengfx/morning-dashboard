// Small, tolerant iCalendar (RFC 5545) reader.
// Handles: line folding, params, escaped text, quoted values, duplicate VTIMEZONE blocks,
// TZID / UTC / floating / all-day times, RRULE (DAILY, WEEKLY with BYDAY, INTERVAL, COUNT, UNTIL),
// EXDATE, and RECURRENCE-ID overrides. Times are converted with Intl (IANA zone names).

import { TZ, zonedToUtc, partsIn, daysBetween, addDays, weekdayOf, ymd } from '../public/js/time.js';

const unescape = (v) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
const unquote = (v) => v.replace(/^"(.*)"$/s, '$1');

function parseLine(line) {
  // NAME;PARAM=VAL;PARAM="x:y":VALUE  (colon inside quoted params is not the separator)
  let inQ = false, i = 0;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === ':' && !inQ) break;
  }
  const head = line.slice(0, i), value = line.slice(i + 1);
  const [name, ...ps] = head.split(';');
  const params = {};
  for (const p of ps) { const k = p.indexOf('='); if (k > 0) params[p.slice(0, k).toUpperCase()] = unquote(p.slice(k + 1)); }
  return { name: name.toUpperCase(), params, value };
}

function parseDate(prop) {
  if (!prop) return null;
  const v = prop.value.trim();
  const isDate = prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v);
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  return {
    y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0),
    isDate, utc: !!m[7], tzid: prop.params.TZID || null,
  };
}

function knownZone(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

function toInstant(dt, fallbackTz = TZ) {
  if (dt.utc) return new Date(Date.UTC(dt.y, dt.mo - 1, dt.d, dt.h, dt.mi, dt.s));
  const tz = dt.tzid && knownZone(dt.tzid) ? dt.tzid : fallbackTz;
  return zonedToUtc(dt.y, dt.mo, dt.d, dt.h, dt.mi, dt.s, tz);
}

/** Parse text. Returns { complete, name, events }. */
export function parseICS(text) {
  const raw = String(text || '').replace(/\r\n?/g, '\n');
  const lines = [];
  for (const l of raw.split('\n')) {
    if ((l.startsWith(' ') || l.startsWith('\t')) && lines.length) lines[lines.length - 1] += l.slice(1);
    else if (l.length) lines.push(l);
  }
  const complete = lines.length > 0 && lines[0].trim() === 'BEGIN:VCALENDAR' && lines[lines.length - 1].trim() === 'END:VCALENDAR';
  const events = [];
  let name = null, cur = null, depth = [];
  for (const line of lines) {
    const p = parseLine(line);
    if (p.name === 'BEGIN') { depth.push(p.value.trim()); if (p.value.trim() === 'VEVENT') cur = { exdates: [] }; continue; }
    if (p.name === 'END') { const what = depth.pop(); if (what === 'VEVENT' && cur) { events.push(cur); cur = null; } continue; }
    if (!cur) { if (p.name === 'X-WR-CALNAME') name = unquote(unescape(p.value)); continue; }
    if (depth[depth.length - 1] !== 'VEVENT') continue; // skip VALARM etc.
    switch (p.name) {
      case 'SUMMARY': cur.summary = unquote(unescape(p.value)).trim(); break;
      case 'LOCATION': cur.location = unquote(unescape(p.value)).trim(); break;
      case 'DESCRIPTION': cur.description = unquote(unescape(p.value)).trim(); break;
      case 'UID': cur.uid = p.value.trim(); break;
      case 'STATUS': cur.status = p.value.trim().toUpperCase(); break;
      case 'DTSTART': cur.dtstart = parseDate(p); break;
      case 'DTEND': cur.dtend = parseDate(p); break;
      case 'DURATION': cur.duration = p.value.trim(); break;
      case 'RRULE': cur.rrule = Object.fromEntries(p.value.split(';').map((kv) => kv.split('=')).map(([k, v]) => [k.toUpperCase(), v])); break;
      case 'EXDATE': for (const v of p.value.split(',')) { const d = parseDate({ value: v, params: p.params }); if (d) cur.exdates.push(d); } break;
      case 'RECURRENCE-ID': cur.recurrenceId = parseDate(p); break;
      default: break;
    }
  }
  return { complete, name, events: events.filter((e) => e.dtstart && e.status !== 'CANCELLED') };
}

function durationMs(ev) {
  if (ev.dtend) return toInstant(ev.dtend) - toInstant(ev.dtstart);
  const m = (ev.duration || '').match(/P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (m) return ((+m[1] || 0) * 7 * 86400 + (+m[2] || 0) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1000;
  return ev.dtstart.isDate ? 86400000 : 0;
}

const DAYCODE = { SU: 'SUN', MO: 'MON', TU: 'TUE', WE: 'WED', TH: 'THU', FR: 'FRI', SA: 'SAT' };
const dateKey = (dt) => `${dt.y}-${String(dt.mo).padStart(2, '0')}-${String(dt.d).padStart(2, '0')}`;

/** Does a recurring event have an occurrence on local date `day` (in the event's own zone)? */
function occursOn(ev, day) {
  const r = ev.rrule;
  const startDay = dateKey(ev.dtstart);
  const diff = daysBetween(startDay, day);
  if (diff < 0) return false;
  if (!r) return diff === 0;
  const interval = +(r.INTERVAL || 1);
  let match = false;
  if (r.FREQ === 'DAILY') match = diff % interval === 0;
  else if (r.FREQ === 'WEEKLY') {
    const days = r.BYDAY ? r.BYDAY.split(',').map((c) => DAYCODE[c.slice(-2)]) : [weekdayOf(startDay)];
    const wkst = 0; // weeks counted from the start day's Sunday
    const startSun = addDays(startDay, -['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(weekdayOf(startDay)) + wkst);
    const weeks = Math.floor(daysBetween(startSun, day) / 7);
    match = days.includes(weekdayOf(day)) && weeks % interval === 0;
  } else return diff === 0; // MONTHLY/YEARLY not needed here: base instance only
  if (!match) return false;
  if (r.UNTIL) {
    const u = parseDate({ value: r.UNTIL, params: {} });
    if (u && daysBetween(dateKey(u), day) > 0) return false;
  }
  if (r.COUNT) {
    let n = 0;
    for (let k = 0; k <= diff; k++) if (occursOn({ ...ev, rrule: { ...r, COUNT: undefined } }, addDays(startDay, k))) n++;
    if (n > +r.COUNT) return false;
  }
  if (ev.exdates.some((x) => dateKey(x) === day)) return false;
  return true;
}

/**
 * Events on a local date. Returns [{ title, start:'HH:MM', end:'HH:MM', startAt, endAt, location, description, allDay }].
 * Handles events whose own zone differs from `tz` (for example an away game in Denver time).
 */
export function eventsOn(cal, dateStr, tz = TZ) {
  const out = [];
  const overrides = cal.events.filter((e) => e.recurrenceId);
  for (const ev of cal.events) {
    if (ev.recurrenceId) continue;
    const evTz = ev.dtstart.tzid && knownZone(ev.dtstart.tzid) ? ev.dtstart.tzid : tz;
    // Check the day before, the day, and the day after in the event zone; keep what lands on dateStr in tz.
    for (const off of [-1, 0, 1]) {
      const day = addDays(dateStr, off);
      if (!occursOn(ev, day)) continue;
      const [y, mo, d] = ymd(day);
      let start = ev.dtstart.utc
        ? new Date(Date.UTC(y, mo - 1, d, ev.dtstart.h, ev.dtstart.mi, ev.dtstart.s))
        : zonedToUtc(y, mo, d, ev.dtstart.h, ev.dtstart.mi, ev.dtstart.s, evTz);
      let dur = durationMs(ev);
      let title = ev.summary, location = ev.location, description = ev.description;
      const ov = overrides.find((o) => o.uid === ev.uid && dateKey(o.recurrenceId) === day);
      if (ov) { start = toInstant(ov.dtstart, evTz); dur = durationMs(ov); title = ov.summary ?? title; location = ov.location ?? location; description = ov.description ?? description; }
      const end = new Date(start.getTime() + dur);
      const ps = partsIn(start, tz);
      if (ps.date !== dateStr) continue;
      const pe = partsIn(end, tz);
      out.push({
        title: title || '', location: location || '', description: description || '',
        start: ps.time, end: pe.date === dateStr ? pe.time : '24:00',
        startAt: start.toISOString(), endAt: end.toISOString(), allDay: !!ev.dtstart.isDate,
      });
    }
  }
  return out.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Lakers feed helpers. SUMMARY: "Away Team at Home Team (TV)". */
export function parseGame(e, team = 'Los Angeles Lakers') {
  let s = e.title.trim();
  let tv = null;
  const paren = s.match(/\s*\(([^)]+)\)\s*$/);
  if (paren) { tv = paren[1].trim(); s = s.slice(0, paren.index).trim(); }
  const [away, home] = s.split(/\s+at\s+/i).map((x) => x.trim());
  if (!home) return null;
  const isHome = home === team;
  const opp = isHome ? away : home;
  const short = /Trail Blazers$/.test(opp) ? 'Trail Blazers' : opp.split(' ').pop();
  const nat = (e.description || '').match(/National TV:\s*([^\n]+)/i);
  if (nat) tv = nat[1].trim();
  return {
    tipoff: e.start, opponentName: short, opponentFull: opp, home: isHome,
    arena: (e.location || '').split(',')[0].trim(), tv: tv || 'LOCAL',
  };
}
