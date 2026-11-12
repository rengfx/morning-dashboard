# Morning Dashboard — Build Spec

Owner: Darin Williams · Status: **built, not yet deployed** · Updated: 2026-10-31

A personal, phone-first morning page. One screen tells me, in time order, what today
holds outside work: Hume sessions, surf, sun, and Lakers games. A second page shows
the Sun, Moon, and planets from Venice Beach.

Design source of truth: the "Morning Dashboard Options" canvas (B2 artboards).
Static copies are in `design/` (see section 9). The copies hold **sample data only**.

---

## 1. Scope

**In scope**
- Page 1 `/` — **Today** (instrument panel, B2 style).
- Page 2 `/sky.html` — **Sky** (animated Earth–Moon view + solar system).
- One server function that fetches, caches, scores, and returns one JSON.
- Private access on a subdomain of darinwilliams.com.

**Out of scope (settled — do not add)**
- Work calendar, energy rating, top 3 tasks, personal projects.
- Any write path. The page is read-only. There is no `today.json` for user input.
  (This supersedes the "today.json / saves taps" arrows on the old data-flow artboard.)
- Real 3D / WebGL.
- An App Store app. The phone app is the web page added to the Home Screen (D16).

## 2. Pages

### 2.1 Today (`/`)

Layout, top to bottom:

1. **Header** — `‹ SUN 25 OCT ›` · `HH:MM` (or `TOMORROW` / `YESTERDAY` / `IN N DAYS`) · `MOON n%` link to Sky. Dots under it show the day in the range.
   **Day navigation (D21):** swipe left = next day, swipe right = previous day (horizontal move > 60 px and > 1.5 × vertical). Same with ‹ › and the arrow keys. Range −1 … +6 days. `/api/today?d=<offset>`. Tap the date to go back to today. A failed day keeps the current page and shows a short note.
2. **"Today in order" strip** — 05:00–22:00 time line. One colored, numbered block per
   section that shows today. Dark hours are shaded. Legend under it.
3. **Sections**, sorted by start time (rule R1). Each section has the same shape:
   - title row: `N · NAME` left, context right (window time, opponent, etc.)
   - one large status line (30 px display font)
   - a row of 3–4 cells (label / value / ✓ ~ ✗ mark with text, never color alone)
   - one chart (except Lakers)

Section types:

| Type | Shows when | Start time used for sorting | Block color |
|---|---|---|---|
| Hume AM | every day (R3) | AM window start | `#7DD3A0` |
| Surf | Sat + Sun only (R2) | first good window start; with no window, just after Hume AM (R9) | `#7FC8F8` |
| Sun | Sat + Sun only (R2) | sun window start | `#FF8A65` |
| Lakers | game day only (R4) | tip-off | `#FDB927` |
| Hume PM | every day (R3) | PM window start | `#7DD3A0` |

**Hume section (AM and PM)**
- Status: `GO` (green) / `GO BY HH:MM` (amber) / `RAIN` (coral) / `WINDY` (amber) — rule R6; `GO AFTER HH:MM` (green) / `CONFLICT` (coral) — rule R11; ` · NOW` added inside the window (R12); one grey `PASSED` line after the window (R13).
- Cells: RAIN (max % in window, with `@HH:MM` if it gets bad) · WIND (mph) · TEMP (°F) · LIGHT (sunrise/sunset, `~ DARK` if the window is partly dark).
- One-line advice, for example "Dry. Wear a layer." / "Rain near 19:00."
- Chart: AM 05:00–11:00, PM 16:00–22:00. Window box, dark shading, rain bars
  (hourly precip probability), temperature line, a dashed "go by" line when R6 sets one.
  If a Lakers game starts inside the chart range, shade from tip-off and label `LAL HH:MM`.

**Surf section (Venice Pier)**
- Status: first good window, for example `10:00–11:30`, with "first good window". If none: `NO GOOD WINDOW`, plus `Best try HH:MM–HH:MM · 8/10` when R14 finds one.
- Red `RAIN ADVISORY` banner when R15 applies.
- Cells: SWELL (ft) · PERIOD (s + direction) · TIDE (ft + ↑/↓) · WIND (mph + dir), each GOOD / OK / BAD for the window (rule R5).
- Chart 06:00–22:00: tide curve, wind line (dashed), daylight band, first window as a filled band labeled `GO`, later windows as dashed outlines labeled `2nd`, a "now" line.
- The swell height shows only in the cell. No large swell number.

**Sun section**
- Status: sun window `HH:00–HH:00` + `UV n@HH:MM` (rule R7).
- Chart 06:00–20:00: temperature line, UV line (dashed), UV 3 "sunscreen" guide line, sun window band.
- Label format: temperature `68°@14:00`, UV `5@13:00`.
- Cells: SUNSCREEN (time range UV ≥ 3) · SUNRISE · SUNSET.
- If a Lakers game starts inside or at the end of the sun window, add `ENDS AT TIP-OFF` to the title row.

**Lakers section**
- Title row: `N · LAKERS` · `@ UTAH · AWAY` or `VS PORTLAND · HOME`.
- Status: tip-off `HH:MM` + `at Jazz · Delta Center` / `vs Trail Blazers · Crypto.com Arena`.
- Cells: TIP-OFF · ENDS (tip-off + 2 h 30, shown as `~HH:MM`) · WHERE (`HOME` / `AWAY`) · TV (national network, else `LOCAL`).
- No record, score, or win chance (not in the feed; see BACKLOG B6).
- One line that relates it to the next/previous section, for example "Ends ~1 h before Hume PM." or "Starts 30 min after Hume PM ends."

### 2.2 Sky (`/sky`)

1. **Header** — `SKY` · `← TODAY`.
2. **Earth + Moon, 3D view** (one SVG, animated):
   - Timeframe **00:00 → 24:00 local**, **12 s loop**, loops at midnight.
   - **Camera locked on Venice**: the scene turns so Venice always faces the viewer. The Sun glow, Earth's shadow, the day/night line, and the orbit phase marks (NEW, 1ST QTR, FULL, LAST QTR) move around Earth.
   - Earth: ocean, simplified continents, ice cap, latitude lines, cloud layer, limb shading, day/night shading, atmosphere ring, tilted axis.
   - Venice dot on Earth. **Dashed view line from Venice to the Moon when the Moon is above Venice's horizon.** The dot turns amber when the Moon is up.
   - Moon on a tilted elliptical orbit. It is drawn behind Earth on the far half and in front on the near half, slightly larger when near.
   - Amber dashes = Moon path for the day; solid amber = path so far.
   - Readout: `SAT 24 OCT · HH:MM · SUN–MOON 113°` and `MOON UP|DOWN OVER VENICE · 72% WAXING`.
   - **No caption text under the chart.**
3. **Moon height histogram** under the chart: 96 bars (15 min each) for the day. Bar height = Moon altitude over Venice (above horizon only). Amber = Moon in dark sky, grey = Moon in daylight, dark bands = night. A playhead moves with the animation.
   - **Slider** (`<input type=range>`) scrubs the time. Dragging pauses. PLAY / PAUSE button. 6 time labels (every 4 h).
4. **Earth in the solar system** (one SVG, same 24 h clock):
   - Tilted top view showing most of Earth's orbit; Sun near center-left; July part may crop at the left edge.
   - Mercury, Venus, Earth, Mars at **true heliocentric positions for the time**; Moon dot next to Earth at its true elongation; Saturn as an edge arrow with its distance.
   - Earth's path for the day as an amber segment; month marks on Earth's orbit (JAN, APR, JUL, OCT).
   - Live Venus–Earth distance label in AU.
   - Readout: `EARTH MOVED x.xM KM OF 2.6M TODAY`.
   - Orbit radii are not to scale (label says so). Motion is true motion (decision D9).
5. **Phase cells**: next FULL · next NEW · DARK SKY range (days around new moon).

Removed and not to come back: "Where to look tonight" chart, Moon distance bar, camera toggle.

## 3. Rules

- **R1 Order.** Sections on Today are sorted by start time (ascending). Ties: Hume before others.
- **R2 Weekend only.** Surf and Sun show only on Saturday and Sunday (local date).
- **R3 Hume windows.** Read today's events from the routine ICS. An event whose title matches `config.hume.match` (default `/hume/i`):
  first one starting before 12:00 = AM window, first one at/after 12:00 = PM window.
  If no event: use `config.hume.defaults` (AM 06:30–08:30, PM 17:30–19:30). Always show both sections; mark a default window `(usual)` in the title row.
- **R4 Lakers.** Show only if a Lakers game tip-off is on today's local date. Ends = tip-off + 150 min.
- **R5 Surf score (Door 3).** Score each 30 min slot from sunrise to sunset (first slot = sunrise rounded up to :00/:30). 5 factors from `config.surf` thresholds: GOOD = 2, OK = 1, BAD = 0.
  - Swell height, swell period, swell direction, tide height (MLLW, cosine curve between hi/lo points), wind speed (wind from the offshore sector `offshoreDirDeg` counts one level better, max GOOD). Hourly values are interpolated linearly to the slot start.
  - Cells: SWELL = height; PERIOD = period + direction (show the lower of the two levels); TIDE; WIND.
  - A slot is "surfable" if no factor is BAD and the total ≥ `config.surf.minScore` (default 9 of 10).
  - A window = consecutive surfable slots with length ≥ `config.surf.minWindowMin` (default 60), inside `config.surf.earliest`/`latest` (default sunrise/sunset).
  - First window = earliest. Others = "later". The cells show the factor values at the first window's start.
- **R6 Hume status.** Use hourly precip probability inside the window.
  - All hours < `rainOk` (default 20 %) → `GO`.
  - First hour ≥ `rainNo` (default 40 %) is inside the window and at least 30 min after its start → `GO BY` (that hour − 30 min, rounded down to :00/:30). Example: 40 % at 19:00 → `GO BY 18:30`.
  - Else if any hour ≥ `rainNo` → `RAIN`.
  - Wind ≥ `windNo` (default 15 mph) → mark WIND ✗ and downgrade one level. Travel mode is open (D11); thresholds live in config.
  - TEMP `~ COOL` below 58 °F, `~ COLD` below 55 °F. LIGHT `~ DARK` if any part of the window is before sunrise or after sunset.
- **R7 Sun window (Door 2 variant chosen).** Sun window = 2 hours centered on the hour of max UV index (start = peak hour − 1 h). Hide the Sun section if max UV < 1.
- **R8 Sky clock.** Animation time t ∈ [00:00, 24:00) local for today. All Sky graphics use the same t.

Added 2026-10-31 from two weekends of real data:

- **R9 No-window surf order.** A surf section with no window sorts just after Hume AM (not at 06:00).
- **R10 Dark tolerance.** LIGHT is `~ DARK` only if the window starts more than `hume.darkToleranceMin` (15) before sunrise or ends more than 15 min after sunset.
- **R11 Lakers overlap.** If a game overlaps a Hume window: game end ≤ window end − 30 min → `GO AFTER <game end>`; else `CONFLICT` with a suggested slot ending 15 min before tip-off (keep the window start if that leaves ≥ 60 min, else shift the whole window earlier). Applies only to `GO` / `GO BY`.
- **R12 Now.** A section whose window holds the current time shows ` · NOW` (Lakers: ` · LIVE`).
- **R13 Passed.** A section whose window ended collapses to one grey line.
- **R14 Near miss.** With no surf window, show the first run that scores `minScore − 1` with no BAD factor and length ≥ `minWindowMin` as "Best try".
- **R15 Rain advisory.** Rain in the last 72 h ≥ `surf.rainAdvisoryMm` (2.5 mm ≈ 0.1 in) → advisory banner on the surf section (LA County advises no ocean contact for 72 h after rain).
- **R16 DST.** The day before a change: `CLOCKS GO BACK|FORWARD 1 H AT 02:00 TONIGHT`. The day of the change: `STANDARD TIME NOW` / `DAYLIGHT TIME NOW`.
- **R17 Rain later.** Hume advice names the first hour ≥ `rainNo` within 3 h after the window ends ("Rain after 22:00").
- **R18 HUME classes.** Each Hume section lists every public HUME class that fits inside its window (starts at or after the window start and ends at or before the window end): time, name, instructor, length, and OPEN n / FULL · WL n / CLOSED. On today, classes that have started are dimmed. Source: the public Arketa schedule feed (`hume.classes` in config), one request per day shown, cached 60 min. If the feed fails, the list is hidden and `DATA LATE · hume classes` shows; the rest of the page is unchanged. "BOOK ↗" opens the HUME app on iPhone/iPad (through its App Store page, which has an Open button); on other devices it opens the public schedule.
- **R19 Hume windows.** Weekdays: AM from the Routine calendar or 06:30–08:30; PM from the calendar or 17:30–21:00 (close). Weekends: one HUME DAY block 07:00–19:00 (open hours); Hume event times are not used on weekends. Surf, Sun, and Lakers still show as their own windows.
- **R20 Basketball.** A Routine event with "basketball" in the title replaces Hume PM on that day (an afternoon/evening event). The section uses the court's own weather (Live Oak Park, Manhattan Beach). No class list. To show Hume PM again when a game is cancelled, delete that week's Basketball event.
- **R21 Sun window = 90 min** centred on the UV peak. Surf shows sea surface temperature (°F) at the window start (or 08:00).
- **R22 Sky notes.** For the shown day and the next 3: thin crescent after sunset / before sunrise (1.5–15 % lit, ≥ 4° up), full Moon rising within 75 min of sunset, Moon within 7° of a planet, two planets within 2.5° (both ≥ 8° up, Sun ≤ −8°). Repeating events show on their best day only. Cloud ≥ 60 % at that hour → grey "CLOUDY · MAY NOT BE VISIBLE"; 30–59 % → "PARTLY CLOUDY". Nothing qualifies → no section. Today page and Sky page. Sky page also lists planets ≥ 10° in a dark sky tonight.
- **R23 Charts.** Faint grid (hour lines, quarter lines) on every chart; every peak gets a dot with a drop line to the time axis.
- **R24 Pier view.** Sky page: the sky from the end of Venice Pier with real Moon (phase) and planet positions; turn 360° (drag, ◀ ▶, arrow keys); time = tonight (sunset + 1 h), any sky event (turns to face it and rings the objects), or the slider (sunset − 30 min → sunrise + 30 min).
- **R25 Where to look.** Tap a planet or the Moon in the pier view (at that time), or a row in Planets tonight (at its best time): a zoomed-out 3D scene opens with Venice Pier (pointing WSW), you at the end, the sky dome, a ground arrow to face, the height arc, and the sight line. Text: "Face S (181°) and look 57° up, about 6 fists above the horizon at arm's length." Drag to orbit. Not to scale.

## 4. Data sources

| Data | Source | Notes |
|---|---|---|
| Routine calendar (Hume events) | Apple Calendar, public iCloud calendar link (ICS) | URL is a secret (`ICS_URL`). See DEPLOY.md. Lakers games do not need to be in this calendar. |
| Tides | NOAA CO-OPS `datagetter`, station **9410840 (Santa Monica)**, `product=predictions&interval=hilo&datum=MLLW&units=english&time_zone=lst_ldt&format=json` | Hi/lo; interpolate a cosine curve between points. |
| Weather | Open-Meteo forecast, lat 33.985 lon −118.47: hourly `temperature_2m, precipitation_probability, precipitation, uv_index, wind_speed_10m, wind_direction_10m`, daily `sunrise, sunset`, `past_days=3` (for R15) | No key. **The only weather source** (D15): manual checks on Oct 25–Nov 1 showed other sites up to 16 °F apart, so one source is used consistently. |
| Swell | Open-Meteo Marine `https://marine-api.open-meteo.com/v1/marine`, a grid point just off Venice Pier (≈ 33.97, −118.48): hourly `swell_wave_height, swell_wave_period, swell_wave_direction, wave_height`, `length_unit=imperial` | Confirm the unit is feet in the session. |
| Lakers schedule | ICS feed `https://nbaschedules.com/los-angeles-lakers/schedule.ics` (public, no key, `REFRESH-INTERVAL` 1 day) | See 4.1. No scores or records in the feed. |
| Sun, Moon, planets | `public/js/astro.js` (built in, no package), computed **in the page** | Low-precision formulas. Tested: Moon phases within 14 min of a published calendar for Oct–Nov 2026; Venus conjunction, sunrise, altitudes checked. |

### 4.1 Lakers ICS — parsing rules

Observed in the feed on 2026-10-24:
- `SUMMARY` is `"<Away team> at <Home team>"`, sometimes with ` (<TV>)` at the end. Example: `"Portland Trail Blazers at Los Angeles Lakers (NBC / Peacock)"`. Values can have literal double quotes — strip them.
- Home = the team after ` at ` is the Lakers. Opponent = the other team.
- `DTSTART;TZID=<arena zone>` — **times are in the arena's time zone** (Utah game: `TZID=America/Denver:20261025T150000` = 14:00 in Los Angeles). Convert to `America/Los_Angeles`.
- `DTEND` = start + 3 h (a calendar block). Do not use it for "ENDS"; use tip-off + `lakers.gameLengthMin`.
- `LOCATION` = arena name + address with escaped commas (`\,`). Show the arena name only (text before the first `\,`).
- `DESCRIPTION` may start with `National TV: <network>`. If no national TV, show `LOCAL`. Ignore the sponsor line.
- The feed repeats `VTIMEZONE` blocks many times. The parser must tolerate duplicates. (`lib/ics.js` does; tested.)
- A fetch can be cut off. If the file does not end with `END:VCALENDAR`, keep the last good cached copy and add an `errors` entry.
- `fixtures/lakers-sample.ics` holds the two games used in the fixtures, in the same format.

Refresh: server cache 30 min per source (tides and Lakers feed 12 h). The page fetches on load and every 30 min while open.

## 5. Architecture

```
iCloud ICS ─┐
NOAA tides ─┤
Open-Meteo ─┼─► Server function (/api/today) ─► one JSON ─► Today page
Marine     ─┤      fetch · cache · score · sort
Lakers     ─┘      holds ICS_URL
                                      astro.js (in page) ─► Sky page
```

- Recommended host: **Cloudflare Pages + Pages Functions** on `dash.darinwilliams.com`
  (a CNAME works wherever the main site is hosted). Vercel is an equal option if the
  main site already lives there. See DEPLOY.md step 5.
- Secrets only on the server: `ICS_URL`. The Lakers feed is public and needs no secret. Never in page code, never in the repo.
- Access: Cloudflare Access in front of the subdomain (free plan), login by email (one-time PIN or Google). Fallback: long random token in the URL, checked by the function.
- Front end: plain HTML, CSS, and ES modules. Inline SVG charts. **No packages and no build step** (D14).
- Phone app: web app manifest + icons + service worker (offline: shows the last good data). Install with Safari → Share → Add to Home Screen.

**Files**

| Path | What |
|---|---|
| `config/dashboard.config.js` | All thresholds. Edit and push to tune. |
| `lib/score.js` | Rules R1–R18 (pure function). |
| `lib/hume.js` | HUME class feed: URL for one local day, parse, filter to a window. |
| `public/js/skyevents.js` | R22 sky events and planets tonight (pure). |
| `public/js/pier.js` | R24 pier view SVG. |
| `public/js/pier3d.js` | R25 3D where-to-look scene + words. |
| `lib/ics.js` | ICS reader: folding, time zones, weekly repeats, EXDATE, moved events. |
| `lib/fetch.js` | Fetches all sources, builds the scorer input, 72 h rain, DST. |
| `functions/api/today.js` | Cloudflare Pages Function → `/api/today`. |
| `public/` | `index.html`, `sky.html`, `css/`, `js/` (today, sky, charts, astro, time), `manifest.webmanifest`, `sw.js`, `icons/`. |
| `dev/server.mjs` | Local preview. `?fixture=<name>&now=HH:MM` uses fixture data. |
| `test/run.mjs` | Test harness (`npm test`). |
- Time zone: all logic in `America/Los_Angeles`.

## 6. `/api/today` response shape

See `fixtures/*.json` for full examples. Top level:

```json
{
  "date": "2026-10-25",
  "weekday": "SUN",
  "generatedAt": "2026-10-25T06:58:00-07:00",
  "sun": { "rise": "07:10", "set": "18:12" },
  "sections": [
    { "type": "humeAM", "start": "06:30", "end": "08:30", "source": "calendar|default", "status": "GO", "...": "..." },
    { "type": "surf", "start": "10:00", "end": "11:30", "...": "..." },
    { "type": "sun", "start": "12:00", "end": "14:00", "...": "..." },
    { "type": "lakers", "start": "14:00", "end": "16:30", "...": "..." },
    { "type": "humePM", "start": "17:30", "end": "19:30", "...": "..." }
  ],
  "hourly": { "time": [], "tempF": [], "precipPct": [], "uv": [], "windMph": [], "windDir": [] },
  "tide": { "hilo": [ { "t": "10:42", "ft": 0.4, "type": "L" } ] },
  "errors": []
}
```

If a source fails, return the rest and add an entry to `errors`. The page shows a small
`DATA LATE · <source>` tag in the affected section. It never shows a blank page.

## 7. Visual system (from B2)

- Ground `#0A0B0D`, panel `#15171A`, rules `#2B2D31`, text `#ECEAE4`, muted `#A3A29C`, faint `#5B5D62`.
- Accent amber `#F2B35E` (surf/sun windows, warnings). Green `#7DD3A0` (GO, Hume). Coral `#FF8A65` (temperature, ✗). Violet `#B59CFF` (UV). Sky blue `#7FC8F8` (wind, rain). Lakers gold `#FDB927`.
- Fonts: Space Grotesk 700 for dates and status lines; IBM Plex Mono for everything else.
- Phone width 390 (16 px gutters, 358 content). No horizontal scroll. Touch targets ≥ 44 px.
- Every SVG has `role="img"` and an `aria-label` that states what it shows.

## 8. Acceptance checks

1. `fixtures/` tests pass: for each fixture input, the scorer + sorter output matches `expected` (section order, statuses, windows). Run the test harness before reporting done.
2. Sat 2026-10-24 fixture: 4 sections (Hume AM, Surf, Sun, Hume PM). No Lakers.
3. Sun 2026-10-25 fixture: 5 sections in order Hume AM → Surf → Sun → Lakers → Hume PM; Hume PM = `GO BY 18:30`; Sun title has `ENDS AT TIP-OFF`.
4. Tue 2026-10-27 fixture: 3 sections in order Hume AM → Hume PM → Lakers; no Surf, no Sun.
5. With a source forced to fail, the page still renders and shows `DATA LATE`.
5a. Lakers parser on `fixtures/lakers-sample.ics`: Oct 25 → 14:00 LA time, away, opponent "Jazz", arena "Delta Center", TV `LOCAL`; Oct 27 → 20:00, home, "Trail Blazers", "Crypto.com Arena", TV "NBC / Peacock". A copy cut off mid-file must be rejected.
6. Sky: loop length 12 s ± 0.5 s; slider pauses and scrubs; the Venice–Moon line shows only when Moon altitude > 0; Moon phases within 30 min of published times.
9. Real-data fixtures (Oct 25, Oct 31, Nov 1) pass, covering R9–R17.
7. Verify both pages in a browser preview at 390 px width. Include screenshots and load timings in the session report.
8. No secret appears in the page source, the network responses to the browser, or the repo.

## 9. Design files

`design/` holds the canvas artboards as `.dc.html` (Design Component) files:
- `Today-Weekend-Sun25.dc.html` — B2 weekend with Lakers.
- `Today-Weekday-Tue27.dc.html` — B2 weekday with Lakers.
- `Sky.dc.html` — Sky page mock with a sample orbital model (the built page uses real positions from `astro.js`).

They render only inside the canvas editor; read them as layout + style + logic references.
Coordinates in the SVGs are good starting points for chart scales.

## 10. Repo files to keep

- `DECISIONS.md` — settled decisions. Do not reopen them.
- `BACKLOG.md` — open items. Update both files at the end of every session.
