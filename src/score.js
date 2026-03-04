/**
 * Event scoring engine.
 * Ranks discovered events by fit for Straight Ahead Beauty.
 */
import { SCORING } from './config.js';
import { getEvents, updateEvent } from './db.js';

/**
 * Score a single event object (0-100).
 */
export function scoreEvent(event) {
  let score = 50; // base score

  const text = [
    event.name, event.description, event.vendorTypes, event.category,
  ].filter(Boolean).join(' ').toLowerCase();

  // Positive keyword matches
  for (const kw of SCORING.positiveKeywords) {
    if (text.includes(kw)) score += 5;
  }

  // Negative keyword matches
  for (const kw of SCORING.negativeKeywords) {
    if (text.includes(kw)) score -= 15;
  }

  // Attendance boost
  if (event.attendance) {
    if (event.attendance >= 50000) score += 20;
    else if (event.attendance >= 20000) score += 15;
    else if (event.attendance >= 10000) score += 10;
    else if (event.attendance >= SCORING.minAttendance) score += 5;
    else score -= 10;
  }

  // Indoor booth available
  if (event.boothType === 'indoor') score += 10;
  else if (event.boothType === 'outdoor') score -= 20;

  // Date availability check
  if (event.startDate) {
    const start = new Date(event.startDate);
    const availFrom = new Date(SCORING.availableFrom);
    if (start < availFrom) score -= 30;

    for (const blackout of SCORING.blackoutDates) {
      const bd = new Date(blackout);
      const diff = Math.abs(start - bd);
      if (diff < 2 * 24 * 60 * 60 * 1000) score -= 40;
    }
  }

  // Junior League or similar premium events get a big boost
  if (text.includes('junior league')) score += 15;
  if (text.includes('christmas') || text.includes('holiday')) score += 10;
  if (text.includes('state fair')) score += 10;

  // Competitor presence (if we know about it)
  if (event.hasHairVendor === true) score -= 10;
  if (event.hasHairVendor === false) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Score all discovered events and update the database.
 */
export function scoreAllEvents() {
  const events = getEvents();
  let scored = 0;
  for (const event of events) {
    const newScore = scoreEvent(event);
    if (newScore !== event.score) {
      updateEvent(event.id, { score: newScore });
      scored++;
    }
  }
  return { total: events.length, scored };
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('score.js')) {
  const result = scoreAllEvents();
  console.log(`Scored ${result.scored} of ${result.total} events.`);

  const events = getEvents();
  const ranked = events.sort((a, b) => b.score - a.score).slice(0, 20);
  console.log('\nTop 20 events:');
  console.log('─'.repeat(80));
  for (const e of ranked) {
    const date = e.startDate || 'TBD';
    const loc = e.location || 'Unknown';
    console.log(`[${e.score}] ${e.name} — ${date} — ${loc} (${e.status})`);
  }
}
