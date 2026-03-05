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

**v0.2 database is SQLite** at `data/eventbiz.db` via Prisma ORM. The `data/` directory is gitignored. After `npm install`, run `npx prisma migrate dev` to create/update the database, then `node lib/seed.js` to initialize default settings and migrate any existing JSON data.

**Prisma 7 adapter pattern:** PrismaClient requires `@prisma/adapter-better-sqlite3` with an explicit `file:` URL pointing to `data/eventbiz.db`. See `lib/db.ts` for the initialization pattern.

**v0.1 CLI scripts** (`src/`) still use the JSON file database at `data/events.json`. The v0.2 web app (`app/`, `lib/`) uses SQLite. They operate independently.

**Screenshots** are saved to `data/screenshots/`. Check these to verify form fill accuracy on new event sites.

**Do not auto-submit forms** during testing. The apply engine fills and screenshots but does not click submit buttons unless explicitly requested.

**Next.js 16 removed `next lint`** — use `npm run lint` which calls `eslint app lib` directly.

## File responsibilities

### v0.1 CLI (JavaScript)

| File | Responsibility |
|------|----------------|
| `src/config.js` | Company profile, scoring weights, event sources — single source of truth |
| `src/db.js` | JSON database CRUD — events, status tracking, deduplication |
| `src/scout.js` | Event discovery scrapers — one function per source |
| `src/score.js` | Scoring algorithm — pure function, no side effects |
| `src/apply.js` | Application engine — form detection, field mapping, auto-fill, CAPTCHA detection |
| `src/export.js` | CSV exporter for Google Sheets review |

### v0.2 Web App (TypeScript)

| File | Responsibility |
|------|----------------|
| `lib/db.ts` | Prisma client singleton (SQLite via better-sqlite3 adapter) |
| `lib/scoring.ts` | Scoring algorithm — pure function, ported from v0.1 |
| `lib/automation/form-filler.ts` | Form detection, field mapping, auto-fill — ported from v0.1 apply.js |
| `lib/automation/photo-uploader.ts` | Photo upload via Playwright setInputFiles |
| `lib/automation/captcha-pause.ts` | CAPTCHA detection |
| `lib/seed.js` | Database seeder — initializes settings, migrates JSON data |
| `app/page.tsx` | Dashboard — stats, top events, deadlines, quick actions |
| `app/events/page.tsx` | Events list — sortable, filterable, with apply/research/skip actions |
| `app/events/[id]/page.tsx` | Event detail — status timeline, notes, apply/status actions |
| `app/settings/page.tsx` | Company profile editor — feeds the auto-filler |
| `app/api/events/route.ts` | GET events (with filters), POST new event |
| `app/api/events/[id]/route.ts` | GET/PATCH/DELETE single event |
| `app/api/apply/route.ts` | POST — trigger Playwright auto-apply for event(s) |
| `app/api/scout/route.ts` | POST — trigger event discovery via Playwright scraping |
| `app/api/settings/route.ts` | GET/PUT company profile settings |
| `prisma/schema.prisma` | Event + Settings data model (SQLite) |

## Key patterns

**Adding a new event source:** Add a `scrapeXxx(browser)` function in `scout.js` that returns an array of event objects. Call it from `main()`. Each event needs at minimum: `name`, `source`, and either `link` or `vendorApplicationUrl`.

**Adding a new field mapping:** For v0.1: add an entry to `FIELD_MAP` in `src/apply.js`. For v0.2: add an entry to `FIELD_MAP` in `lib/automation/form-filler.ts` with regex patterns and the corresponding `Settings` model key.

**Adding a new application type:** Handle it in `applyToEvent()` in `apply.js`. Detect the type (web form, PDF, platform, email), process accordingly, update event status.

## What NOT to do

- Don't store business info (EIN, address, etc.) anywhere except `src/config.js`
- Don't bypass CAPTCHAs or use CAPTCHA-solving services
- Don't auto-submit forms without user confirmation
- Don't hardcode event-specific logic — keep scrapers generic, use the field mapper
- Don't ignore failed applications — log the error, flag the event, move to the next one
