# EventBiz — Architecture

## System overview

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (user)                                              │
│  Next.js dashboard — events, apply workflow, calendar        │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                          │
│  /api/scout    — trigger event discovery                     │
│  /api/apply    — trigger application for event(s)            │
│  /api/events   — CRUD for events                             │
│  /api/calendar — Google Calendar sync                        │
│  /api/email    — Gmail draft/send                            │
├─────────────────────────────────────────────────────────────┤
│  Core Libraries                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Scrapers │ │ Scorer   │ │ Mapper   │ │ Automation    │  │
│  │          │ │          │ │          │ │ (Playwright)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                  │
│  SQLite (via Prisma) — events, applications, notes, history │
├─────────────────────────────────────────────────────────────┤
│  External Services                                           │
│  Google Calendar API │ Gmail API │ Event websites            │
└─────────────────────────────────────────────────────────────┘
```

## Data model

### Event
```
id              String    @id
name            String
state           String?
location        String?
startDate       DateTime?
endDate         DateTime?
category        String?       // "state fair", "holiday market", "junior league", etc.
attendance      Int?
boothType       String?       // "indoor", "outdoor", "both"
boothCost       Float?
source          String        // "Eventeny", "10times", "State Fair Board", etc.
link            String?
vendorAppUrl    String?
appDeadline     DateTime?
applicationType String?       // "web_form", "pdf", "email", "platform"

organizerName   String?
organizerEmail  String?
organizerPhone  String?

score           Int           @default(0)
status          String        @default("discovered")
hasHairVendor   Boolean?
notes           String?

screenshotPath  String?
appliedDate     DateTime?
acceptedDate    DateTime?

createdAt       DateTime      @default(now())
updatedAt       DateTime      @updatedAt
```

### Status workflow
```
discovered ──→ researching ──→ applied ──→ accepted ──→ scheduled ──→ completed
                    │              │            │
                    └→ skipped     └→ rejected  └→ cancelled
```

## Module responsibilities

### Scrapers (`lib/scrapers/`)
- One file per source (eventeny.ts, state-fairs.ts, junior-league.ts, etc.)
- Each exports an async function that takes a Playwright browser and returns Event[]
- Scrapers should be stateless — they return data, the caller saves it
- Handle errors per-source, never crash the batch

### Scorer (`lib/scoring.ts`)
- Pure function: `scoreEvent(event, config) → number`
- No database access, no side effects
- Configurable weights via config object
- Returns 0-100

### Form mapper (`lib/automation/form-filler.ts`)
- `analyzeForm(page) → FormField[]` — reads all input fields and their labels
- `matchField(field, companyProfile) → { value, confidence }` — pattern matching
- `fillForm(page, profile) → FillReport` — fills all matched fields, returns report
- The core IP of the product — invest in robustness

### Photo uploader (`lib/automation/photo-uploader.ts`)
- Detects file input fields on the page
- Infers what's needed from labels (booth photo, product photo, logo)
- Uses Playwright `setInputFiles()` to attach from configured folder
- Returns report of what was uploaded

### CAPTCHA handler (`lib/automation/captcha-pause.ts`)
- Detects reCAPTCHA, hCaptcha, or generic CAPTCHA on page
- If found: switches browser to headed mode, pauses automation
- Returns control to user via dashboard notification
- After user solves: resumes automation or marks as manually submitted

## API design

### POST /api/scout
Triggers event discovery. Optional `source` param to limit to one source.
Returns: `{ found: number, new: number, updated: number }`

### POST /api/apply
Body: `{ eventId: string }` or `{ eventIds: string[] }` for batch.
Returns: `{ results: [{ eventId, success, type, filled, needsAttention }] }`

### GET /api/events
Query params: `status`, `state`, `minScore`, `sort`, `limit`.
Returns: paginated event list.

### PATCH /api/events/:id
Update event fields (status, notes, dates, organizer info).

### POST /api/calendar/sync
Syncs accepted events to Google Calendar.

### POST /api/email/draft
Body: `{ eventId: string }`.
Creates Gmail draft with pre-filled application email.

## Deployment

### Local (recommended for v0.2)
```bash
npm run dev  # Next.js on localhost:3000
```
Playwright runs on the same machine. SQLite file stored locally.

### VPS (future)
A $10/month VPS (DigitalOcean, Hetzner) can run the full stack. Playwright needs Linux with Chromium dependencies installed. Use `npx playwright install-deps` for system libraries.

### NOT serverless
Playwright cannot run on Vercel, Netlify, or Lambda. It needs a persistent process to control the browser. The Next.js frontend could deploy to Vercel with the Playwright worker on a separate VPS, but for single-user this is unnecessary complexity.
