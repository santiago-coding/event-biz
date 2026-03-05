# EventBiz — AI Assistant Instructions

## Project summary

EventBiz is a vendor operations platform for Straight Ahead Beauty (Milan Beauty LLC), a hair care products company that sells at indoor consumer events nationwide — home shows, bazaars, holiday markets, trade shows, craft fairs, and expos.

The app scrapes convention center and expo venue calendars across America to discover upcoming consumer events, lets the user browse by date, batch-prepares vendor applications via Playwright automation, and tracks the full pipeline from discovery to completion.

## Business context

**Company:** Straight Ahead Beauty / Milan Beauty LLC
**Owner:** Santiago Martinez
**Product:** Professional hair care and beauty products
**Business model:** Sell at indoor consumer events (weekend trade shows, bazaars, markets, home shows). Bring 4-5 employees, fly them nationwide. Target $5K/day revenue, ~$3K expenses per event. Best single event: $45K in one weekend.
**Current scale:** ~12 events/year, wants to grow to 25-30.
**Geography:** Flies employees nationwide — geography is not a limiting factor, only event quality matters.
**Best events:** High vendor count (200+), cash-and-carry vendors, indoor convention centers, strong female demographic. Events like the Bodacious Bazaar (Hampton, VA — 25K attendance, 250+ vendors) and Harrisburg Home Show.
**Ideal demographic:** Women 25-65 with disposable income who care about beauty/hair.
**Avoid:** B2B-only trade shows, conferences, symposiums, wholesale-only events.

## What the app does

1. **DISCOVER** — Scrapes convention center and expo venue calendars across America to find upcoming consumer events. Not just state fairs — home shows, bazaars, craft fairs, holiday markets, trade shows, any indoor weekend event where vendors sell to consumers.
2. **BROWSE BY DATE** — User picks a month (e.g., "April") and sees all relevant events nationwide. Date range is the primary filter, not score or geography.
3. **PREPARE APPLICATIONS** — User selects events and clicks Apply. The app visits each event's website, finds the vendor application (web form, email, PDF, or platform), and prepares it — fills forms, drafts emails, flags platforms for manual handling.
4. **REVIEW & SUBMIT** — Applications sit in a "ready" state. User reviews each one, solves CAPTCHAs where needed, and clicks submit. Some can be fully automated.
5. **TRACK** — Pipeline from `discovered` → `preparing` → `ready` / `needs_captcha` / `needs_manual` → `applied` → `accepted` → `scheduled` → `completed`.

## Architecture

- **Frontend:** Next.js App Router with React
- **Database:** SQLite via Prisma ORM
- **Automation:** Playwright (headless for auto-fill, headed for CAPTCHA pause)
- **Hosting:** Local machine or VPS (Playwright requires real compute, not serverless)

## Key technical decisions

1. **Venue-based discovery over directory scraping** — Convention center calendars are the most reliable source for indoor consumer events. The Bodacious Bazaar won't be on 10times.com but it IS on the Hampton Roads Convention Center calendar. Build a database of ~500 US convention centers, expo halls, and fairgrounds; scrape their calendars monthly.
2. **Date-first UI** — User picks dates, sees events. Not score-first. There aren't thousands of relevant events per month.
3. **Scoring is lightweight** — The real signals are: vendor count, cash-and-carry language, indoor/weekend, convention center. Santiago reviews the list and calls organizers for details. Scoring helps sort, not decide.
4. **Batch apply workflow** — Select multiple events, prepare all applications at once, review and submit.
5. **"Ready" intermediate state** — Nothing submits without user approval. Forms are filled and screenshotted, emails are drafted, user does final click.
6. **SQLite over Postgres** — Single-user tool, no server overhead, file-portable, works offline.
7. **Next.js** — API routes + React in one codebase, server actions for form handling.
8. **No Redis/queue system** — Over-engineering for single-user scale. Direct Playwright calls from API routes work fine for <100 events/year.

## Venue-based discovery approach

- Build a database of ~500 US convention centers, expo halls, and fairgrounds (organized by state for completeness)
- Monthly scrape of all venue calendars to find upcoming events
- For each event: visit its website, look for vendor/exhibitor info, extract vendor count, cash-and-carry signals, booth pricing, application URL
- Store everything with real dates

## Event quality signals

**Positive signals:**
- High vendor count (200+ is strong)
- "Cash and carry" or shopping language
- Indoor, convention center
- Weekend dates
- Consumer event keywords: bazaar, market, show, fair, expo, boutique
- Strong female demographic indicators

**Anti-signals:**
- B2B only, conference, symposium, wholesale only
- No vendor information available
- Outdoor-only venues
- Weekday-only events

## Application types the engine handles

1. **Web forms** — Playwright fills fields, takes screenshots, pauses for CAPTCHA or user review before submit
2. **Email** — App drafts email with company info and attachments, user reviews and sends
3. **PDF applications** — Download PDF, fill fields programmatically, attach to email draft
4. **Platform-based (Eventeny, etc.)** — Flag for manual handling

## Field mapping

The form filler uses regex patterns to match HTML form labels to company data from the Settings table. Maps 15+ common vendor form patterns including: business name, legal name, owner/contact name, email, phone, address (street/city/state/zip), EIN, website, product description, booth size, booth type, product category.

When a required field can't be mapped, it's flagged as "needs attention" rather than skipped silently.

## Conventions

- All monetary values in USD
- Dates in ISO 8601 (YYYY-MM-DD)
- Event statuses: `discovered` → `preparing` → `ready` / `needs_captcha` / `needs_manual` → `applied` → `accepted` → `scheduled` → `completed`
- Company profile is the single source of truth for auto-fill data — stored in the Settings table, editable via the Settings page. Never hardcode business info elsewhere.
- Screenshots of filled forms saved to `data/screenshots/` for review before submission
- Never auto-submit a form without user confirmation

## Important constraints

- **CAPTCHA cannot be solved programmatically** — Always pause and let the user handle it
- **Photo uploads work via Playwright's setInputFiles** — Native file upload, no mixed content issues
- **Some platforms require login (Eventeny)** — Flag for manual handling, don't try to crack auth
- **Application deadlines are critical** — Events fill up fast. The tool surfaces deadlines prominently.
- **Nothing submits without user approval** — Forms are filled and screenshotted, emails are drafted. The user does the final click.
