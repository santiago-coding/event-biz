# Event Scout

Event discovery, scoring, and vendor application tool for Straight Ahead Beauty.

## What it does

1. **Discovers** vendor events (state fairs, holiday markets, Junior League events, home shows) nationwide
2. **Scores** them by fit — indoor booths, female demographic, attendance, date availability
3. **Exports** a ranked CSV/spreadsheet for review
4. **Tracks** application status from discovered → applied → accepted → scheduled

## Quick start

```bash
npm install
npx playwright install chromium

# Scrape all sources
npm run scout

# Re-score events
npm run score

# Export to CSV for Google Sheets
npm run export
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run scout` | Scrape all event sources |
| `npm run scout -- fairs` | Scrape state fairs only |
| `npm run scout -- eventeny` | Scrape Eventeny only |
| `npm run score` | Re-score all events |
| `npm run export` | Export ranked CSV |

## Configuration

Edit `src/config.js` to update:
- Company profile (business info for applications)
- Scoring weights (positive/negative keywords, minimum attendance)
- Blackout dates (weekends you're already booked)
- Available-from date

## Event data

Events are stored in `data/events.json`. Each event has:
- Score (0-100)
- Status: `discovered` → `researching` → `applied` → `accepted` → `rejected` → `scheduled` → `completed`
- Name, location, dates, attendance, booth info
- Application URL, deadline, organizer contact
- Notes (from your vetting calls)

## Workflow

1. Run `npm run scout` to find events
2. Run `npm run export` to get a CSV
3. Open in Google Sheets, review top-scored events
4. Call organizers to vet (ask about existing hair vendors, attendance, demographics)
5. Apply to the best ones
6. Update status in the database as responses come in
