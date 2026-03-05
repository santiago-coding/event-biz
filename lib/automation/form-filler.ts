import type { Page } from "playwright";
import type { Settings } from "@prisma/client";

interface FormField {
  selector: string;
  label: string;
  id: string;
  name: string;
  placeholder: string;
  type: string;
  isSelect: boolean;
  options: { value: string; text: string }[];
  currentValue: string;
  isRequired: boolean;
}

interface FieldMapping {
  patterns: RegExp[];
  key: keyof Settings;
}

const FIELD_MAP: FieldMapping[] = [
  { patterns: [/business\s*name/i, /company\s*name/i, /vendor\s*name/i, /organization/i, /dba/i], key: "businessName" },
  { patterns: [/legal\s*name/i, /llc/i, /corp/i], key: "legalName" },
  { patterns: [/owner/i, /contact\s*name/i, /your\s*name/i, /applicant/i, /first.*last/i, /full\s*name/i, /representative/i], key: "owner" },
  { patterns: [/email/i, /e-mail/i], key: "email" },
  { patterns: [/phone/i, /telephone/i, /mobile/i, /cell/i], key: "phone" },
  { patterns: [/address|street/i], key: "address" },
  { patterns: [/city/i], key: "address" },
  { patterns: [/state/i, /province/i], key: "address" },
  { patterns: [/zip/i, /postal/i], key: "address" },
  { patterns: [/ein|tax\s*id|federal.*id/i], key: "ein" },
  { patterns: [/website|web\s*site|url/i], key: "website" },
  { patterns: [/product.*desc|describe.*product|what.*sell|merchandise/i], key: "productDescription" },
  { patterns: [/booth\s*size|space\s*size|dimensions/i], key: "boothSize" },
  { patterns: [/booth\s*type|indoor.*outdoor|location\s*preference/i], key: "boothType" },
  { patterns: [/category|type\s*of\s*(business|product|vendor)/i], key: "productCategory" },
];

function getFieldValue(key: keyof Settings, profile: Settings): string {
  const val = profile[key];
  if (val == null) return "";
  return String(val);
}

function getAddressPart(field: FormField, profile: Settings): string | null {
  const searchText = [field.label, field.name, field.id, field.placeholder]
    .filter(Boolean).join(" ");
  if (/city/i.test(searchText)) return "Palm Coast";
  if (/state|province/i.test(searchText)) return "FL";
  if (/zip|postal/i.test(searchText)) return "32164";
  if (/address|street/i.test(searchText)) return profile.address;
  return null;
}

export async function analyzeForm(page: Page): Promise<FormField[]> {
  return page.$$eval(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input[type="number"], textarea, select',
    (elements) =>
      elements.map((el) => {
        const htmlEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const id = htmlEl.id || "";
        const name = htmlEl.name || "";
        const placeholder = (htmlEl as HTMLInputElement).placeholder || "";
        const type = (htmlEl as HTMLInputElement).type || htmlEl.tagName.toLowerCase();

        let label = "";
        if (htmlEl.id) {
          const labelEl = document.querySelector(`label[for="${htmlEl.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() || "";
        }
        if (!label && htmlEl.parentElement) {
          const parentLabel = htmlEl.parentElement.querySelector("label");
          if (parentLabel) label = parentLabel.textContent?.trim() || "";
        }
        if (!label && htmlEl.previousElementSibling) {
          label = htmlEl.previousElementSibling.textContent?.trim() || "";
        }
        if (!label) label = placeholder;

        let selector = "";
        if (htmlEl.id) selector = `#${htmlEl.id}`;
        else if (htmlEl.name) selector = `[name="${htmlEl.name}"]`;
        else selector = `${htmlEl.tagName.toLowerCase()}[placeholder="${placeholder}"]`;

        const isSelect = htmlEl.tagName.toLowerCase() === "select";
        const options = isSelect
          ? Array.from((htmlEl as HTMLSelectElement).options).map((o) => ({
              value: o.value,
              text: o.textContent?.trim() || "",
            }))
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
          currentValue: htmlEl.value,
          isRequired: htmlEl.required,
        };
      })
  );
}

export interface FillReport {
  filled: { field: string; value: string }[];
  skipped: { field: string; reason: string }[];
  needsAttention: { type: string; field?: string; message: string; options?: string[] }[];
  hasCaptcha: boolean;
}

export async function fillWebForm(page: Page, profile: Settings): Promise<FillReport> {
  const fields = await analyzeForm(page);
  const report: FillReport = { filled: [], skipped: [], needsAttention: [], hasCaptcha: false };

  const pageContent = await page.content();
  if (/recaptcha|hcaptcha|captcha/i.test(pageContent)) {
    report.hasCaptcha = true;
    report.needsAttention.push({ type: "captcha", message: "Page has CAPTCHA — needs manual solve" });
  }

  const fileInputs = await page.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    report.needsAttention.push({
      type: "file_upload",
      message: `${fileInputs.length} file upload field(s) — needs manual attachment`,
    });
  }

  for (const field of fields) {
    if (field.currentValue && field.currentValue.length > 0) {
      report.skipped.push({ field: field.label || field.name, reason: "already filled" });
      continue;
    }

    const match = matchField(field, profile);
    if (!match) {
      if (field.isRequired) {
        report.needsAttention.push({
          type: "unmapped_required",
          field: field.label || field.name || field.selector,
          message: `Required field not mapped: "${field.label || field.name}"`,
        });
      } else {
        report.skipped.push({ field: field.label || field.name, reason: "no mapping found" });
      }
      continue;
    }

    try {
      if (field.isSelect) {
        const bestOption = field.options.find(
          (o) =>
            o.text.toLowerCase().includes(match.toLowerCase()) ||
            o.value.toLowerCase().includes(match.toLowerCase())
        );
        if (bestOption) {
          await page.selectOption(field.selector, bestOption.value);
          report.filled.push({ field: field.label || field.name, value: bestOption.text });
        } else {
          report.needsAttention.push({
            type: "select_no_match",
            field: field.label || field.name,
            message: `No matching option for "${match}" in dropdown`,
            options: field.options.map((o) => o.text),
          });
        }
      } else {
        await page.fill(field.selector, match);
        report.filled.push({ field: field.label || field.name, value: match });
      }
    } catch (err) {
      report.needsAttention.push({
        type: "fill_error",
        field: field.label || field.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}

function matchField(field: FormField, profile: Settings): string | null {
  const searchText = [field.label, field.name, field.id, field.placeholder]
    .filter(Boolean)
    .join(" ");

  for (const mapping of FIELD_MAP) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(searchText)) {
        if (mapping.key === "address") {
          return getAddressPart(field, profile);
        }
        return getFieldValue(mapping.key, profile);
      }
    }
  }
  return null;
}

export function generateEmailDraft(
  event: { name: string; startDate?: Date | null; organizerName?: string | null },
  profile: Settings
): string {
  return `Subject: Vendor Application — ${profile.businessName} — ${event.name}

Dear ${event.organizerName || "Event Organizer"},

I am writing to apply as a vendor for ${event.name}${event.startDate ? ` (${event.startDate.toISOString().split("T")[0]})` : ""}.

Business: ${profile.businessName} (${profile.legalName})
Owner: ${profile.owner}
Product: ${profile.productDescription}
Website: ${profile.website}

We are requesting a ${profile.boothSize} indoor booth space. Our display features professional hair care products with live demonstrations.

Contact Information:
  Email: ${profile.email}
  Phone: ${profile.phone}
  Address: ${profile.address}
  EIN: ${profile.ein}

Please let me know the application process, booth pricing, and any required documentation.

Thank you for your consideration.

Best regards,
${profile.owner}
${profile.businessName}
${profile.phone}
${profile.website}`;
}
