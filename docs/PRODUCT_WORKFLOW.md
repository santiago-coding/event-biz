# EventBiz — Product Workflow

Santiago's description of how EventBiz should work, distilled into a step-by-step product workflow.

---

## The core loop

```
SELECT DATE RANGE → BROWSE EVENTS → PREPARE APPLICATIONS → REVIEW & SUBMIT → TRACK
```

Santiago clicks a month. The app shows the best events from every state in that window. He picks events he likes. The app navigates to each event's vendor application page and fills it out. Santiago reviews each prepared application, solves CAPTCHAs where needed, and hits submit. The app tracks everything.

---

## Step-by-step user flow

### Step 1: Select a date range

**User action:** Santiago clicks a month (e.g. "April") or selects a custom date range.

**App response:**
- Queries the event database for all events within that date window
- Shows results from every US state — not filtered by geography, because Santiago flies everywhere
- Results are sorted by score (best fit first), but all events in the window are shown
- Each event shows: name, dates, city/state, category, score, and application status

**What the user sees:** A list of events happening in April, nationwide. State fairs in Texas and Ohio. Home shows in Harrisburg and Denver. Holiday markets, craft fairs, convention center events. Big well-known events AND hidden gems.

**Key design decisions:**
- Date range is the primary filter, not score or geography
- Every state is represented — the app searches nationally
- Event types include: state fairs, home shows, holiday markets, craft shows, trade shows, convention center events, Junior League events
- Events are pre-scored but not pre-filtered by score — Santiago decides which ones to pursue

---

### Step 2: Browse and select events

**User action:** Santiago scans the list and clicks on an event he's interested in.

**App response:**
- Opens the event detail view
- Shows all known info: dates, location, attendance, booth options, cost, organizer contact
- Shows the application type (web form, PDF, email, platform) if known
- Shows the current status in the pipeline
- Provides an "Apply" button

**What the user sees:** Everything he needs to decide whether to apply — plus a one-click way to start the application process.

---

### Step 3: Prepare the application

**User action:** Santiago clicks "Apply" on one or more events (single or batch).

**App response — depends on application type:**

#### Type A: Web form (most common)
1. App opens the event website in a headless browser
2. Navigates to the vendor application page
3. Detects all form fields and their labels
4. Maps fields to company profile data (business name, EIN, address, phone, product description, booth size, etc.)
5. Fills every mapped field automatically
6. Detects file upload fields and attaches booth/product photos
7. Takes a screenshot of the filled form for review
8. Checks for CAPTCHA presence
9. Sets status based on result:
   - **No CAPTCHA → status: `ready`** — form is filled and can be submitted automatically
   - **Has CAPTCHA → status: `needs_captcha`** — form is filled but needs human intervention

#### Type B: PDF application
1. App finds the PDF download link on the event page
2. Downloads the PDF
3. Fills PDF fields programmatically with company data
4. Saves the filled PDF
5. Generates an email draft with the PDF attached, addressed to the organizer
6. Sets status: `ready` (email draft is prepared)

#### Type C: Email application
1. App detects there's no web form — just organizer contact info
2. Generates a professional email draft with all company info, product description, and booth request
3. Saves the draft (or creates it in Gmail via API)
4. Sets status: `ready` (email is drafted)

#### Type D: Platform (Eventeny, etc.)
1. App detects the event uses a platform that requires login
2. Flags the event: "Eventeny — requires manual login and application"
3. Sets status: `needs_manual` — user must handle this one themselves

---

### Step 4: Review and submit

**User action:** Santiago goes back to his event list. Events now show their preparation status. He clicks on a `ready` or `needs_captcha` event.

**App response — depends on preparation result:**

#### Fully automated (no CAPTCHA, web form or email):
- Shows the screenshot of the filled form or the email draft
- User can review what was filled
- User clicks **"Submit"** — app submits the form or sends the email
- Status moves to `applied`

#### Needs CAPTCHA:
- App reopens the browser in headed (visible) mode
- Shows the filled form with the CAPTCHA visible
- User solves the CAPTCHA manually
- User clicks the submit button (or app clicks it after CAPTCHA is solved)
- Status moves to `applied`

#### Needs manual (platform):
- App shows the event link and any gathered info
- User opens the platform, logs in, applies manually
- User marks the event as `applied` in the app

**Key design decision:** The `ready` intermediate state is critical. Santiago wants to review before anything is submitted. Even fully automated forms show a "ready to send" state — nothing goes out without his approval unless he configures specific events for auto-submit.

---

### Step 5: Track applications

**User action:** Santiago checks his dashboard at any time.

**App response:**
- Monthly calendar view showing all events by status
- List view with filters: by month, by status, by state
- Each event shows its current status in the pipeline
- Deadline alerts for upcoming application deadlines
- Stats: X discovered, Y applied, Z accepted, W upcoming

---

## Status lifecycle

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
```

| Status | Meaning | Who acts next |
|--------|---------|---------------|
| `discovered` | Event found by scraper, scored, in the database | User (decide to apply or skip) |
| `preparing` | App is actively filling the application | App (automation running) |
| `ready` | Application is filled, screenshot taken, ready to submit | User (review and click submit) |
| `needs_captcha` | Form is filled but has a CAPTCHA | User (solve CAPTCHA, then submit) |
| `needs_manual` | Platform requires login (Eventeny, etc.) | User (apply manually on platform) |
| `failed` | Automation hit an error | User (retry or apply manually) |
| `applied` | Application submitted | Event organizer (accept or reject) |
| `accepted` | Organizer accepted the application | User (confirm, book travel) |
| `rejected` | Organizer rejected or no response | — |
| `scheduled` | Travel booked, crew assigned, event confirmed | User (attend the event) |
| `completed` | Event is done | User (record revenue, notes) |
| `skipped` | User decided not to pursue | — |

---

## Batch workflow

The primary workflow Santiago described is batch-oriented:

1. **Browse:** "I click April" → sees 50+ events nationwide
2. **Select:** Checks off 15 events he wants to apply to
3. **Prepare all:** Clicks "Apply All" → app processes all 15 sequentially
4. **Review results:** App shows a summary:
   - 8 web forms filled, ready to submit (no CAPTCHA)
   - 3 web forms filled, need CAPTCHA solve
   - 2 email drafts prepared
   - 1 PDF application prepared
   - 1 Eventeny (needs manual)
5. **Submit ready ones:** Santiago clicks through the 8 ready forms, reviews screenshots, clicks submit on each
6. **Handle CAPTCHAs:** Opens the 3 CAPTCHA events one by one, solves each, submits
7. **Send emails:** Reviews and sends the 2 email drafts
8. **Manual:** Logs into Eventeny and applies to the 1 platform event himself

Total time: ~30 minutes for 15 applications instead of 5-10 hours manually.

---

## Data requirements per event

For the workflow to function, the app needs to discover and store the following for each event:

### Required (must have to be useful)
| Field | Why |
|-------|-----|
| `name` | Identify the event |
| `startDate` / `endDate` | Date range filtering — THE primary feature |
| `state` / `city` | Display location (not used for filtering) |
| `source` | Where the event was discovered |
| `link` | Event website URL |

### Important (needed for application automation)
| Field | Why |
|-------|-----|
| `vendorApplicationUrl` | Direct link to the vendor application page |
| `applicationType` | web_form / pdf / email / platform — determines how app processes it |
| `organizerEmail` | Needed for email-type applications |
| `appDeadline` | Deadline alerts, urgency sorting |
| `boothCost` | Helps Santiago decide whether to apply |
| `boothType` | Indoor/outdoor — indoor strongly preferred |

### Nice to have (improves scoring and decision-making)
| Field | Why |
|-------|-----|
| `attendance` | Higher attendance = more sales potential |
| `category` | Event type (state fair, home show, etc.) |
| `description` | Used for keyword scoring |
| `hasHairVendor` | Competitor presence affects score |
| `organizerName` / `organizerPhone` | For follow-up calls |

---

## Event discovery scope

Santiago was clear: the app should find events from **every state**, not just a hardcoded list. Event types to discover:

- State fairs (every state has one)
- Home shows and home & garden expos
- Holiday/Christmas markets (seasonal — Nov/Dec)
- Craft fairs and artisan markets
- Convention center trade shows and consumer expos
- Junior League events (200+ chapters nationwide)
- Spring/summer/fall festivals with vendor booths
- County fairs (larger ones with indoor vendor space)
- Gift shows and boutique markets

Sources to scrape:
- Eventeny, FestivalNet, 10times
- State fair board websites (50 states)
- Junior League chapter websites
- Convention center event calendars (major cities)
- Home show circuit organizers (National Association of Home Builders, local chapters)

The discovery engine should be comprehensive enough that Santiago doesn't need to Google for events himself.

---

## What this workflow replaces

| Today (manual) | With EventBiz |
|----------------|---------------|
| Google "events in April" across 50 states | Click "April" → see all events |
| Visit each event website, find vendor page | App navigates to vendor application automatically |
| Fill out each form by hand (15-30 min each) | App fills form in seconds |
| Track applications in a spreadsheet | App tracks status automatically |
| Miss deadlines because spreadsheet is stale | App surfaces deadlines and alerts |
| Apply to ~30 events/year | Apply to 50-100 events/year |
| Revenue from ~12 events | Revenue from 25-30 events |
