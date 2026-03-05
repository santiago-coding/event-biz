import type { Page } from "playwright";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

interface UploadReport {
  uploaded: { field: string; file: string }[];
  skipped: { field: string; reason: string }[];
}

const PHOTO_DIR = join(process.cwd(), "data", "photos");

export async function uploadPhotos(page: Page): Promise<UploadReport> {
  const report: UploadReport = { uploaded: [], skipped: [] };

  if (!existsSync(PHOTO_DIR)) {
    return report;
  }

  const photos = readdirSync(PHOTO_DIR).filter((f) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
  );

  if (photos.length === 0) return report;

  const fileInputs = await page.$$('input[type="file"]');

  for (const input of fileInputs) {
    const label = await input.evaluate((el) => {
      const htmlEl = el as HTMLInputElement;
      if (htmlEl.id) {
        const labelEl = document.querySelector(`label[for="${htmlEl.id}"]`);
        if (labelEl) return labelEl.textContent?.trim() || "";
      }
      const parent = htmlEl.parentElement;
      if (parent) {
        const parentLabel = parent.querySelector("label");
        if (parentLabel) return parentLabel.textContent?.trim() || "";
      }
      return htmlEl.name || "file_upload";
    });

    const labelLower = label.toLowerCase();
    let bestPhoto: string | null = null;

    if (/logo/i.test(labelLower)) {
      bestPhoto = photos.find((p) => /logo/i.test(p)) || null;
    } else if (/booth/i.test(labelLower)) {
      bestPhoto = photos.find((p) => /booth/i.test(p)) || null;
    } else if (/product/i.test(labelLower)) {
      bestPhoto = photos.find((p) => /product/i.test(p)) || null;
    }

    if (!bestPhoto) bestPhoto = photos[0];

    try {
      await input.setInputFiles(join(PHOTO_DIR, bestPhoto));
      report.uploaded.push({ field: label, file: bestPhoto });
    } catch (err) {
      report.skipped.push({
        field: label,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}
