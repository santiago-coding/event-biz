import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { prisma } from "@/lib/db";
import { fillWebForm, generateEmailDraft } from "@/lib/automation/form-filler";
import { uploadPhotos } from "@/lib/automation/photo-uploader";
import { mkdirSync } from "fs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const eventIds: string[] = body.eventIds || (body.eventId ? [body.eventId] : []);

  if (eventIds.length === 0) {
    return NextResponse.json({ error: "No event IDs provided" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    return NextResponse.json({ error: "Settings not configured" }, { status: 500 });
  }

  const results: {
    eventId: string;
    eventName: string;
    success: boolean;
    type?: string;
    filled?: number;
    needsAttention?: number;
    hasCaptcha?: boolean;
    error?: string;
  }[] = [];

  const browser = await chromium.launch({ headless: true });

  try {
    for (const eventId of eventIds) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        results.push({ eventId, eventName: "Unknown", success: false, error: "Event not found" });
        continue;
      }

      const appUrl = event.vendorAppUrl || event.link;
      if (!appUrl) {
        await prisma.event.update({
          where: { id: eventId },
          data: { notes: appendNote(event.notes, "No application URL found.") },
        });
        results.push({ eventId, eventName: event.name, success: false, error: "No application URL" });
        continue;
      }

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(appUrl, { timeout: 30000, waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);

        const pageContent = await page.content();
        const hasForm = (await page.$$("form")).length > 0;
        const hasPdfLink = /\.pdf/i.test(pageContent);
        const isEventeny = /eventeny\.com/i.test(appUrl);

        if (isEventeny) {
          await prisma.event.update({
            where: { id: eventId },
            data: {
              status: "researching",
              applicationType: "platform",
              notes: appendNote(event.notes, "Eventeny platform — requires manual login."),
            },
          });
          results.push({ eventId, eventName: event.name, success: false, type: "platform", error: "Platform login required" });
          await context.close();
          continue;
        }

        if (hasPdfLink) {
          const pdfLinks = await page.$$eval('a[href*=".pdf"]', (links) =>
            links.map((a) => ({ text: (a as HTMLAnchorElement).textContent?.trim() || "", href: (a as HTMLAnchorElement).href }))
              .filter((l) => /vendor|application|exhibit/i.test(l.text + l.href))
          );

          if (pdfLinks.length > 0) {
            generateEmailDraft(event, settings);
            await prisma.event.update({
              where: { id: eventId },
              data: {
                status: "researching",
                applicationType: "pdf",
                notes: appendNote(event.notes, `PDF application: ${pdfLinks[0].href}\nEmail draft generated.`),
              },
            });
            results.push({ eventId, eventName: event.name, success: true, type: "pdf" });
            await context.close();
            continue;
          }
        }

        if (hasForm) {
          const report = await fillWebForm(page, settings);

          const photoReport = await uploadPhotos(page);

          mkdirSync("data/screenshots", { recursive: true });
          const screenshotPath = `data/screenshots/${eventId}_form.png`;
          try {
            await page.screenshot({ path: screenshotPath, fullPage: true });
          } catch {
            // screenshot failed, non-critical
          }

          const status = report.hasCaptcha ? "researching" : "applied";
          const noteLines: string[] = [];
          if (report.hasCaptcha) noteLines.push("CAPTCHA present — needs manual solve.");
          if (report.needsAttention.length > 0) noteLines.push(`${report.needsAttention.length} items need attention.`);
          noteLines.push(`Auto-filled ${report.filled.length} fields.`);
          if (photoReport.uploaded.length > 0) noteLines.push(`Uploaded ${photoReport.uploaded.length} photos.`);

          await prisma.event.update({
            where: { id: eventId },
            data: {
              status,
              applicationType: "web_form",
              screenshotPath,
              appliedDate: status === "applied" ? new Date() : undefined,
              notes: appendNote(event.notes, noteLines.join("\n")),
            },
          });

          results.push({
            eventId,
            eventName: event.name,
            success: true,
            type: "web_form",
            filled: report.filled.length,
            needsAttention: report.needsAttention.length,
            hasCaptcha: report.hasCaptcha,
          });
        } else {
          generateEmailDraft(event, settings);
          await prisma.event.update({
            where: { id: eventId },
            data: {
              status: "researching",
              applicationType: "email",
              notes: appendNote(event.notes, "No web form found. Email draft generated."),
            },
          });
          results.push({ eventId, eventName: event.name, success: true, type: "email" });
        }

        await context.close();
      } catch (err) {
        await prisma.event.update({
          where: { id: eventId },
          data: { notes: appendNote(event.notes, `Application error: ${err instanceof Error ? err.message : String(err)}`) },
        });
        results.push({
          eventId,
          eventName: event.name,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  return NextResponse.json({ results });
}

function appendNote(existing: string | null, addition: string): string {
  if (!existing) return addition;
  return existing + "\n" + addition;
}
