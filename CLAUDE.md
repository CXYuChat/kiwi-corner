# Kiwi Corner (mywifelivina.com)

A gift site for Livina (Barcelona) from Chengxuan (Singapore). Plain HTML/CSS/JS, no build step, hosted on GitHub Pages at mywifelivina.com.

## Files
- `schedule.js`: Chengxuan's week (nested blocks → children) + Livina's school template + `expectBothFree` for the test. **Most edits happen here.**
- `gifts.js`: "Coming up" presents. `reveal` is Barcelona time.
- `notes.js`: love notes the mascot says.
- `time.js`: time-zone math (Intl + IANA zones, never hard-coded offsets) and the schedule model (status, both-free windows).
- `common.js`: secret-word gate ("kiwi"), mascot/slice SVG, confetti. `home.js`, `schedule-page.js`: page logic. `styles.css`: everything visual.
- `tests/run.js` (Node) and `tests/test.html` (browser) run `tests/check.js`.

## Rules when updating
- Write times as `"YYYY-MM-DDTHH:MM"` in `SCHEDULE.zone`; append `@Zone/Name` for another zone. status: `busy` | `text` | `free`; `estimated: true` = dashed; `tag: "mun"` = cap on mascot.
- For a new week: replace `myBlocks`, update `zone`/`city`, `locations`, `coverage` (gaps inside count as free), `homeAt`, `messages`, and recompute `expectBothFree`.
- Always run `node tests/run.js` after editing and make it pass.
- Local test mode (never touches the real Firebase data): open `http://localhost:8765/login.html?demo=1`, set `localStorage['kiwi-session']` to `wifey` or `admin`; `?demo=0` turns it off. Only works on localhost.
- Preview locally with `?now=2026-11-13T11:00@Asia/Kolkata` (only works on localhost/file://, so gifts can't be peeked at online).
- Privacy: public site. No hotel names, flight numbers, school names, full names or emails.
- Publish: bump `version.json` (e.g. "2026-11-12.1") so open copies auto-refresh, then commit and `git push` to `main`; GitHub Pages redeploys in ~1 minute.
