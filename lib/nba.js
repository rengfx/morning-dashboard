// R33 First NBA tip-off of the day (for fantasy lineup changes). Source: ESPN public scoreboard (no key).
// ESPN groups games by US Eastern date; no game starts after midnight Eastern, so the Pacific date matches.
import { partsIn } from '../public/js/time.js';

export const scoreboardUrl = (base, date) => `${base}?dates=${date.replace(/-/g, '')}`;

/** {count, first: {tip, matchup}, games: [{tip, matchup, state}]} or null when there are no games. */
export function parseScoreboard(json, tz) {
  const ev = json && Array.isArray(json.events) ? json.events : null;
  if (!ev) throw new Error('nba: unexpected feed shape');
  const games = ev.filter((e) => e && e.date && !/POSTPONED|CANCELED/i.test(e.status?.type?.name || ''))
    .map((e) => {
      const st = e.status?.type?.state || 'pre', cs = e.competitions?.[0]?.competitors || [];
      const sc = cs.length === 2 && st !== 'pre' ? cs.slice().sort((a) => (a.homeAway === 'away' ? -1 : 1)).map((c) => `${c.team?.abbreviation || ''} ${c.score ?? ''}`.trim()).join(' – ') : null;
      const home = cs.find((c) => c.homeAway === 'home')?.team?.abbreviation || null, away = cs.find((c) => c.homeAway === 'away')?.team?.abbreviation || null;
      return { at: Date.parse(e.date), tip: partsIn(new Date(e.date), tz).time, matchup: e.shortName || e.name || 'NBA', state: st, detail: st === 'pre' ? null : (e.status?.type?.shortDetail || null), score: sc, home, away, venue: e.competitions?.[0]?.venue?.fullName || null };
    })
    .sort((a, b) => a.at - b.at);
  if (!games.length) return null;
  return { count: games.length, first: { tip: games[0].tip, matchup: games[0].matchup }, games: games.map(({ at, ...g }) => g) };
}

/** R37 Other leagues: only games of the listed teams (e.g. NFL LAR, MLB LAD). Returns [] when none. */
export function teamGames(json, league, teams, tz) {
  const all = parseScoreboard(json, tz);
  if (!all) return [];
  return all.games.filter((g) => teams.includes(g.home) || teams.includes(g.away)).map((g) => ({ ...g, league, team: teams.includes(g.home) ? g.home : g.away, isHome: teams.includes(g.home) }));
}

/** R38 Team schedule feed (ESPN teams/<id>/schedule): the team's games on the local date `date`. */
export function teamScheduleGames(json, league, team, date, tz) {
  const ev = json && Array.isArray(json.events) ? json.events : null;
  if (!ev) throw new Error(`${league.toLowerCase()}: unexpected feed shape`);
  const val = (sc) => (sc == null ? '' : typeof sc === 'object' ? (sc.displayValue ?? sc.value ?? '') : sc);
  return ev.filter((e) => e && e.date && partsIn(new Date(e.date), tz).date === date).map((e) => {
    const c0 = e.competitions?.[0] || {}, cs = c0.competitors || [], st = (c0.status || e.status)?.type?.state || 'pre';
    const home = cs.find((c) => c.homeAway === 'home')?.team?.abbreviation || null, away = cs.find((c) => c.homeAway === 'away')?.team?.abbreviation || null;
    const score = cs.length === 2 && st !== 'pre' ? [cs.find((c) => c.homeAway === 'away'), cs.find((c) => c.homeAway === 'home')].map((c) => `${c?.team?.abbreviation || ''} ${val(c?.score)}`.trim()).join(' – ') : null;
    return { tip: partsIn(new Date(e.date), tz).time, matchup: e.shortName || e.name || league, state: st, detail: st === 'pre' ? null : ((c0.status || e.status)?.type?.shortDetail || null), score, home, away, venue: c0.venue?.fullName || null, league, team, isHome: home === team };
  });
}

/** R41 Lakers TV for a local date from the ESPN team schedule: can it be watched on the Spectrum SportsNet plan? */
export function lakersTv(json, date, tz, localRe = /spectrum sports ?net/i) {
  const ev = json && Array.isArray(json.events) ? json.events : null;
  if (!ev) throw new Error('lakers tv: unexpected feed shape');
  const e = ev.find((x) => x && x.date && partsIn(new Date(x.date), tz).date === date);
  if (!e) return null;
  const bs = (e.competitions?.[0]?.broadcasts || []).map((b) => ({ name: b.media?.shortName || b.names?.[0] || '', market: (b.market?.type || b.market || '').toString() }));
  const local = bs.some((b) => localRe.test(b.name));
  const national = [...new Set(bs.filter((b) => /national/i.test(b.market)).map((b) => b.name))];
  return { onPlan: local, national };
}
