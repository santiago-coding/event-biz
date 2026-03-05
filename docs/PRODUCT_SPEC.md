# EventBiz — Product Specification

## Vision

The app that finds every vendor event at every convention center in America and automates the application process.

Convention centers, expo halls, and fairgrounds host thousands of consumer events every year — holiday markets, home shows, craft bazaars, gift expos, bridal shows. Most of these events accept vendor applications through web forms, PDFs, or email. EventBiz scrapes venue calendars to build a comprehensive nationwide event database, then automates the tedious work of filling out vendor applications.

## Target user

Santiago Martinez, owner of Straight Ahead Beauty (Milan Beauty LLC). Sells professional hair care products at indoor consumer events nationwide. Flies 4-5 employees to events. Currently does ~12 events/year and wants to scale to 25-30.

Santiago doesn't need a scoring algorithm — he knows a good event when he sees one. What he needs:

- A comprehensive list of events by month so he never misses one
- Fast application automation so applying takes 1 minute instead of 10
- A pipeline tracker so nothing falls through the cracks

## Core workflow

```
PICK A MONTH → BROWSE EVENTS → BATCH APPLY → REVIEW & SUBMIT → TRACK
```

1. **Pick a month** — Santiago clicks "April" in a date picker. The app shows all consumer events at convention centers nationwide for that month.
2. **Browse events** — He scans the list, clicks into promising ones, calls organizers for details on the ones he likes.
3. **Select and batch apply** — He checks off 10-15 events and clicks "Apply All." The app navigates to each vendor application page, fills forms, attaches photos, and prepares email drafts.
4. **Review and submit** — Each prepared application enters a "ready" state. Santiago reviews the screenshot of each filled form, solves CAPTCHAs where needed, and approves submission.
5. **Track pipeline** — Applied events move through the pipeline: applied → accepted → scheduled → completed.

## Key features

### Date picker as primary entry point

The main dashboard is a month selector. Click a month, see every consumer event happening at convention centers across the US. No geographic filtering needed — Santiago flies everywhere.

### Nationwide event list from venue calendar scraping

EventBiz maintains a database of ~500 US convention centers, expo halls, and fairgrounds. It scrapes their event calendars monthly to discover new events. Every discovered event appears in the date-filtered list.

### Event detail view

Each event shows:
- Name, dates, venue, city/state
- Vendor count (if available — 200+ is a strong signal)
- Cash-and-carry / consumer shopping indicator
- Booth cost and type (indoor/outdoor)
- Application type (web form, PDF, email, platform)
- Application deadline
- Organizer contact info
- Current pipeline status
- Notes field for vetting call results

### Batch apply

Select multiple events, click "Apply All." The app processes each sequentially:
- **Web form:** navigates to form, detects fields, fills from company profile, attaches photos, screenshots the result
- **Email application:** generates a professional vendor inquiry email draft
- **PDF application:** downloads PDF, fills fields programmatically, drafts email with PDF attached
- **Platform (Eventeny, etc.):** flags for manual handling — requires login

After batch processing, a summary shows: X ready to submit, Y need CAPTCHA, Z need manual handling.

### "Ready" state — applications prepared but not submitted

Nothing is submitted without Santiago's review. Every prepared application enters an intermediate state:
- **ready** — form filled, screenshot taken, can submit with one click
- **needs_captcha** — form filled but CAPTCHA present, opens visible browser for user to solve
- **needs_manual** — platform requires login, user handles it themselves

### Status pipeline

| Status | Meaning | Who acts next |
|--------|---------|---------------|
| `discovered` | Event found by venue calendar scraper | User (browse, decide) |
| `preparing` | App is actively filling the application | App (automation running) |
| `ready` | Application filled and reviewed, ready to submit | User (click submit) |
| `needs_captcha` | Form filled but has CAPTCHA | User (solve CAPTCHA) |
| `needs_manual` | Platform requires login | User (apply manually) |
| `failed` | Automation error | User (retry or manual) |
| `applied` | Application submitted | Organizer (accept/reject) |
| `accepted` | Accepted by organizer | User (book travel) |
| `rejected` | Rejected or no response | — |
| `scheduled` | Travel booked, crew assigned | User (attend) |
| `completed` | Event finished | User (record results) |
| `skipped` | User decided not to pursue | — |

### Settings page

Company profile that feeds the auto-filler:
- Business name, legal name, EIN
- Owner/contact name, email, phone
- Address (street, city, state, zip)
- Website URL
- Product description
- Booth size preference, booth type (indoor)
- Photos folder path (product photos, booth photos, logo)

## Event quality signals

Lightweight signals to help Santiago scan the list — not a complex scoring algorithm:

| Signal | Why it matters |
|--------|---------------|
| **Vendor count 200+** | Large vendor events draw big crowds and serious shoppers |
| **Cash-and-carry / shopping language** | Indicates consumer buying event, not just exhibits |
| **Indoor convention center** | Santiago's setup requires indoor space |
| **Weekend dates** | Santiago's events are 3-day weekends (Fri-Sun) |
| **Consumer event type** | Bazaar, market, show, fair, expo — not B2B trade shows |

These signals are displayed per event to assist browsing. No automated filtering or ranking — Santiago picks his own events.

## Non-goals

- **Complex scoring algorithms** — Santiago knows what events are good. He needs data, not opinions.
- **Geographic filtering** — They fly everywhere. Every state is in play.
- **Multi-user support** — Single user tool for one business.
- **Cloud deployment** — Runs locally or on a VPS. Playwright needs real compute.
- **CAPTCHA solving** — Always pause for human. Never attempt programmatic solving.
- **Auto-submit without review** — Every application gets a "ready" state for human review.
- **Inventory or POS** — Out of scope. EventBiz handles discovery and applications only.
- **Social media or marketing** — Not a marketing tool.

## Success metrics

| Metric | Today | With EventBiz |
|--------|-------|---------------|
| Events discovered per month | 5-10 (manual Google searches) | 50+ (automated venue scraping) |
| Application time per event | 5-10 minutes | Under 1 minute |
| Applications per year | ~30 | 50+ |
| Events attended per year | ~12 | 25-30 |
| Missed deadlines | Frequent | Zero (deadline tracking) |
