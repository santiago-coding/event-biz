# EventBiz

Vendor operations platform for businesses that sell at live events — fairs, holiday markets, home shows, Junior League events, and craft shows.

**The problem:** Vendors manually Google events, fill out dozens of different application forms by hand, track everything in spreadsheets, and miss deadlines. Applying to 30+ events per year takes weeks of tedious work.

**What EventBiz does:** Discovers events nationwide, scores them by fit, auto-fills vendor applications in seconds, uploads booth photos, flags CAPTCHAs for quick manual solve, tracks every application status, and syncs accepted events to Google Calendar.

## Status

**v0.1 — CLI prototype (working)**
- State fair scraper (25 fairs)
- Event scoring engine
- Application auto-filler (tested: 20 fields filled in 4 seconds on Texas State Fair)
- CSV export

**v0.2 — Web app (next)**
- Next.js dashboard
- Visual application workflow with CAPTCHA pause/resume
- Photo upload automation
- Google Calendar + Gmail integration

## Quick start (CLI)

```bash
npm install
npx playwright install chromium

# Discover events
npm run scout

# Score and rank
npm run score

# Export to CSV
npm run export

# Auto-apply to all discovered events
npm run apply -- --batch

# Apply to a single event
npm run apply -- <event-id>

# List events ready for application
npm run apply -- --list
```

## Architecture

```
eventbiz/
├── src/
│   ├── config.js        # Company profile + scoring rules
│   ├── db.js            # JSON database (SQLite in v0.2)
│   ├── scout.js         # Event discovery scrapers
│   ├── score.js         # Event scoring engine
│   ├── apply.js         # Application automation engine
│   └── export.js        # CSV exporter
├── data/
│   ├── events.json      # Event database
│   ├── events.csv       # Exported spreadsheet
│   └── screenshots/     # Filled form screenshots
└── package.json
```

### v0.2 web app architecture

```
eventbiz/
├── app/                     # Next.js App Router
│   ├── page.tsx             # Dashboard — event list, stats, quick actions
│   ├── events/
│   │   ├── page.tsx         # All events — filterable, sortable table
│   │   └── [id]/page.tsx    # Single event detail + application status
│   ├── apply/
│   │   └── page.tsx         # Batch apply workflow with CAPTCHA queue
│   ├── calendar/
│   │   └── page.tsx         # Calendar view of accepted events
│   ├── settings/
│   │   └── page.tsx         # Company profile editor
│   └── api/
│       ├── scout/route.ts   # Trigger event discovery
│       ├── apply/route.ts   # Trigger application for an event
│       └── events/route.ts  # CRUD for events
├── lib/
│   ├── automation/          # Playwright engine
│   │   ├── form-filler.ts   # Field detection + auto-fill
│   │   ├── photo-uploader.ts # File upload handler
│   │   └── captcha-pause.ts # Headed browser pause for CAPTCHAs
│   ├── scrapers/            # Event source scrapers
│   ├── scoring.ts           # Scoring algorithm
│   └── db.ts                # Prisma client (SQLite)
├── prisma/
│   └── schema.prisma        # Database schema
└── package.json
```

## How application automation works

1. **Form detection** — Playwright opens the application URL, finds all input fields, and reads their labels
2. **Field mapping** — Each field label is matched to company profile data using pattern matching (15+ common vendor form patterns)
3. **Auto-fill** — Matched fields are filled instantly via Playwright
4. **Photo upload** — File inputs are detected and populated with booth/product/logo photos from a configured folder
5. **CAPTCHA handling** — If detected, browser switches to visible mode and pauses. User solves CAPTCHA and clicks submit. App resumes.
6. **Status tracking** — Result is saved: submitted, needs-captcha, needs-review, or failed

## Competitive landscape

| Tool | What it does | What it doesn't do |
|------|-------------|-------------------|
| BoothScout | Finds 40K+ events, confidence scoring | Can't apply for you |
| Eventeny/Marketspread | Organizer-side vendor management | Vendor still fills every form manually |
| Claude + Chrome ext | Can fill forms with AI reasoning | Slow (5-10 min/app), loses context, photo upload issues |
| **EventBiz** | Finds events + auto-fills applications + tracks status | The only tool that actually submits for you |

## Tech stack

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js 15 + React | One codebase, server actions, fast |
| Database | SQLite via Prisma | No server needed, works offline, portable |
| Automation | Playwright | Fills forms in seconds, handles file uploads natively |
| Calendar | Google Calendar API | Sync accepted events + deadlines |
| Email | Gmail API | Send application emails + drafts |
| Hosting | Local or VPS | Playwright needs a real machine, not serverless |

## License

Private — Straight Ahead Beauty / Milan Beauty LLC
