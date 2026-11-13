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
