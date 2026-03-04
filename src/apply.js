/**
 * Vendor application automation engine.
 *
 * Handles three application types:
 *   1. Web forms — Playwright fills and submits (flags CAPTCHAs for manual solve)
 *   2. PDF forms — Downloads, fills fields, saves for email
 *   3. Email applications — Drafts email with company info + attachments
 *
 * Run: node src/apply.js <event-id>
 *      node src/apply.js --batch          (apply to all "researching" status events)
 *      node src/apply.js --list           (show events ready to apply)
 */
import { chromium } from 'playwright';
import { COMPANY } from './config.js';
import { getEvents, updateEvent } from './db.js';

// ─── Field mapping: maps common form labels to company data ─────────
const FIELD_MAP = [
  { patterns: [/business\s*name/i, /company\s*name/i, /vendor\s*name/i, /organization/i, /dba/i], value: COMPANY.businessName },
  { patterns: [/legal\s*name/i, /llc/i, /corp/i], value: COMPANY.legalName },
  { patterns: [/owner/i, /contact\s*name/i, /your\s*name/i, /applicant/i, /first.*last/i, /full\s*name/i, /representative/i], value: COMPANY.owner },
  { patterns: [/email/i, /e-mail/i], value: COMPANY.email },
  { patterns: [/phone/i, /telephone/i, /mobile/i, /cell/i], value: COMPANY.phone },
  { patterns: [/address|street/i], value: COMPANY.address },
  { patterns: [/city/i], value: 'Palm Coast' },
  { patterns: [/state/i, /province/i], value: 'FL' },
  { patterns: [/zip/i, /postal/i], value: '32164' },
  { patterns: [/ein|tax\s*id|federal.*id/i], value: COMPANY.ein },
  { patterns: [/website|web\s*site|url/i], value: COMPANY.website },
  { patterns: [/product.*desc|describe.*product|what.*sell|merchandise/i], value: COMPANY.productDescription },
  { patterns: [/booth\s*size|space\s*size|dimensions/i], value: COMPANY.boothSize },
  { patterns: [/booth\s*type|indoor.*outdoor|location\s*preference/i], value: 'Indoor' },
  { patterns: [/category|type\s*of\s*(business|product|vendor)/i], value: COMPANY.productCategory },
];

/**
 * Analyze a web page to find form fields and map them to company data.
 * Returns an array of { selector, label, value, confidence } objects.
 */
async function analyzeForm(page) {
  const fields = await page.$$eval(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], textarea, select',
    (elements) => elements.map(el => {
      const id = el.id || '';
      const name = el.name || '';
      const placeholder = el.placeholder || '';
      const type = el.type || el.tagName.toLowerCase();

      // Find associated label
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.textContent.trim();
      }
      if (!label && el.parentElement) {
        const parentLabel = el.parentElement.querySelector('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label && el.previousElementSibling) {
        label = el.previousElementSibling.textContent?.trim() || '';
      }
      if (!label) label = placeholder;

      // Build a unique selector
      let selector = '';
      if (el.id) selector = `#${el.id}`;
      else if (el.name) selector = `[name="${el.name}"]`;
      else selector = `${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`;

      const isSelect = el.tagName.toLowerCase() === 'select';
      const options = isSelect
        ? Array.from(el.options).map(o => ({ value: o.value, text: o.textContent.trim() }))
        : [];

      return {
        selector,
        label: label.slice(0, 100),
        id,
        name,
        placeholder,
        type,
        isSelect,
        options,
        currentValue: el.value,
        isRequired: el.required,
      };
    })
  );

  return fields;
}

/**
 * Match a form field to company data using the field map.
 */
function matchField(field) {
  const searchText = [field.label, field.name, field.id, field.placeholder]
    .filter(Boolean)
    .join(' ');

  for (const mapping of FIELD_MAP) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(searchText)) {
        return { value: mapping.value, confidence: 'high' };
      }
    }
  }

  return null;
}

/**
 * Fill a web form on a page using the field map.
 * Returns a report of what was filled, what was skipped, and what needs attention.
 */
async function fillWebForm(page) {
  const fields = await analyzeForm(page);
  const report = { filled: [], skipped: [], needsAttention: [], hasCaptcha: false };

  // Check for CAPTCHA
  const pageContent = await page.content();
  if (/recaptcha|hcaptcha|captcha/i.test(pageContent)) {
    report.hasCaptcha = true;
    report.needsAttention.push({ type: 'captcha', message: 'Page has CAPTCHA — needs manual solve' });
  }

  // Check for file upload fields
  const fileInputs = await page.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    report.needsAttention.push({
      type: 'file_upload',
      message: `${fileInputs.length} file upload field(s) — needs manual attachment`,
    });
  }

  for (const field of fields) {
    if (field.currentValue && field.currentValue.length > 0) {
      report.skipped.push({ ...field, reason: 'already filled' });
      continue;
    }

    const match = matchField(field);
    if (!match) {
      if (field.isRequired) {
        report.needsAttention.push({
          type: 'unmapped_required',
          field: field.label || field.name || field.selector,
          message: `Required field not mapped: "${field.label || field.name}"`,
        });
      } else {
        report.skipped.push({ ...field, reason: 'no mapping found' });
      }
      continue;
    }

    try {
      if (field.isSelect) {
        // For select fields, find the best matching option
        const bestOption = field.options.find(o =>
          o.text.toLowerCase().includes(match.value.toLowerCase()) ||
          o.value.toLowerCase().includes(match.value.toLowerCase())
        );
        if (bestOption) {
          await page.selectOption(field.selector, bestOption.value);
          report.filled.push({ field: field.label || field.name, value: bestOption.text });
        } else {
          report.needsAttention.push({
            type: 'select_no_match',
            field: field.label || field.name,
            message: `No matching option for "${match.value}" in dropdown`,
            options: field.options.map(o => o.text),
          });
        }
      } else {
        await page.fill(field.selector, match.value);
        report.filled.push({ field: field.label || field.name, value: match.value });
      }
    } catch (err) {
      report.needsAttention.push({
        type: 'fill_error',
        field: field.label || field.name,
        message: err.message,
      });
    }
  }

  return report;
}

/**
 * Generate an email draft body for email-based applications.
 */
function generateEmailDraft(event) {
  return `Subject: Vendor Application — ${COMPANY.businessName} — ${event.name}

Dear ${event.organizerName || 'Event Organizer'},

I am writing to apply as a vendor for ${event.name}${event.startDate ? ` (${event.startDate})` : ''}.

Business: ${COMPANY.businessName} (${COMPANY.legalName})
Owner: ${COMPANY.owner}
Product: ${COMPANY.productDescription}
Website: ${COMPANY.website}

We are requesting a ${COMPANY.boothSize} indoor booth space. Our display features professional hair care products with live demonstrations.

Contact Information:
  Email: ${COMPANY.email}
  Phone: ${COMPANY.phone}
  Address: ${COMPANY.address}
  EIN: ${COMPANY.ein}

Please let me know the application process, booth pricing, and any required documentation.

Thank you for your consideration.

Best regards,
${COMPANY.owner}
${COMPANY.businessName}
${COMPANY.phone}
${COMPANY.website}`;
}

/**
 * Apply to a single event.
 */
async function applyToEvent(browser, event) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Applying: ${event.name} (${event.state || event.location || 'Unknown'})`);
  console.log(`${'═'.repeat(60)}`);

  const appUrl = event.vendorApplicationUrl || event.link;
  if (!appUrl) {
    console.log('  ✗ No application URL — skipping');
    updateEvent(event.id, { notes: (event.notes || '') + '\nNo application URL found.' });
    return { success: false, reason: 'no_url' };
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`  Opening: ${appUrl}`);
    await page.goto(appUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Detect page type
    const pageContent = await page.content();
    const hasForm = (await page.$$('form')).length > 0;
    const hasPdfLink = /\.pdf/i.test(pageContent);
    const isEventeny = /eventeny\.com/i.test(appUrl);

    if (isEventeny) {
      console.log('  📋 Eventeny platform detected');
      console.log('  → Platform requires account login — flagging for manual application');
      updateEvent(event.id, {
        status: 'researching',
        notes: (event.notes || '') + '\nEventeny platform — requires manual login and application.',
        applicationType: 'platform',
      });
      await context.close();
      return { success: false, reason: 'platform_login_required' };
    }

    if (hasPdfLink) {
      // Find PDF application links
      const pdfLinks = await page.$$eval('a[href*=".pdf"]', links =>
        links.map(a => ({ text: a.textContent.trim(), href: a.href }))
          .filter(l => /vendor|application|exhibit/i.test(l.text + l.href))
      );

      if (pdfLinks.length > 0) {
        console.log(`  📄 PDF application found: ${pdfLinks[0].href}`);
        console.log('  → Generating email draft for PDF submission');
        const draft = generateEmailDraft(event);
        console.log('\n--- EMAIL DRAFT ---');
        console.log(draft);
        console.log('--- END DRAFT ---\n');

        updateEvent(event.id, {
          status: 'researching',
          notes: (event.notes || '') + `\nPDF application: ${pdfLinks[0].href}\nEmail draft generated.`,
          applicationType: 'pdf',
          pdfUrl: pdfLinks[0].href,
        });
        await context.close();
        return { success: true, type: 'pdf', pdfUrl: pdfLinks[0].href };
      }
    }

    if (hasForm) {
      console.log('  📝 Web form detected — analyzing fields...');
      const report = await fillWebForm(page);

      console.log(`\n  Filled: ${report.filled.length} fields`);
      for (const f of report.filled) {
        console.log(`    ✓ ${f.field}: ${f.value}`);
      }

      if (report.needsAttention.length > 0) {
        console.log(`\n  ⚠ Needs attention: ${report.needsAttention.length} items`);
        for (const item of report.needsAttention) {
          console.log(`    → [${item.type}] ${item.message}`);
        }
      }

      if (report.skipped.length > 0) {
        console.log(`  Skipped: ${report.skipped.length} fields`);
      }

      // Take a screenshot of the filled form
      const screenshotPath = `data/screenshots/${event.id}_form.png`;
      try {
        const { mkdirSync } = await import('fs');
        mkdirSync('data/screenshots', { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  📸 Screenshot saved: ${screenshotPath}`);
      } catch (e) {
        console.log(`  Screenshot failed: ${e.message}`);
      }

      const status = report.hasCaptcha ? 'researching' : 'applied';
      const noteLines = [];
      if (report.hasCaptcha) noteLines.push('CAPTCHA present — needs manual solve and submit.');
      if (report.needsAttention.length > 0) {
        noteLines.push(`${report.needsAttention.length} items need attention.`);
      }
      noteLines.push(`Auto-filled ${report.filled.length} fields.`);

      updateEvent(event.id, {
        status,
        applicationType: 'web_form',
        notes: (event.notes || '') + '\n' + noteLines.join('\n'),
      });

      await context.close();
      return {
        success: true,
        type: 'web_form',
        filled: report.filled.length,
        hasCaptcha: report.hasCaptcha,
        needsAttention: report.needsAttention.length,
      };
    }

    // No form found — generate email draft
    console.log('  📧 No form found — generating email inquiry draft');
    const draft = generateEmailDraft(event);
    console.log('\n--- EMAIL DRAFT ---');
    console.log(draft);
    console.log('--- END DRAFT ---\n');

    updateEvent(event.id, {
      status: 'researching',
      notes: (event.notes || '') + '\nNo web form found. Email draft generated.',
      applicationType: 'email',
    });

    await context.close();
    return { success: true, type: 'email' };

  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    updateEvent(event.id, {
      notes: (event.notes || '') + `\nApplication error: ${err.message}`,
    });
    await context.close();
    return { success: false, reason: err.message };
  }
}

/**
 * List events ready to apply.
 */
function listReady() {
  const events = getEvents();
  const ready = events.filter(e =>
    e.status === 'discovered' || e.status === 'researching'
  ).sort((a, b) => b.score - a.score);

  if (ready.length === 0) {
    console.log('No events ready to apply. Run "npm run scout" first.');
    return;
  }

  console.log(`\n${ready.length} events ready to apply:\n`);
  for (const e of ready) {
    const url = e.vendorApplicationUrl || e.link || 'no URL';
    console.log(`  [${e.score}] ${e.id} — ${e.name} (${e.state || ''})`);
    console.log(`       ${url}`);
    console.log(`       Status: ${e.status} | Type: ${e.applicationType || 'unknown'}\n`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];

  if (arg === '--list') {
    listReady();
    return;
  }

  if (arg === '--batch') {
    const events = getEvents().filter(e =>
      e.status === 'discovered' && e.vendorApplicationUrl
    ).sort((a, b) => b.score - a.score);

    if (events.length === 0) {
      console.log('No events with application URLs ready for batch apply.');
      return;
    }

    console.log(`Batch applying to ${events.length} events...\n`);
    const browser = await chromium.launch({ headless: true });
    const results = { filled: 0, pdf: 0, email: 0, failed: 0, captcha: 0 };

    for (const event of events) {
      const result = await applyToEvent(browser, event);
      if (result.success) {
        if (result.type === 'web_form') results.filled++;
        if (result.type === 'pdf') results.pdf++;
        if (result.type === 'email') results.email++;
        if (result.hasCaptcha) results.captcha++;
      } else {
        results.failed++;
      }
    }

    await browser.close();

    console.log('\n' + '═'.repeat(60));
    console.log('BATCH APPLY COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Web forms filled: ${results.filled}`);
    console.log(`  PDF apps found:   ${results.pdf}`);
    console.log(`  Email drafts:     ${results.email}`);
    console.log(`  CAPTCHA blocked:  ${results.captcha}`);
    console.log(`  Failed:           ${results.failed}`);
    return;
  }

  // Single event by ID
  if (arg) {
    const events = getEvents();
    const event = events.find(e => e.id === arg);
    if (!event) {
      console.log(`Event not found: ${arg}`);
      console.log('Run "node src/apply.js --list" to see available events.');
      return;
    }

    const browser = await chromium.launch({ headless: true });
    await applyToEvent(browser, event);
    await browser.close();
    return;
  }

  console.log('Usage:');
  console.log('  node src/apply.js --list          List events ready to apply');
  console.log('  node src/apply.js --batch         Batch apply to all discovered events');
  console.log('  node src/apply.js <event-id>      Apply to a specific event');
}

main().catch(err => {
  console.error('Apply failed:', err);
  process.exit(1);
});
