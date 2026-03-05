# EventBiz — AI Assistant Instructions

## Project summary

EventBiz is a vendor operations platform for Straight Ahead Beauty (Milan Beauty LLC), a hair care products company that sells at live events nationwide — state fairs, holiday markets, home shows, Junior League events, and craft shows.

The app discovers events, scores them by fit, auto-fills vendor applications using Playwright browser automation, and tracks the entire pipeline from discovery to completion.

## Business context

**Company:** Straight Ahead Beauty / Milan Beauty LLC
**Owner:** Santiago Martinez
**Product:** Professional hair care and beauty products
**Business model:** Sell at live events (3-day weekends). Bring 4-5 employees. Target $5K/day revenue, ~$3K expenses per event. Employees paid commission (% of sales).
**Best events:** High female attendance, indoor booths, cash-and-carry vendors. Junior League events, holiday markets, state fairs. Best single event: $45K in one weekend.
**Current scale:** ~12 events/year, wants to grow to 25-30.
**Ideal demographic:** Women 25-65 with disposable income who care about beauty/hair.
**Avoid:** Gun shows, outdoor-only events, flea markets, B2B-only trade shows.

## Architecture

- **Frontend:** Next.js App Router with React
- **Database:** SQLite via Prisma ORM
- **Automation:** Playwright (headless for auto-fill, headed for CAPTCHA pause)
- **Integrations:** Google Calendar API, Gmail API
- **Hosting:** Local machine or VPS (Playwright requires real compute, not serverless)

## Key technical decisions

1. **Playwright over Puppeteer** — Better API for form detection, native file upload support via `setInputFiles()`, cross-browser
2. **SQLite over Postgres** — Single user tool, no server overhead, file-portable, works offline
3. **Next.js over separate frontend/backend** — API routes + React in one codebase, server actions for form handling
4. **No Redis/queue system** — Over-engineering for single-user scale. Direct Playwright calls from API routes are fine for <100 events/year
5. **Headed browser for CAPTCHAs** — When CAPTCHA detected, switch from headless to visible Chrome, pause automation, let user solve and submit

## Application types the engine handles

1. **Web forms** — Detect fields, map to company profile, auto-fill, upload photos, submit (or pause for CAPTCHA)
2. **PDF applications** — Download PDF, fill fields programmatically, save for email submission
3. **Platform-based (Eventeny, etc.)** — Require login; flag for manual handling or build platform-specific adapters
4. **Email applications** — Generate pre-written email with company info, attach documents, save as Gmail draft

## Field mapping patterns

The form filler uses regex patterns to match HTML form labels to company data. Currently maps 15+ patterns including: business name, legal name, owner/contact name, email, phone, address (street/city/state/zip), EIN, website, product description, booth size, booth type, product category.

When a required field can't be mapped, it's flagged as "needs attention" rather than skipped silently.

## Scoring algorithm

Events scored 0-100 based on:
- Positive keyword matches (+5 each): women, junior league, holiday market, state fair, etc.
- Negative keyword matches (-15 each): gun show, outdoor only, flea market, B2B only
- Attendance brackets: 50K+ (+20), 20K+ (+15), 10K+ (+10), 5K+ (+5), below (-10)
- Indoor booth available (+10), outdoor only (-20)
- Date availability vs blackout calendar
- Premium event types: Junior League (+15), Christmas/holiday (+10), state fair (+10)
- Competitor intel: existing hair vendor (-10), no hair vendor (+10)

## Conventions

- All monetary values in USD
- Dates in ISO 8601 (YYYY-MM-DD)
- Event statuses: `discovered` → `researching` → `applied` → `accepted` → `rejected` → `scheduled` → `completed`
- Company profile is the single source of truth for all auto-fill data — never hardcode business info elsewhere
- Screenshots of filled forms saved to `data/screenshots/` for review before submission
- Never auto-submit a form without user confirmation unless explicitly configured

## Important constraints

- **CAPTCHA cannot be solved programmatically** — Always pause and let the user handle it
- **Photo uploads work via Playwright's setInputFiles** — No mixed content issues like Claude's Chrome extension has
- **Some platforms require login (Eventeny)** — Build adapters per platform, don't try to crack auth
- **Application deadlines are critical** — Events fill up fast, especially fairs. The tool should surface deadlines prominently
- **Flight/lodging costs matter** — Geographic proximity scoring helps avoid expensive cross-country trips for mediocre events
