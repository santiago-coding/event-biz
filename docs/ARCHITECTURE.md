# EventBiz — Architecture

## System overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (user)                                                  │
│  Next.js Dashboard                                               │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ Date Picker│ │ Event List │ │ Apply Workflow│ │ Settings   │  │
│  └────────────┘ └────────────┘ └──────────────┘ └────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                              │
│  /api/scout    — venue calendar scraping                         │
│  /api/analyze  — event website analysis                          │
│  /api/apply    — application automation                          │
│  /api/events   — CRUD for events                                 │
│  /api/settings — company profile                                 │
│  /api/venues   — venue management                                │
├──────────────────────────────────────────────────────────────────┤
│  Core Libraries                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ Venue Scraper│ │ Event        │ │ Application Engine        │  │
│  │              │ │ Analyzer     │ │ ┌──────────┐ ┌─────────┐ │  │
│  │              │ │              │ │ │Form      │ │Photo    │ │  │
│  │              │ │              │ │ │Filler    │ │Uploader │ │  │
│  │              │ │              │ │ │(Playwrgt)│ │         │ │  │
│  │              │ │              │ │ └──────────┘ └─────────┘ │  │
│  │              │ │              │ │ ┌──────────────────────┐ │  │
│  │              │ │              │ │ │CAPTCHA Detector      │ │  │
│  │              │ │              │ │ └──────────────────────┘ │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  Data Layer                                                      │
│  SQLite via Prisma                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │
│  │ Venues   │ │ Events   │ │ Settings │                         │
│  └──────────┘ └──────────┘ └──────────┘                         │
├──────────────────────────────────────────────────────────────────┤
│  External                                                        │
│  Convention center websites │ Event websites │ Vendor app forms   │
└──────────────────────────────────────────────────────────────────┘
```

## Data model

### Venue

```
id            String    @id @default(cuid())
name          String
state         String
city          String
address       String?
calendarUrl   String?
websiteUrl    String?
venueType     String    // "convention_center", "expo_hall", "fairground", "civic_center"
lastScraped   DateTime?
isActive      Boolean   @default(true)
createdAt     DateTime  @default(now())
updatedAt     DateTime  @updatedAt
```

### Event

```
id                String    @id @default(cuid())
venueId           String?   // FK to Venue (nullable for manually added events)
name              String
startDate         DateTime?
endDate           DateTime?
category          String?   // "bazaar", "market", "home_show", "craft_fair", "bridal_show", etc.
vendorCount       Int?
isCashAndCarry    Boolean?
isIndoor          Boolean?
isWeekend         Boolean?
boothCost         Float?
boothType         String?   // "indoor", "outdoor", "both"

source            String    // "venue_calendar", "manual", "directory"
link              String?
vendorAppUrl      String?
appDeadline       DateTime?
applicationType   String?   // "web_form", "pdf", "email", "platform"

organizerName     String?
organizerEmail    String?
organizerPhone    String?

score             Int       @default(0)
status            String    @default("discovered")
notes             String?
screenshotPath    String?
emailDraft        String?
appliedDate       DateTime?
acceptedDate      DateTime?

createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt
```

### Settings

Same structure as current — company profile fields that feed the auto-filler:

```
id                  String  @id @default("default")
businessName        String?
legalName           String?
ownerName           String?
email               String?
phone               String?
street              String?
city                String?
state               String?
zip                 String?
ein                 String?
website             String?
productDescription  String?
boothSize           String?
boothType           String?
photosPath          String?
updatedAt           DateTime @updatedAt
```

## Status workflow

```
discovered ──→ preparing ──→ ready ──────────→ applied ──→ accepted ──→ scheduled ──→ completed
                  │            │                  │
                  │            ├→ needs_captcha    └──→ rejected
                  │            │     │
                  │            │     └→ (user solves) → applied
                  │            │
                  │            └→ needs_manual
                  │                  │
                  │                  └→ (user applies manually) → applied
                  │
                  └→ failed (scrape error, form changed, etc.)

Any status can transition to → skipped (user decides not to pursue)
```

## Discovery pipeline

### 1. Venue database

Maintain a database of ~500 US convention centers, expo halls, fairgrounds, and civic centers. Each venue has a calendar URL that lists upcoming events.

Venue types:
- **Convention centers** — Major cities (McCormick Place, Javits Center, etc.)
- **Expo halls** — Dedicated exhibition facilities
- **Fairgrounds** — State and county fairgrounds with indoor exhibit halls
- **Civic centers** — Municipal event venues

### 2. Calendar scraper

Monthly scrape of all active venue calendars. For each venue:
1. Visit the calendar URL
2. Extract event names and dates for the target month
3. Deduplicate against existing events in the database
4. Store new events with status `discovered`

One scraper function per venue calendar format. Most convention center websites follow a handful of common patterns (embedded calendar widgets, event listing pages, PDF calendars).

### 3. Event analyzer

For each discovered event, visit its website and extract:
- Vendor count (from exhibitor lists, floor plans, or text mentions)
- Cash-and-carry / consumer shopping signals (keyword detection)
- Vendor application URL and type (web form, PDF download, email, platform)
- Application deadline
- Organizer contact info
- Booth cost and configuration options

This is a separate step from calendar scraping — it visits each event's own website, not the venue calendar.

### 4. Date-filtered presentation

User picks a month. The app queries all events where `startDate` falls within that month. Results show nationwide — no geographic filtering. Events display with quality signals (vendor count, cash-and-carry, indoor) to help the user browse.

## API design

### POST /api/scout

Scrape venue calendars for new events.

**Params:**
- `month` (required) — Target month in YYYY-MM format
- `state` (optional) — Limit to venues in a specific state

**Returns:** `{ found: number, new: number, existing: number }`

### POST /api/analyze

Visit an event's website and extract vendor info.

**Body:** `{ eventId: string }` or `{ eventIds: string[] }` for batch

**Returns:** `{ results: [{ eventId, vendorCount, isCashAndCarry, vendorAppUrl, applicationType, appDeadline }] }`

### POST /api/apply

Prepare applications for selected events.

**Body:** `{ eventIds: string[] }`

**Returns:**
```json
{
  "results": [
    {
      "eventId": "...",
      "status": "ready",
      "type": "web_form",
      "fieldsFilled": 15,
      "screenshotPath": "...",
      "needsAttention": []
    }
  ]
}
```

### GET /api/events

List events with filters.

**Query params:**
- `startDate`, `endDate` — date range filter
- `status` — filter by pipeline status
- `state` — filter by state
- `sort` — field to sort by (default: `startDate`)
- `limit`, `offset` — pagination

**Returns:** Paginated event list with venue info.

### PATCH /api/events/:id

Update event fields: status, notes, organizer info, etc.

### GET /api/settings

Returns the current company profile.

### PUT /api/settings

Updates the company profile.

### GET /api/venues

List all venues, optionally filtered by state or type.

### POST /api/venues

Add a new venue to the database.

**Body:** `{ name, state, city, address?, calendarUrl?, websiteUrl?, venueType }`

## Module responsibilities

### Venue scraper (`lib/scrapers/venue-scraper.ts`)

- One function per venue calendar format
- Takes a Playwright browser and a venue record, returns `Event[]`
- Stateless — returns data, caller saves
- Handles errors per venue, never crashes the batch
- Common patterns: embedded iCal, HTML event listing, PDF calendar

### Event analyzer (`lib/analyzers/event-analyzer.ts`)

- Visits an event's website (not the venue calendar)
- Extracts: vendor count, cash-and-carry signals, application URL/type, deadline, organizer info
- Uses keyword detection for quality signals
- Returns analysis result, caller updates the event record

### Form filler (`lib/automation/form-filler.ts`)

- `analyzeForm(page) → FormField[]` — reads all input fields and their labels
- `matchField(field, companyProfile) → { value, confidence }` — regex pattern matching
- `fillForm(page, profile) → FillReport` — fills matched fields, returns report
- This is the core engine — already works, invest in robustness

### Photo uploader (`lib/automation/photo-uploader.ts`)

- Detects file input fields on the page
- Infers what's needed from labels (booth photo, product photo, logo)
- Uses Playwright `setInputFiles()` to attach from configured photos folder
- Returns report of what was uploaded

### CAPTCHA detector (`lib/automation/captcha-detector.ts`)

- Checks page for reCAPTCHA, hCaptcha, or generic CAPTCHA elements
- If detected: flags the application as `needs_captcha`
- In review mode: opens headed browser so user can solve manually
- Never attempts programmatic solving
