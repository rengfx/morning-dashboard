# Backlog

## You (to go live) — see DEPLOY.md

- [x] Publish Routine calendar → `ICS_URL` (2026-11-11)
- [x] GitHub repo `rengfx/morning-dashboard`, code pushed (2026-11-11)
- [x] Cloudflare Pages project, live at `morning-dashboard-cdr.pages.dev`; `ICS_URL` + `ACCESS_KEY` set; `/api/health` all OK (2026-11-11)
- [x] Cloudflare side of `dash.darinwilliams.com` (CNAME setup started) (2026-11-11)
- [x] IONOS: CNAME `dash` → `morning-dashboard-cdr.pages.dev` added; public DNS resolves; Cloudflare check started (2026-11-11). Wait for the "Active" email.
- [ ] Phone: open the key link once, Add to Home Screen

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

- Hume log sync across devices (Cloudflare KV; needs a KV namespace in the Pages project). Marks are per browser now.

- Pier view: bright stars and constellations (only Moon and planets now).
- Sky notes: meteor showers and eclipses (not computed now).
- Basketball: the court has lights? LIGHT shows "~ DARK" after sunset; remove the mark if the court is lit.

- HUME classes Door 3 (not chosen 2026-11-11): `/hume.ics` as a separate iPhone calendar. Needs the key in the link and a filter (~100 classes a week).
- HUME app direct open: the app publishes no universal link; a custom URL scheme is unknown. If found (test on the phone), replace `appUrl`.
- HUME classes: watch the first week for feed changes (DATA LATE · hume classes).

- 12-hour time option (offered 2026-11-11, not asked for yet).

- Second "later" surf windows: confirm the dashed-outline display with real data.
- Moon-height histogram: mark moonrise / moonset times.
- Lakers TV: the feed only names national TV; local games show `LOCAL`.

## Done (2026-11-13 session)

- Morning block hides when done (R27), Hume log with weekly count (R28). Tests: 8 fixtures + 83 checks, all pass.

## Done (2026-11-12 session)

- Hume windows (R19), Basketball (R20), 90-min sun + water temp (R21), sky notes + planets tonight (R22), chart grid + peak dots (R23), pier view (R24), where to look (R25), sunset reference (R26). Tests: 8 fixtures + 80 checks, all pass.

## Done (2026-11-11 session)

- Day navigation (D21).
- HUME classes in the Hume windows (R18, D22). Tests: 7 fixtures + 57 checks, all pass.

## Done (2026-10-31 session)

- Scorer R1–R17, ICS reader, fetchers, `/api/today`, Today page, Sky page with real positions.
- Home Screen app files: manifest, icons, service worker (offline last-good data).
- Key gate fallback for login.
- Tests: 6 fixtures (3 real weekends) + 37 checks, all pass.
- Fixed in preview: rain-later off by one, header wrap, moon % on previewed days, RAIN cell cut off, 4 label overlaps, stale dev server.
