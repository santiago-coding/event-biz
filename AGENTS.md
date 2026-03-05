# EventBiz — Agent Instructions

## Project overview

Vendor operations platform that discovers consumer events at convention centers nationwide, auto-fills vendor applications via Playwright, and tracks the application pipeline. Built for Straight Ahead Beauty (hair care products sold at live events). The primary workflow is date-based: user picks a month, sees all relevant events, selects which to apply to, app fills applications in batch, user reviews and submits.

See `CLAUDE.md` for full business context, architecture decisions, and scoring algorithm.
See `README.md` for architecture diagrams, tech stack, and competitive landscape.

## Build and run

```bash
npm install
npx playwright install chromium

# Web app
npm run dev             # Next.js dev server on localhost:3000
npm run build           # Production build
npm run test            # Vitest
npm run lint            # ESLint (eslint app lib)

# Database
npm run db:migrate      # Prisma migrate dev
npm run db:seed         # Seed default settings + migrate JSON data

# Legacy CLI tools (v0.1 — uses JSON database, independent of web app)
npm run scout           # Scrape event sources
npm run score           # Re-score all events
npm run export          # CSV for Google Sheets
npm run apply -- --list # List events ready for application
npm run apply -- --batch # Batch auto-fill all applications
```

## Code style

- ES modules (`"type": "module"`)
- TypeScript for web app code (`app/`, `lib/`), JavaScript for legacy CLI scripts (`src/`)
- Functional style preferred — pure functions for scoring, mapping, field detection
- No classes unless genuinely needed
- Async/await over raw promises
- Error handling: never crash silently. Log failures, flag events as needing attention, continue batch processing.

## Cursor Cloud specific instructions

**v0.2 database is SQLite** at `data/eventbiz.db` via Prisma ORM with `@prisma/adapter-better-sqlite3`. After `npm install`, run `npx prisma migrate dev` then `node lib/seed.js` to initialize.

**Prisma 7 adapter pattern:** PrismaClient requires the better-sqlite3 adapter. See `lib/db.ts`.

**Dev server port conflicts:** Turbopack can crash if stale `.next` state exists. Fix: `rm -rf .next` and kill lingering processes before restarting.

**Next.js 16 removed `next lint`** — use `npm run lint` which calls `eslint app lib` directly.

**Playwright requires headless Chromium** — `npx playwright install chromium` works in Cloud Agent VMs.

**Do not auto-submit forms** during testing.

**Screenshots** saved to `data/screenshots/`.

## File responsibilities

### Web App (TypeScript)

| File | Responsibility |
|------|----------------|
| `lib/db.ts` | Prisma client singleton (SQLite via better-sqlite3 adapter) |
| `lib/scoring.ts` | Lightweight scoring — vendor count, cash-and-carry, indoor, weekend |
| `lib/automation/form-filler.ts` | Form detection, field mapping, auto-fill via Playwright |
| `lib/automation/photo-uploader.ts` | Photo upload via Playwright setInputFiles |
| `lib/automation/captcha-pause.ts` | CAPTCHA detection |
| `lib/seed.js` | Database seeder — initializes settings, migrates JSON data |
| `app/page.tsx` | Dashboard — date picker entry point, monthly event view |
| `app/events/page.tsx` | Events list — date-filtered, with batch select and apply |
| `app/events/[id]/page.tsx` | Event detail — status timeline, notes, apply/status actions |
| `app/settings/page.tsx` | Company profile editor — feeds the auto-filler |
| `app/api/events/route.ts` | GET events (with date range filter), POST new event |
| `app/api/events/[id]/route.ts` | GET/PATCH/DELETE single event |
| `app/api/apply/route.ts` | POST — trigger Playwright auto-apply for event(s) |
| `app/api/scout/route.ts` | POST — trigger venue calendar scraping |
| `app/api/settings/route.ts` | GET/PUT company profile settings |
| `prisma/schema.prisma` | Venue + Event + Settings data models |

### Legacy CLI (JavaScript — v0.1)

| File | Responsibility |
|------|----------------|
| `src/config.js` | Company profile, scoring weights — legacy, replaced by Settings table in v0.2 |
| `src/db.js` | JSON database CRUD — legacy |
| `src/scout.js` | Legacy scrapers (25 state fairs) — replaced by venue-based discovery |
| `src/score.js` | Legacy scoring — replaced by lib/scoring.ts |
| `src/apply.js` | Legacy apply engine — logic ported to lib/automation/ |
| `src/export.js` | CSV exporter — still works against JSON database |

## Key patterns

**Venue-based discovery:** The app discovers events by scraping convention center calendars, not by searching event directories. This catches events like the Bodacious Bazaar that wouldn't appear on 10times.com but ARE on the Hampton Roads Convention Center calendar.

**Event analysis:** After discovering an event on a venue calendar, the app visits the event's own website to extract: vendor count, cash-and-carry signals, vendor application URL, booth pricing, event description.

**Application preparation:** When user clicks Apply, the app visits the vendor application URL and either fills a web form (Playwright), drafts an email, or flags it for manual handling. Applications go to a "ready" state for user review before submission.

**Adding a new venue:** Add a record to the Venue table with name, state, city, calendarUrl. The scraper will include it on the next run.

**Adding a new field mapping:** Add an entry to `FIELD_MAP` in `lib/automation/form-filler.ts` with regex patterns and the corresponding Settings model key.

## What NOT to do

- Don't store business info anywhere except the Settings table (editable via /settings page)
- Don't bypass CAPTCHAs or use CAPTCHA-solving services
- Don't auto-submit forms without user confirmation
- Don't hardcode event-specific logic — keep scrapers generic
- Don't ignore failed applications — log the error, flag the event, move to the next one
- Don't over-engineer scoring — there aren't thousands of events per month, user reviews the list themselves
