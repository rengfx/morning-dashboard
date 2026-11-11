# Morning Dashboard

Personal morning page for Venice Beach: Hume AM/PM, Venice Pier surf, sun window,
Lakers games, and an animated sky page. Phone-first. Home Screen app.

- **Deploy:** `DEPLOY.md`
- **What it does and why:** `SPEC.md` (rules R1–R17), `DECISIONS.md`
- **Open items:** `BACKLOG.md`
- **Tune:** `config/dashboard.config.js`
- **Test:** `npm test` · **Preview:** `npm run dev` → `http://localhost:8788/?fixture=2026-11-01-sun-real`

No packages, no build step. Cloudflare Pages serves `public/` and runs `functions/`.
