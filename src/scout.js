/**
 * Event discovery — scrapes event sources and populates the database.
 * Run: node src/scout.js [source]
 *
 * Sources: eventeny, 10times, festivalnet, fairs, all
 */
import { chromium } from 'playwright';
import { addEvent } from './db.js';
import { scoreEvent } from './score.js';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
];

async function createBrowser() {
  return chromium.launch({ headless: true });
}

/**
 * Scrape Eventeny for vendor events.
 */
async function scrapeEventeny(browser) {
  console.log('Scraping Eventeny...');
  const context = await browser.newContext();
  const page = await context.newPage();
  const events = [];

  const searchTerms = ['vendor fair', 'holiday market', 'craft show', 'state fair', 'home show'];

  for (const term of searchTerms) {
    try {
      const url = `https://www.eventeny.com/events/?search=${encodeURIComponent(term)}`;
      await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const items = await page.$$eval('[class*="event-card"], [class*="EventCard"], .card', cards =>
        cards.map(card => ({
          name: (card.querySelector('h3, h4, [class*="title"], [class*="name"]') || {}).textContent?.trim(),
          description: (card.querySelector('p, [class*="desc"], [class*="detail"]') || {}).textContent?.trim(),
          link: (card.querySelector('a') || {}).href,
        })).filter(e => e.name)
      );

      for (const item of items) {
        events.push({
          name: item.name,
          description: item.description || '',
          link: item.link || '',
          source: 'Eventeny',
          category: term,
        });
      }
      console.log(`  "${term}": found ${items.length} events`);
    } catch (err) {
      console.log(`  "${term}": error — ${err.message}`);
    }
  }

  await context.close();
  return events;
}

/**
 * Scrape 10times.com for consumer shows and fairs.
 */
async function scrape10times(browser) {
  console.log('Scraping 10times.com...');
  const context = await browser.newContext();
  const page = await context.newPage();
  const events = [];

  const categories = ['consumer-shows', 'fashion-beauty', 'lifestyle'];

  for (const cat of categories) {
    try {
      const url = `https://10times.com/usa/${cat}`;
      await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const items = await page.$$eval('.event-card, [class*="event-name"], tr[data-event]', cards =>
        cards.map(card => ({
          name: (card.querySelector('h3, h4, .event-name, a') || {}).textContent?.trim(),
          link: (card.querySelector('a') || {}).href,
          location: (card.querySelector('.venue, [class*="location"], [class*="city"]') || {}).textContent?.trim(),
          date: (card.querySelector('.date, [class*="date"], time') || {}).textContent?.trim(),
        })).filter(e => e.name)
      );

      for (const item of items) {
        events.push({
          name: item.name,
          location: item.location || '',
          dateText: item.date || '',
          link: item.link || '',
          source: '10times',
          category: cat,
        });
      }
      console.log(`  "${cat}": found ${items.length} events`);
    } catch (err) {
      console.log(`  "${cat}": error — ${err.message}`);
    }
  }

  await context.close();
  return events;
}

/**
 * Scrape state fair board websites.
 */
async function scrapeStateFairs(browser) {
  console.log('Scraping state fair websites...');
  const context = await browser.newContext();
  const page = await context.newPage();
  const events = [];

  const fairUrls = [
    { state: 'Texas', name: 'State Fair of Texas', url: 'https://bigtex.com/', vendorUrl: 'https://bigtex.com/commercial-exhibits-application-new/' },
    { state: 'Iowa', name: 'Iowa State Fair', url: 'https://www.iowastatefair.org/' },
    { state: 'Oklahoma', name: 'Oklahoma State Fair', url: 'https://okstatefair.com/' },
    { state: 'Michigan', name: 'Michigan State Fair', url: 'https://www.michiganstatefairllc.com/', vendorUrl: 'https://www.michiganstatefairllc.com/interiorvendors' },
    { state: 'Arkansas', name: 'Arkansas State Fair', url: 'https://www.arkansasstatefair.com/' },
    { state: 'Kentucky', name: 'Kentucky State Fair', url: 'https://kystatefair.org/' },
    { state: 'Colorado', name: 'Colorado State Fair', url: 'https://www.coloradostatefair.com/' },
    { state: 'Utah', name: 'Utah State Fair', url: 'https://www.utahstatefairpark.com/' },
    { state: 'New Mexico', name: 'New Mexico State Fair', url: 'https://exponm.com/' },
    { state: 'Idaho', name: 'Eastern Idaho State Fair', url: 'https://www.funonfoot.com/' },
    { state: 'Virginia', name: 'Virginia State Fair', url: 'https://www.statefairva.org/' },
    { state: 'West Virginia', name: 'State Fair of West Virginia', url: 'https://www.statefairofwv.com/' },
    { state: 'North Dakota', name: 'North Dakota State Fair', url: 'https://www.ndstatefair.com/' },
    { state: 'New Jersey', name: 'New Jersey State Fair', url: 'https://www.njstatefair.org/' },
    { state: 'Maine', name: 'Skowhegan State Fair', url: 'https://www.skowheganstatefair.com/' },
    { state: 'South Dakota', name: 'South Dakota State Fair', url: 'https://www.sdstatefair.com/' },
    { state: 'North Carolina', name: 'North Carolina State Fair', url: 'https://www.ncstatefair.org/' },
    { state: 'Nebraska', name: 'Nebraska State Fair', url: 'https://www.statefair.org/' },
    { state: 'Maryland', name: 'Maryland State Fair', url: 'https://www.marylandstatefair.com/' },
    { state: 'Massachusetts', name: 'The Big E', url: 'https://www.thebige.com/' },
    { state: 'Georgia', name: 'Georgia National Fair', url: 'https://www.georgianationalfair.com/' },
    { state: 'Alabama', name: 'Alabama State Fair', url: 'https://www.birminghamal.org/' },
    { state: 'Kansas', name: 'Kansas State Fair', url: 'https://www.kansasstatefair.com/' },
    { state: 'Indiana', name: 'Indiana State Fair', url: 'https://www.indianastatefair.com/' },
    { state: 'Ohio', name: 'Ohio State Fair', url: 'https://www.ohiostatefair.com/' },
  ];

  for (const fair of fairUrls) {
    try {
      await page.goto(fair.url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      const pageText = await page.textContent('body').catch(() => '');
      const description = pageText.slice(0, 500).replace(/\s+/g, ' ').trim();

      events.push({
        name: fair.name,
        state: fair.state,
        location: `${fair.state}, USA`,
        link: fair.url,
        vendorApplicationUrl: fair.vendorUrl || '',
        source: 'State Fair Board',
        category: 'state fair',
        description: description.slice(0, 200),
      });
      console.log(`  ✓ ${fair.name}`);
    } catch (err) {
      events.push({
        name: fair.name,
        state: fair.state,
        location: `${fair.state}, USA`,
        link: fair.url,
        vendorApplicationUrl: fair.vendorUrl || '',
        source: 'State Fair Board',
        category: 'state fair',
        description: '',
        notes: `Scrape failed: ${err.message}`,
      });
      console.log(`  ✗ ${fair.name}: ${err.message}`);
    }
  }

  await context.close();
  return events;
}

/**
 * Main entry — scrape selected sources, score, and save.
 */
async function main() {
  const source = process.argv[2] || 'all';
  const browser = await createBrowser();
  let allEvents = [];

  try {
    if (source === 'all' || source === 'fairs') {
      allEvents.push(...await scrapeStateFairs(browser));
    }
    if (source === 'all' || source === 'eventeny') {
      allEvents.push(...await scrapeEventeny(browser));
    }
    if (source === 'all' || source === '10times') {
      allEvents.push(...await scrape10times(browser));
    }
  } finally {
    await browser.close();
  }

  console.log(`\nFound ${allEvents.length} events total. Scoring and saving...`);

  let added = 0;
  for (const event of allEvents) {
    event.score = scoreEvent(event);
    addEvent(event);
    added++;
  }

  console.log(`Saved ${added} events to database.`);
  console.log('Run "npm run score" to re-score, or "npm run export" to export to CSV.');
}

main().catch(err => {
  console.error('Scout failed:', err);
  process.exit(1);
});
