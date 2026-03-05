# EventBiz — Agent Instructions

## Project overview

Vendor operations platform: discovers events, auto-fills vendor applications via Playwright, tracks application pipeline. Built for Straight Ahead Beauty (hair care products sold at live events).

See `CLAUDE.md` for full business context, architecture decisions, and scoring algorithm.
See `README.md` for architecture diagrams, tech stack, and competitive landscape.

## Build and run

```bash
npm install
npx playwright install chromium

# CLI tools (v0.1)
npm run scout           # Scrape event sources
npm run score           # Re-score all events
npm run export          # CSV for Google Sheets
npm run apply -- --list # List events ready for application
npm run apply -- --batch # Batch auto-fill all applications

# Web app (v0.2)
npm run dev             # Next.js dev server
npm run build           # Production build
npm run test            # Vitest
npm run lint            # ESLint
```

## Code style

- ES modules (`"type": "module"`)
- TypeScript for web app code (v0.2), JavaScript for CLI scripts (v0.1)
- Functional style preferred — pure functions for scoring, mapping, field detection
- No classes unless genuinely needed
- Async/await over raw promises
- Error handling: never crash silently. Log failures, flag events as needing attention, continue batch processing.

## Cursor Cloud specific instructions

**Playwright requires a real browser.** Headless Chromium must be installed (`npx playwright install chromium`). This works in Cloud Agent VMs.

**Testing auto-fill against live websites:** The apply engine hits real websites. Use `headless: true` for automated testing. Only switch to `headless: false` when demonstrating CAPTCHA pause behavior.

**Database is a JSON file** at `data/events.json`. The `data/` directory is gitignored. Create it with `mkdir -p data` before running commands.

**Screenshots** are saved to `data/screenshots/`. Check these to verify form fill accuracy on new event sites.

**Do not auto-submit forms** during testing. The apply engine fills and screenshots but does not click submit buttons unless explicitly requested.

## File responsibilities

| File | Responsibility |
|------|----------------|
| `src/config.js` | Company profile, scoring weights, event sources — single source of truth |
| `src/db.js` | JSON database CRUD — events, status tracking, deduplication |
| `src/scout.js` | Event discovery scrapers — one function per source |
| `src/score.js` | Scoring algorithm — pure function, no side effects |
| `src/apply.js` | Application engine — form detection, field mapping, auto-fill, CAPTCHA detection |
| `src/export.js` | CSV exporter for Google Sheets review |

## Key patterns

**Adding a new event source:** Add a `scrapeXxx(browser)` function in `scout.js` that returns an array of event objects. Call it from `main()`. Each event needs at minimum: `name`, `source`, and either `link` or `vendorApplicationUrl`.

**Adding a new field mapping:** Add an entry to `FIELD_MAP` in `apply.js` with regex patterns that match the form label and the corresponding `COMPANY` field value.

**Adding a new application type:** Handle it in `applyToEvent()` in `apply.js`. Detect the type (web form, PDF, platform, email), process accordingly, update event status.

## What NOT to do

- Don't store business info (EIN, address, etc.) anywhere except `src/config.js`
- Don't bypass CAPTCHAs or use CAPTCHA-solving services
- Don't auto-submit forms without user confirmation
- Don't hardcode event-specific logic — keep scrapers generic, use the field mapper
- Don't ignore failed applications — log the error, flag the event, move to the next one
