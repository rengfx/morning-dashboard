// Time helpers. All local logic uses an IANA zone (default America/Los_Angeles).
// No dependencies: uses Intl only, so it runs in browsers, Node, and Cloudflare Workers.

export const TZ = 'America/Los_Angeles';
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const hm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const fm = (x) => {
  const v = Math.round(x);
  const h = Math.floor(v / 60), m = ((v % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const fmtCache = new Map();
function fmt(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    }));
  }
  return fmtCache.get(tz);
}

/** Wall-clock parts of a Date in a zone. */
export function partsIn(date, tz = TZ) {
  const o = {};
  for (const p of fmt(tz).formatToParts(date)) o[p.type] = p.value;
  return {
    y: +o.year, mo: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second,
    weekday: o.weekday.toUpperCase().slice(0, 3),
    date: `${o.year}-${o.month}-${o.day}`,
    time: `${o.hour}:${o.minute}`,
  };
}

/** Zone offset in minutes (local − UTC) at a Date. */
export function offsetMin(date, tz = TZ) {
  const p = partsIn(date, tz);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** UTC Date for a wall-clock time in a zone. For a repeated hour (fall back) the first one is used. */
export function zonedToUtc(y, mo, d, h = 0, mi = 0, s = 0, tz = TZ) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let off = offsetMin(new Date(guess), tz);
  let t = guess - off * 60000;
  const off2 = offsetMin(new Date(t), tz);
  if (off2 !== off) t = guess - off2 * 60000;
  // Fall back: two instants show the same wall time. Prefer the earlier one.
  const earlier = t - 3600000;
  const pe = partsIn(new Date(earlier), tz);
  if (pe.h === h && pe.mi === mi && pe.d === d) t = earlier;
  return new Date(t);
}

export const ymd = (s) => s.split('-').map(Number);
export function addDays(dateStr, n) {
  const [y, mo, d] = ymd(dateStr);
  const t = new Date(Date.UTC(y, mo - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function weekdayOf(dateStr) {
  const [y, mo, d] = ymd(dateStr);
  return WD[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
}
export function daysBetween(a, b) {
  const [y1, m1, d1] = ymd(a), [y2, m2, d2] = ymd(b);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/**
 * DST change near a local date.
 * Returns { when: 'tonight' | 'today', direction: 'back' | 'forward' } or null.
 * 'tonight' = the change happens in the early hours of the next day.
 */
export function dstInfo(dateStr, tz = TZ) {
  const noon = (s) => { const [y, mo, d] = ymd(s); return offsetMin(zonedToUtc(y, mo, d, 12, 0, 0, tz), tz); };
  const prev = noon(addDays(dateStr, -1)), cur = noon(dateStr), next = noon(addDays(dateStr, 1));
  if (next !== cur) return { when: 'tonight', direction: next < cur ? 'back' : 'forward' };
  if (prev !== cur) return { when: 'today', direction: cur < prev ? 'back' : 'forward' };
  return null;
}
