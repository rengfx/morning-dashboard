// R28 Hume log: "I went" marks, kept in this browser (localStorage). Wrapped: storage can be blocked or empty.
import { addDays, weekdayOf } from './time.js';

const KEY = 'hume-went-v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch { return false; } };

export const marks = (date) => read()[date] || {};

/** Toggle one window ('am' | 'pm' | 'day') for a date. Returns false when storage is blocked. */
export function toggle(date, win) {
  const all = read(), day = { ...(all[date] || {}) };
  if (day[win]) { delete day[win]; day[`${win}Keep`] = true; } // cleared by hand: keep the block on the page
  else { day[win] = true; delete day[`${win}Keep`]; }
  if (Object.keys(day).length) all[date] = day; else delete all[date];
  return write(all);
}

/** Clear every mark for a date (back to the normal rules). */
export function resetDay(date) { const all = read(); delete all[date]; return write(all); }

const VISIT = new Set(['am', 'pm', 'day']);
/** Visits Monday–Sunday of the week that holds `date` (one per marked window). */
export function weekCount(date) {
  const back = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 }[weekdayOf(date)];
  const all = read(); let n = 0;
  for (let i = 0; i < 7; i++) n += Object.keys(all[addDays(date, i - back)] || {}).filter((k) => VISIT.has(k)).length;
  return n;
}
