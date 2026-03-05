# Contributing to EventBiz

## Project context

This is a private tool for Straight Ahead Beauty's vendor operations. Santiago Martinez is the business owner and product lead. AI coding assistants (Claude, Cursor) serve as the engineering team.

## Development workflow

1. **Discuss** — Santiago describes the business need or problem
2. **Plan** — AI proposes architecture and approach
3. **Build** — Implement in focused commits with clear messages
4. **Test** — Verify against real event websites (use screenshots for visual verification)
5. **Deploy** — Push to `main` on GitHub

## Branch strategy

- `main` — stable, working code
- Feature branches for major additions (e.g., `web-app`, `gmail-integration`)
- Direct commits to `main` for bug fixes and small improvements

## Commit messages

Use clear, descriptive messages. Prefix with area when helpful:

```
Add Junior League event scraper for 200+ chapters
Fix field mapping for multi-line address fields
Apply: handle Eventeny platform login flow
Dashboard: add calendar view for accepted events
```

## Testing

- **Automated:** Vitest for unit tests on scoring, field mapping, database operations
- **Manual:** Run apply engine against real fair websites, verify screenshots
- **Visual:** For web app, verify dashboard renders correctly in browser

## Code organization principles

1. **Config is king** — All business data lives in `src/config.js`. Never scatter it.
2. **Scrapers are disposable** — Event websites change. Scrapers should be easy to update or replace.
3. **The field mapper is the core IP** — Pattern matching that maps arbitrary form fields to company data. Invest in making this robust.
4. **Fail gracefully** — If one application fails, log it and move to the next. Never crash the batch.
5. **Screenshots are receipts** — Always capture the filled form state before any submission.
