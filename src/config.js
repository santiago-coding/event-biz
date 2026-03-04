/**
 * Company profile and event scoring configuration.
 * Edit this file with your business details and preferences.
 */

export const COMPANY = {
  businessName: 'Straight Ahead Beauty',
  legalName: 'Milan Beauty LLC',
  owner: 'Santiago Martinez',
  email: 'santiagorealtyfl@gmail.com',
  phone: '786-929-8309',
  address: '1 Karanda Pl, Palm Coast, FL 32164',
  ein: '88-0544790',
  website: 'www.straightaheadbeauty.com',
  boothSize: '10x20',
  boothType: 'indoor',
  productCategory: 'Hair care products',
  productDescription: 'Professional hair care and beauty products including straightening treatments, styling tools, and hair accessories',
  targetDemographic: 'Women 25-65',
  crewSize: 5,
  dailySalesTarget: 5000,
  expenseBudget: 3000,
};

export const SCORING = {
  // Keywords that boost an event's score (female/beauty/upscale signals)
  positiveKeywords: [
    'women', 'woman', 'ladies', 'junior league', 'holiday market',
    'christmas market', 'holiday bazaar', 'spring market', 'home show',
    'craft fair', 'boutique', 'beauty', 'fashion', 'wellness',
    'state fair', 'county fair', 'festival', 'expo', 'marketplace',
    'gift show', 'artisan', 'handmade', 'shopping', 'vendor market',
  ],
  // Keywords that lower score (wrong demographic / wrong venue type)
  negativeKeywords: [
    'gun show', 'firearms', 'auto show', 'car show', 'motorcycle',
    'hunting', 'fishing', 'outdoor only', 'flea market', 'swap meet',
    'b2b only', 'trade only', 'wholesale only',
  ],
  // Minimum attendance to consider
  minAttendance: 5000,
  // Only indoor booths
  indoorOnly: true,
  // Blackout dates (already booked weekends — format: YYYY-MM-DD start of weekend)
  blackoutDates: [
    '2026-03-06', // March 6-8
    '2026-03-28', // March 28-30
    '2026-04-03', // April 3-5
  ],
  // Earliest available weekend to apply for
  availableFrom: '2026-04-12',
};

// Event sources to scrape
export const SOURCES = [
  {
    name: 'Eventeny',
    type: 'platform',
    url: 'https://www.eventeny.com/events/',
    searchTerms: ['vendor', 'fair', 'market', 'holiday show'],
  },
  {
    name: 'Junior League Events',
    type: 'directory',
    baseUrl: 'https://www.ajli.org/',
    notes: 'Search individual chapter websites for events',
  },
  {
    name: '10times.com',
    type: 'directory',
    url: 'https://10times.com/usa/tradeshows',
    searchTerms: ['consumer show', 'fair', 'holiday market'],
  },
  {
    name: 'State Fair Boards',
    type: 'individual',
    notes: 'Each state has its own fair board website',
  },
  {
    name: 'FestivalNet',
    type: 'directory',
    url: 'https://festivalnet.com/',
    searchTerms: ['craft fair', 'holiday market', 'vendor event'],
  },
];
