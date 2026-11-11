# Deploy — your steps (about 30 minutes)

Updated 2026-11-11: step 5 is now specific to IONOS.

The app is built and tested. These steps need your accounts, so only you can do them.
Do them in order.

## 1. Publish the Routine calendar (2 min)

Your iCloud calendar `Routine` already holds the weekly Hume events.

1. iPhone: **Calendar → Calendars → (i)** next to `Routine` → turn on **Public Calendar** → **Done**.
2. **(i)** again → **Share Link** → **Copy**.
3. Change `webcal://` at the start to `https://`. This is your `ICS_URL`.
4. Test: open it in a browser. You must see text that starts with `BEGIN:VCALENDAR`.

Keep the link secret. It goes only into Cloudflare in step 4. If it leaks, turn Public
Calendar off and on to get a new link.

## 2. Put the code on GitHub (5 min)

1. github.com → **New repository** → name `morning-dashboard` → **Private** → Create.
2. Unzip this folder on your Mac, then in Terminal inside it:
   ```
   git init && git add . && git commit -m "Morning dashboard"
   git branch -M main
   git remote add origin https://github.com/<you>/morning-dashboard.git
   git push -u origin main
   ```
   (Or drag the files into the GitHub web page with **Add file → Upload files**.)

## 3. Cloudflare Pages (10 min)

1. Make a free account at dash.cloudflare.com.
2. **Workers & Pages → Create → Pages → Connect to Git** → pick `morning-dashboard`.
3. Build settings: **Framework preset: None**. **Build command: (empty)**. **Build output directory: `public`**.
4. **Save and Deploy.** You get `https://morning-dashboard-cdr.pages.dev` (the name `morning-dashboard` was taken) (or a similar name).
   Every later push to `main` deploys again by itself.

## 4. Secret (1 min)

Pages project → **Settings → Variables and Secrets → Add** (Production):

| Name | Type | Value |
|---|---|---|
| `ICS_URL` | Secret | the `https://` link from step 1 |

Then **Deployments → … → Retry deployment** so the secret takes effect.
Check: open `https://<project>.pages.dev/api/today`. `errors` must not list `calendar`.

## 5. Your domain + login (10 min)

Your domain is at **IONOS** (checked 2026-11-11): nameservers `ns1032.ui-dns.*`,
the main site points to an IONOS server, and **email** goes to `mx00/mx01.ionos.com`.
So for the dashboard, do not move the DNS. Add one record at IONOS:

1. Cloudflare: Pages project → **Custom domains → Set up a domain** → `dash.darinwilliams.com`.
   Cloudflare shows a CNAME target (the `<project>.pages.dev` name).
2. IONOS: **Domains & SSL → darinwilliams.com → DNS → Add record → CNAME**.
   Host name `dash`, points to the target from step 1. Save.
3. Back in Cloudflare, wait for the domain to show **Active** (usually minutes, at most a few hours).
4. Login: Pages → **Settings → Variables and Secrets** → add a **Secret** `ACCESS_KEY`
   with a long random value (for example from a password manager). Retry the deployment.
5. On each device, open `https://dash.darinwilliams.com/?key=<ACCESS_KEY>` one time.
   A cookie keeps you logged in for 1 year. Without it, the page shows "Private page."

Do not change the other IONOS records (`@`, `www`, `MX`, `TXT`). Your email and the main
site keep working.

Later (website launch): the website on `darinwilliams.com` itself will need the whole DNS
on Cloudflare (Cloudflare Pages needs that for the bare domain). That move must copy the
MX and SPF records so email keeps working. Plan it with the website, not now.

## 6. Phone app (1 min)

1. On the iPhone, open `https://dash.darinwilliams.com` in **Safari** and log in.
2. **Share → Add to Home Screen → Add.**
3. Open it from the icon. It runs full screen, refreshes when opened, and shows the last
   data if you are offline.

## 7. Check it (5 min)

- Today page loads, `DATA LATE` lines do not show (or say what is late).
- Hume times match your Routine calendar (no `(usual)` on days with events).
- Sky page animates; the slider scrubs.

## Tune later

Change values in `config/dashboard.config.js` (surf thresholds, rain limits, windows), push,
and the site updates in about a minute. Run `npm test` before you push.

## Local preview (optional, on your Mac)

```
node dev/server.mjs          # http://localhost:8788
# fixture data, no network:  http://localhost:8788/?fixture=2026-11-01-sun-real&now=06:40
# live data with calendar:   ICS_URL='https://…' node dev/server.mjs
npm test                     # 6 fixtures + 37 checks
```
