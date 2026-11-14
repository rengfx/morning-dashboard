// R33 First NBA tip-off of the day (for fantasy lineup changes). Source: ESPN public scoreboard (no key).
// ESPN groups games by US Eastern date; no game starts after midnight Eastern, so the Pacific date matches.
import { partsIn } from '../public/js/time.js';

export const scoreboardUrl = (base, date) => `${base}?dates=${date.replace(/-/g, '')}`;

/** {count, first: {tip, matchup}, games: [{tip, matchup, state}]} or null when there are no games. */
export function parseScoreboard(json, tz) {
  const ev = json && Array.isArray(json.events) ? json.events : null;
  if (!ev) throw new Error('nba: unexpected feed shape');
  const games = ev.filter((e) => e && e.date && !/POSTPONED|CANCELED/i.test(e.status?.type?.name || ''))
    .map((e) => ({ at: Date.parse(e.date), tip: partsIn(new Date(e.date), tz).time, matchup: e.shortName || e.name || 'NBA', state: e.status?.type?.state || 'pre' }))
    .sort((a, b) => a.at - b.at);
  if (!games.length) return null;
  return { count: games.length, first: { tip: games[0].tip, matchup: games[0].matchup }, games: games.map(({ at, ...g }) => g) };
}
