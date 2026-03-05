import type { Event } from "@prisma/client";

const POSITIVE_KEYWORDS = [
  "women", "woman", "ladies", "junior league", "holiday market",
  "christmas market", "holiday bazaar", "spring market", "home show",
  "craft fair", "boutique", "beauty", "fashion", "wellness",
  "state fair", "county fair", "festival", "expo", "marketplace",
  "gift show", "artisan", "handmade", "shopping", "vendor market",
];

const NEGATIVE_KEYWORDS = [
  "gun show", "firearms", "auto show", "car show", "motorcycle",
  "hunting", "fishing", "outdoor only", "flea market", "swap meet",
  "b2b only", "trade only", "wholesale only",
];

const MIN_ATTENDANCE = 5000;

const BLACKOUT_DATES = [
  "2026-03-06",
  "2026-03-28",
  "2026-04-03",
];

const AVAILABLE_FROM = "2026-04-12";

export function scoreEvent(event: Partial<Event>): number {
  let score = 50;

  const text = [
    event.name, event.category, event.notes, event.location,
  ].filter(Boolean).join(" ").toLowerCase();

  for (const kw of POSITIVE_KEYWORDS) {
    if (text.includes(kw)) score += 5;
  }

  for (const kw of NEGATIVE_KEYWORDS) {
    if (text.includes(kw)) score -= 15;
  }

  if (event.attendance) {
    if (event.attendance >= 50000) score += 20;
    else if (event.attendance >= 20000) score += 15;
    else if (event.attendance >= 10000) score += 10;
    else if (event.attendance >= MIN_ATTENDANCE) score += 5;
    else score -= 10;
  }

  if (event.boothType === "indoor") score += 10;
  else if (event.boothType === "outdoor") score -= 20;

  if (event.startDate) {
    const start = new Date(event.startDate);
    const availFrom = new Date(AVAILABLE_FROM);
    if (start < availFrom) score -= 30;

    for (const blackout of BLACKOUT_DATES) {
      const bd = new Date(blackout);
      const diff = Math.abs(start.getTime() - bd.getTime());
      if (diff < 2 * 24 * 60 * 60 * 1000) score -= 40;
    }
  }

  if (text.includes("junior league")) score += 15;
  if (text.includes("christmas") || text.includes("holiday")) score += 10;
  if (text.includes("state fair")) score += 10;

  if (event.hasHairVendor === true) score -= 10;
  if (event.hasHairVendor === false) score += 10;

  return Math.max(0, Math.min(100, score));
}
