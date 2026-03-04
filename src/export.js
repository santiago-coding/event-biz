/**
 * Export events to CSV for review in Google Sheets or Excel.
 * Run: node src/export.js [output.csv]
 */
import { writeFileSync } from 'fs';
import { getEvents, getStats } from './db.js';

function escapeCSV(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function main() {
  const outputFile = process.argv[2] || 'data/events.csv';
  const events = getEvents();

  if (events.length === 0) {
    console.log('No events in database. Run "npm run scout" first.');
    return;
  }

  const headers = [
    'Score', 'Status', 'Name', 'State', 'Location', 'Start Date', 'End Date',
    'Category', 'Attendance', 'Booth Type', 'Booth Cost',
    'Application URL', 'Application Deadline', 'Organizer Contact',
    'Has Hair Vendor', 'Notes', 'Source', 'Link',
  ];

  const rows = events
    .sort((a, b) => b.score - a.score)
    .map(e => [
      e.score,
      e.status,
      e.name,
      e.state || '',
      e.location || '',
      e.startDate || '',
      e.endDate || '',
      e.category || '',
      e.attendance || '',
      e.boothType || '',
      e.boothCost || '',
      e.vendorApplicationUrl || '',
      e.applicationDeadline || '',
      e.organizerContact || '',
      e.hasHairVendor == null ? '' : e.hasHairVendor ? 'Yes' : 'No',
      e.notes || '',
      e.source || '',
      e.link || '',
    ]);

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  writeFileSync(outputFile, csv);
  console.log(`Exported ${events.length} events to ${outputFile}`);

  const stats = getStats();
  console.log('\nEvent stats:');
  for (const [key, val] of Object.entries(stats)) {
    console.log(`  ${key}: ${val}`);
  }
}

main();
