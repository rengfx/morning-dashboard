# Decisions (settled — do not reopen)

| # | Date | Decision |
|---|---|---|
| D1 | 2026-10-24 | Personal only. No work calendar, energy, top 3, or projects. Page is read-only. |
| D2 | 2026-10-24 | Data: Door 2 — live calendar and weather; no user-edited data file. |
| D3 | 2026-10-24 | Visual direction: B2 "Instrument Panel" (dark, mono, data first). |
| D4 | 2026-10-24 | Today order is by start time. Sections: Hume AM, Surf, Sun, Lakers, Hume PM. |
| D5 | 2026-10-24 | Surf and Sun show only on Saturday and Sunday. |
| D6 | 2026-10-24 | Surf score: Door 3 (swell, period, direction, tide, wind), thresholds in config. Spot: Venice Pier. |
| D7 | 2026-10-24 | Sun window = 2 hours centered on the UV peak. |
| D8 | 2026-10-24 | Lakers section only on game days, weekend or weekday. |
| D9 | 2026-10-24 | Sky page: 00:00–24:00 local, 12 s loop, camera locked on Venice, dashed Venice→Moon view line, moon-height histogram with slider. Planets move on the same 24 h clock with true motion. |
| D10 | 2026-10-24 | Removed from Sky: "Where to look tonight", Moon distance bar, camera toggle, caption under the orbit chart. |
| D11 | 2026-10-24 | Hosting: subdomain of darinwilliams.com with a server function that holds secrets. Cloudflare Pages. |
| D12 | 2026-10-24 | Hume windows come from the published "Routine" iCloud calendar (ICS); defaults when no event. |
| D13 | 2026-10-24 | Lakers source: public ICS feed `nbaschedules.com/los-angeles-lakers/schedule.ics`. Cells: TIP-OFF, ENDS, WHERE, TV. No record or score. |
| D14 | 2026-10-31 | No packages and no build step: own ICS reader (`lib/ics.js`) and astronomy (`public/js/astro.js`), both tested. |
| D15 | 2026-10-31 | One weather source: Open-Meteo. Other sites differed by up to 16 °F on the same hour. |
| D16 | 2026-10-31 | Phone app = Home Screen web app (manifest, icons, service worker). No App Store app. |
| D17 | 2026-10-31 | Rules R9–R17 added from real weekends (Oct 25, Oct 31, Nov 1): no-window surf order, dark tolerance, Lakers overlap, NOW / PASSED, near miss, rain advisory, DST banner, rain later. |
| D18 | 2026-10-31 | Login: Cloudflare Access if DNS moves to Cloudflare; else the built-in key gate (`ACCESS_KEY`). |
| D19 | 2026-11-11 | Dashboard first, website later. Domain DNS stays at IONOS for now: CNAME `dash` → Cloudflare Pages, login by key gate (`ACCESS_KEY`). The full DNS move to Cloudflare waits for the website launch and must copy MX/SPF. |
| D20 | 2026-11-11 | Public `/api/health` shows only source status, counts, and whether secrets are set (no content). Everything else stays behind the key gate. Used to verify deploys. |
| D21 | 2026-11-11 | Day navigation: swipe left/right (and ‹ › buttons, arrow keys) moves one day; range yesterday to +6 days (forecast limit). Only today shows NOW / PASSED. Tap the date to return to today. Neighbour days preload. |
| D22 | 2026-11-11 | HUME classes (Door 2): all public classes that start inside each Hume window, with open spots, from the public Arketa schedule feed (no login). Not an official API: on failure the list hides and DATA LATE shows. No calendar (ICS) feed for now. |
| D23 | 2026-11-11 | HUME classes show only if they fit the window (start ≥ window start, end ≤ window end). On iPhone/iPad the link opens the HUME app's App Store page (Open button); the app has no direct link (no universal links; URL scheme unknown). |
| D24 | 2026-11-12 | Hume windows: weekday PM default 17:30–21:00; weekends one all-day block 07:00–19:00 (open hours), Hume event times ignored on weekends. |
| D25 | 2026-11-12 | Basketball (Routine event) replaces Hume PM; court weather from Live Oak Park. A cancelled game = delete that week's event (WhatsApp cannot be read). |
| D26 | 2026-11-12 | Sun window 90 min. Surf shows water temperature. All charts get a faint grid and peak dots. |
| D27 | 2026-11-12 | Sky notes: only notable events, 4-day look-ahead, on Today and Sky pages; cloudy → grey with label (not hidden). Planets tonight list. Moon–planet limit 7° (published Nov 20 Moon–Saturn gap 5.7°). |
| D28 | 2026-11-12 | Pier view on the Sky page: 360° turn, tonight + event times + slider. Horizon skyline is approximate. |
| D29 | 2026-11-12 | Where to look: tap a planet → 3D pier scene (SVG, orthographic, camera behind-left, drag to orbit) + direction in words with fists (1 fist ≈ 10°). |
| D30 | 2026-11-12 | Where-to-look scene shows the last sunset point (not the current sun) as an orientation mark, with left/right offset in words. |
| D31 | 2026-11-13 | Weekday: Hume morning block hides once passed (today only). "I went" marks live in a HUME LOG line (so a hidden morning can still be marked), weekly count Mon–Sun, stored per browser (localStorage). Cross-device sync would need Cloudflare KV. |
| D32 | 2026-11-13 | Walk-home rain note only on blocks ending at Hume closing (weekday 21:00, weekend 19:00); 20-min walk window; thresholds = Hume rain limits (20 % / 40 %). |
| D33 | 2026-11-13 | HUME app link = `humeprojects://` (button 1 on the test page opened the app on Darin's iPhone). Replaces the App Store link in D23. |
| D34 | 2026-11-13 | Weekday Hume block marked WENT is hidden; the HUME LOG toggle stays to undo. Weekend all-day block is not hidden. |
| D35 | 2026-11-13 | Clearing a WENT mark by hand always brings the block back (overrides the passed-morning hide). RESET DAY in the HUME LOG clears that day. |
| D36 | 2026-11-13 | Where-to-look LIVE mode: now + 30 s refresh, paused while the page is hidden. |
| D37 | 2026-11-13 | Hill line = terrain data (Door 2), built once into a static table (no runtime calls). No panorama photo for now. Flat pier view uses true heights (same scale as the sky); 3D scene ridge ×2. |
| D38 | 2026-11-14 | Horizon table complete: NW sector 252–357° measured (Santa Monica Mtns up to 2.19° at 330°). No provisional values left. |
| D39 | 2026-11-14 | First NBA tip-off line from ESPN's public scoreboard (unofficial but keyless and fast; 156 ms). Lakers ICS (D13) stays for Lakers detail. |
| D40 | 2026-11-14 | NBA line is a native expand/collapse list (details/summary) with live score from the same ESPN call. Started HUME classes are removed (not dimmed). |
| D41 | 2026-11-14 | Weekend HUME LOG: two visit toggles (day, day2). |
| D42 | 2026-11-14 | "Low UV" = UV < 3 (WHO: low; protection usually not needed). Shown as LOW UV FROM in the Sun section; sunscreen window ends there. |
| D43 | 2026-11-14 | SPORTS line: NBA first tip stays the lead; Rams + Dodgers from ESPN NFL/MLB scoreboards in the expanded list. SeatGeek ticket links (team pages) for Lakers and Clippers home games only. |
| D44 | 2026-11-14 | UCLA FB + BB added via ESPN team schedules. Ticket rule = home game or followed team at an LA venue, for all followed teams (Lakers, Clippers, Rams, Dodgers, UCLA). League-scoped ticket keys. |
| D45 | 2026-11-14 | Rollerblade section: evening slots after sunset to 22:00; dry, ≥55°F, wind <15 mph, path dry 3 h; calories above rest with MET 7.5. Hidden on Basketball evenings. Weight to be set. |
| D46 | 2026-11-14 | Rollerblade limits set by Darin: ≥ 60 °F, wind < 10 mph, latest start 20:30; starts every 30 min. Replaces the 55 °F / 15 mph / 22:00 starting values in D45. |
| D47 | 2026-11-14 | Body weight stays on the phone (localStorage via ?w=), never in the repo or a server secret. Daily refresh = iPhone Shortcut from Apple Health (optional). |
| D48 | 2026-11-14 | Weight check-in is weekly; older than 7 days → "UPDATE WEIGHT" note. Shortcut runs weekly. |
| D49 | 2026-11-15 | Lakers TV: ESPN team-schedule broadcasts decide on-plan (Spectrum SportsNet) vs national-only (✗). ESPN lists Spectrum on some national games too (NBC, NBA TV, ESPN) — shown as "✓ ALSO …"; confirm with real games. |
| D50 | 2026-11-15 | Bug fix: the ocean rain advisory was only inside the weekend Surf section (low on the page, no end time). Now a top banner on every day with the end time. |
| D51 | 2026-11-15 | NBA app link = nba.com/games?date= (universal link). A single-game link needs the NBA game ID (only in the full-season file, too heavy for the server); team pages are not universal links. |
| D52 | 2026-11-15 | JEFIT days Sat/Mon/Wed. Mapping assumed from the earlier JEFIT chat: Mon upper, Wed full body, Sat legs+abs (was Fri). Confirm with Darin. |
| D53 | 2026-11-15 | JEFIT program is the 3-day full body (Darin): Day 1/A Sat, Day 2/B Mon, Day 3/C Wed. Replaces the D52 mapping (upper / full / legs+abs was the old program). |
| D54 | 2026-11-15 | JEFIT exercise list is copied into config by hand (read from jefit.com, plan '3 Day Full Body'). No live JEFIT link: no public API, and the plan changes rarely. |
| D55 | 2026-11-16 | A Hume block marked WENT shrinks to one line on every day (Darin, voice + 'Go'). Replaces D-R30 hide-on-weekdays; weekend all-day block shrinks on VISIT 1, so VISIT 2 stays one tap away in the HUME LOG. |
| D56 | 2026-11-18 | Pressure flag uses the 24-h change, not the level: FLAG ≥ 5 hPa, WATCH ≥ 3 hPa. Start values; real Venice week 11–18 Nov had swings of −5.2, +7.5, −3.7, +6.1 hPa while Darin felt 'buzzy'. Tune from his notes. No health detail in the repo beyond 'MCAS watch' text he asked for. |
| D57 | 2026-11-18 | Rollerblade only on non-workout days (Darin): not on JEFIT days or Basketball evenings. |
| D58 | 2026-11-18 | Work pressure point = Torrance city centre, Mon–Fri 08:30–17:00 as Darin said (Thursday's later hours not used). Same 3/5 hPa levels. |
| D59 | 2026-11-18 | Whole day as a Gantt (Darin's pick): one row per item in a 05–23 window; replaces the one-lane strip and its legend. |
| D60 | 2026-11-18 | Hide (✕) applies to Surf and Rollerblade only, per date, in localStorage; shrinks to one line like WENT, never deletes. |
| D61 | 2026-11-18 | Torrance pressure is a 2nd location in the Venice forecast request, not its own request. Reason: a Pages Function allows 6 open outgoing connections; the 14th request waited in the queue and its 8 s timer ran out (bug found live). |
| D62 | 2026-11-18 | Correction to D61: the real cause of the timeouts is that a Cloudflare request to Open-Meteo with no cached copy can take longer than 8 s (same URL: 0.1 s from a browser, 58 ms from the edge cache once filled). Forecast timeout is now 25 s; `weatherMs` in /api/today shows the time. This also explains the old intermittent 'weather: timeout'. Keeping Torrance in the same request (D61) is still right: one request, one cache entry. |
| D63 | 2026-11-18 | Door 3 for class booking links (Darin): per-class web Sign Up links now; app link only if a guessed `humeprojects://` path opens the class on his phone. Arketa's apple-app-site-association has no applinks, so web links never open the app. |
