import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { prisma } from "@/lib/db";
import { scoreEvent } from "@/lib/scoring";

interface ScrapedEvent {
  name: string;
  state?: string;
  location?: string;
  link?: string;
  vendorAppUrl?: string;
  source: string;
  category?: string;
  description?: string;
  notes?: string;
}

const FAIR_URLS = [
  { state: "Texas", name: "State Fair of Texas", url: "https://bigtex.com/", vendorUrl: "https://bigtex.com/commercial-exhibits-application-new/" },
  { state: "Iowa", name: "Iowa State Fair", url: "https://www.iowastatefair.org/" },
  { state: "Oklahoma", name: "Oklahoma State Fair", url: "https://okstatefair.com/" },
  { state: "Michigan", name: "Michigan State Fair", url: "https://www.michiganstatefairllc.com/", vendorUrl: "https://www.michiganstatefairllc.com/interiorvendors" },
  { state: "Arkansas", name: "Arkansas State Fair", url: "https://www.arkansasstatefair.com/" },
  { state: "Kentucky", name: "Kentucky State Fair", url: "https://kystatefair.org/" },
  { state: "Colorado", name: "Colorado State Fair", url: "https://www.coloradostatefair.com/" },
  { state: "Utah", name: "Utah State Fair", url: "https://www.utahstatefairpark.com/" },
  { state: "New Mexico", name: "New Mexico State Fair", url: "https://exponm.com/" },
  { state: "Idaho", name: "Eastern Idaho State Fair", url: "https://www.funonfoot.com/" },
  { state: "Virginia", name: "Virginia State Fair", url: "https://www.statefairva.org/" },
  { state: "West Virginia", name: "State Fair of West Virginia", url: "https://www.statefairofwv.com/" },
  { state: "North Dakota", name: "North Dakota State Fair", url: "https://www.ndstatefair.com/" },
  { state: "New Jersey", name: "New Jersey State Fair", url: "https://www.njstatefair.org/" },
  { state: "Maine", name: "Skowhegan State Fair", url: "https://www.skowheganstatefair.com/" },
  { state: "South Dakota", name: "South Dakota State Fair", url: "https://www.sdstatefair.com/" },
  { state: "North Carolina", name: "North Carolina State Fair", url: "https://www.ncstatefair.org/" },
  { state: "Nebraska", name: "Nebraska State Fair", url: "https://www.statefair.org/" },
  { state: "Maryland", name: "Maryland State Fair", url: "https://www.marylandstatefair.com/" },
  { state: "Massachusetts", name: "The Big E", url: "https://www.thebige.com/" },
  { state: "Georgia", name: "Georgia National Fair", url: "https://www.georgianationalfair.com/" },
  { state: "Alabama", name: "Alabama State Fair", url: "https://www.birminghamal.org/" },
  { state: "Kansas", name: "Kansas State Fair", url: "https://www.kansasstatefair.com/" },
  { state: "Indiana", name: "Indiana State Fair", url: "https://www.indianastatefair.com/" },
  { state: "Ohio", name: "Ohio State Fair", url: "https://www.ohiostatefair.com/" },
];

async function scrapeStateFairs(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<ScrapedEvent[]> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const events: ScrapedEvent[] = [];

  for (const fair of FAIR_URLS) {
    try {
      await page.goto(fair.url, { timeout: 15000, waitUntil: "domcontentloaded" });
      const pageText = await page.textContent("body").catch(() => "");
      const description = (pageText || "").slice(0, 500).replace(/\s+/g, " ").trim();

      events.push({
        name: fair.name,
        state: fair.state,
        location: `${fair.state}, USA`,
        link: fair.url,
        vendorAppUrl: fair.vendorUrl || "",
        source: "State Fair Board",
        category: "state fair",
        description: description.slice(0, 200),
      });
    } catch (err) {
      events.push({
        name: fair.name,
        state: fair.state,
        location: `${fair.state}, USA`,
        link: fair.url,
        vendorAppUrl: fair.vendorUrl || "",
        source: "State Fair Board",
        category: "state fair",
        notes: `Scrape failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  await context.close();
  return events;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const source = (body as { source?: string }).source || "fairs";

  const browser = await chromium.launch({ headless: true });
  let allEvents: ScrapedEvent[] = [];

  try {
    if (source === "all" || source === "fairs") {
      allEvents.push(...await scrapeStateFairs(browser));
    }
  } finally {
    await browser.close();
  }

  let created = 0;
  let updated = 0;

  for (const e of allEvents) {
    const existing = await prisma.event.findFirst({
      where: { name: e.name, source: e.source },
    });

    const eventData = {
      name: e.name,
      state: e.state || null,
      location: e.location || null,
      source: e.source,
      link: e.link || null,
      vendorAppUrl: e.vendorAppUrl || null,
      category: e.category || null,
      notes: e.notes || e.description || null,
    };

    const score = scoreEvent(eventData);

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: { ...eventData, score },
      });
      updated++;
    } else {
      await prisma.event.create({
        data: { ...eventData, score },
      });
      created++;
    }
  }

  return NextResponse.json({
    found: allEvents.length,
    new: created,
    updated,
  });
}
