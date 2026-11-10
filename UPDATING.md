# How to update the site (just ask Claude)

Open Claude Code in the `livina-kiwi` folder and say what you want in plain words. Claude reads `CLAUDE.md`, edits the right file, runs the test, and (if you say "publish") pushes it live.

## Things you can say

**Schedule**
- "Add dinner with friends on Tue Nov 17, 7–9pm Singapore time, can text."
- "Here's my week from Nov 16: Mon–Fri class 9–5, gym Tue/Thu 6–7pm…" (a photo of your timetable works too)
- "Lunch on Saturday moved to 12:30–1:20."
- "Mark the airport time as confirmed (not an estimate)."

**Gifts**
- "Set the necklace reveal to Dec 5 at 8am Barcelona time."
- "Add a 5th gift: concert tickets, reveal on her birthday, hint: …"

**Love notes and fun bits**
- "Add these 5 love notes: …"
- "Change the secret word to …"
- "Make the game 45 seconds long."

**Publishing**
- "Publish it." (commit and push, live in about a minute)

## If you want to edit by hand
- Schedule: `schedule.js`. Copy an existing block and change the times. Times are written in the `zone` at the top of the file.
- Gifts: `gifts.js`. Love notes: `notes.js`.
- Check your edit: `node tests/run.js` (or open `tests/test.html`).
- Test a fake "now" locally: open `schedule.html?now=2026-11-13T11:00@Asia/Kolkata`.
