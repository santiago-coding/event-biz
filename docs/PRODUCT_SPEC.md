# EventBiz — Product Specification

## Vision

The operating system for vendors who sell at live events. One tool to find events, apply to them, and manage the logistics of getting there.

## Target user

Small business owners who sell physical products at fairs, markets, shows, and festivals. They typically:
- Do 10-50 events per year
- Apply to 2-3x more events than they attend (not all accept them)
- Spend hours per week finding events and filling out applications
- Track everything in spreadsheets, email, and memory
- Bring 2-10 employees and handle travel logistics

## MVP scope (v0.2)

### Dashboard
- **Event list** — All discovered events in a sortable, filterable table
  - Sort by: score, date, state, status, deadline
  - Filter by: status, state, date range, score threshold
  - Quick actions: mark as "researching," "skip," "apply"
- **Stats bar** — Total discovered, applied, accepted, upcoming
- **Deadline alerts** — Events with application deadlines in the next 14 days

### Event detail page
- Event info: name, dates, location, attendance, booth options, cost
- Application status timeline: discovered → researching → applied → accepted → scheduled
- Organizer contact info and notes (from vetting calls)
- Application URL and type (web form / PDF / email / platform)
- Screenshot of filled form (after auto-apply)
- Action buttons: Apply, Skip, Add Note, Mark Accepted

### Apply workflow
- **Single apply** — Click "Apply" on an event, automation fills the form
  - Shows live progress: "Opening page... Detecting fields... Filling 15 fields... Done"
  - If CAPTCHA: opens visible browser, user solves, clicks submit
  - If file upload: auto-attaches configured photos
  - Screenshot saved for review
- **Batch apply** — Select multiple events, click "Apply All"
  - Processes sequentially
  - Pauses on CAPTCHAs, queues them for user attention
  - Summary at end: X submitted, Y need CAPTCHA, Z failed

### Settings
- **Company profile** — Edit business name, address, phone, email, EIN, website, product description
- **Booth preferences** — Size, type (indoor only), photos folder path
- **Scoring rules** — Adjust keyword weights, minimum attendance, blackout dates
- **Integrations** — Google Calendar and Gmail OAuth connection

### Calendar view
- Monthly calendar showing:
  - Accepted/scheduled events (green)
  - Application deadlines (yellow)
  - Blackout dates (gray)
- Click event to see details

## Future features (v0.3+)

### Geographic optimization
- Map view of events across the US
- Cluster nearby events on consecutive weekends to minimize travel
- Flight cost estimation based on departure city (Palm Coast, FL)
- Airbnb price estimation for event weekends

### Crew management
- Assign employees to events
- Track availability per weekend
- Calculate commission projections based on expected sales

### Financial tracking
- Revenue and expenses per event
- Running P&L for the year
- ROI scoring: update event scores based on actual sales history

### Event discovery expansion
- Junior League chapters (200+ nationwide)
- Holiday/Christmas market directories
- Home show circuits
- FestivalNet, 10times, Eventeny search
- County fair boards
- Convention center event calendars
- Facebook event monitoring

### Application intelligence
- Learn from successful applications (what events accept you)
- Track which events had competing hair vendors
- Suggest optimal application timing based on deadline patterns
- Auto-retry failed applications when forms change

## Non-goals (things we won't build)

- Organizer-side tools (Marketspread, Eventeny already do this)
- Point of sale / payment processing at events
- Inventory management
- Social media marketing
- Anything that requires solving CAPTCHAs programmatically

## Success metrics

- **Time saved:** Application time drops from 5-10 min each to <30 seconds (plus CAPTCHA time)
- **Events discovered:** Find 2-3x more relevant events than manual searching
- **Application rate:** Apply to 50+ events per year (up from ~30)
- **Acceptance rate:** Track and optimize over time
- **Revenue growth:** More events = more revenue, better events = higher revenue per event
