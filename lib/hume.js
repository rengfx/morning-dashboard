// HUME class schedule (Arketa public widget feed, the same data as the public schedule page).
// No login. Not an official API: if the shape changes, parse returns [] and the page shows DATA LATE.

import { partsIn, ymd, zonedToUtc, addDays, hm, fm } from '../public/js/time.js';

/** Feed URL for one local day. */
export function scheduleUrl(c, date, tz) {
  const [y, mo, d] = ymd(date), [y2, mo2, d2] = ymd(addDays(date, 1));
  const a = zonedToUtc(y, mo, d, 0, 0, 0, tz).toISOString();
  const b = new Date(zonedToUtc(y2, mo2, d2, 0, 0, 0, tz).getTime() - 1000).toISOString();
  return `${c.apiBase}/${c.partnerId}/schedule?startDateTime=${encodeURIComponent(a)}&endDateTime=${encodeURIComponent(b)}&timezone=${encodeURIComponent(tz)}`;
}

/** Normalize the feed to the classes that start on `date` (local). Cancelled and private classes are dropped. */
export function parseClasses(json, date, tz) {
  const list = json && json.data && Array.isArray(json.data.classes) ? json.data.classes : null;
  if (!list) throw new Error('hume: unexpected feed shape');
  const out = [];
  for (const c of list) {
    if (!c || c.canceled || (c.display && c.display !== 'public') || typeof c.start_time !== 'number') continue;
    const p = partsIn(new Date(c.start_time * 1000), tz);
    if (p.date !== date) continue;
    const cap = +c.max_capacity || 0, booked = +c.total_booked || 0, left = Math.max(0, cap - booked);
    const closed = c.isBookable === false && /window_closed|started|past/i.test(c.unavailableReason || '');
    out.push({
      start: p.time, end: fm(hm(p.time) + (+c.duration || 0)), min: +c.duration || 0,
      name: String(c.name || 'Class').replace(/\s+/g, ' ').trim(),
      host: c.hostName && c.hostName !== 'HUME' ? String(c.hostName) : null,
      cap, left, waitlist: +c.waitlistLength || 0,
      state: closed ? 'CLOSED' : cap && left === 0 ? 'FULL' : 'OPEN',
    });
  }
  return out.sort((x, y) => hm(x.start) - hm(y.start) || x.name.localeCompare(y.name));
}

/** Classes that start inside a window [start, end). */
export const classesIn = (list, start, end) => (list || []).filter((c) => hm(c.start) >= hm(start) && hm(c.start) < hm(end));
