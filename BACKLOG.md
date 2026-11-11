# Backlog

## You (to go live) — see DEPLOY.md

- [ ] Publish Routine calendar → `ICS_URL`
- [ ] Create an empty private GitHub repo `morning-dashboard` (Claude pushes the code)
- [ ] Cloudflare Pages project + secret
- [ ] Custom domain `dash.darinwilliams.com`: CNAME at IONOS + `ACCESS_KEY` secret
- [ ] Add to Home Screen

## Open questions

- **B1 Travel to Hume** — walk, bike, or car? Changes `hume.windNoMph`. Default 15 mph.
- **B2 Hume default windows** — 06:30–08:30 / 17:30–19:30 are used only on days with no Routine event.
- **B3 Rain limits** — 20 % "note", 40 % "no". Confirm after a week.
- [x] **B4 DNS** — IONOS (DNS, web, and email). Dashboard uses a CNAME at IONOS + key gate (D19).
- **B5 Planet motion on Sky** — true motion now (Earth moves ~1° a day). Faster planet clock or a year mode later?
- **B6 Lakers record / last result** — not in the ICS feed. Would need a scores API.

## First week after going live

- Check the live Open-Meteo numbers against what you see at the beach. Tune surf thresholds.
- Check `swell_wave_height` is in feet with `length_unit=imperial` (fixture data assumed feet).
- Watch the first real `DATA LATE` events and how often each source fails.

## Later

- Second "later" surf windows: confirm the dashed-outline display with real data.
- Moon-height histogram: mark moonrise / moonset times.
- Lakers TV: the feed only names national TV; local games show `LOCAL`.

## Done (2026-10-31 session)

- Scorer R1–R17, ICS reader, fetchers, `/api/today`, Today page, Sky page with real positions.
- Home Screen app files: manifest, icons, service worker (offline last-good data).
- Key gate fallback for login.
- Tests: 6 fixtures (3 real weekends) + 37 checks, all pass.
- Fixed in preview: rain-later off by one, header wrap, moon % on previewed days, RAIN cell cut off, 4 label overlaps, stale dev server.
