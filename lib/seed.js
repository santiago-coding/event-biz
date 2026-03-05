/**
 * Seed script: initializes default Settings and optionally migrates
 * events from the v0.1 JSON database to SQLite.
 *
 * Run: node lib/seed.js
 */
import path from "node:path";
import { fileURLToPath } from "url";
import { readFileSync, existsSync } from "fs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "eventbiz.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  console.log("✓ Default settings ensured");

  const jsonPath = path.join(__dirname, "..", "data", "events.json");
  if (existsSync(jsonPath)) {
    const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const events = raw.events || [];
    let migrated = 0;

    for (const e of events) {
      const existing = await prisma.event.findFirst({
        where: { name: e.name, source: e.source || "unknown" },
      });
      if (existing) continue;

      await prisma.event.create({
        data: {
          name: e.name || "Unnamed Event",
          state: e.state || null,
          location: e.location || null,
          startDate: e.startDate ? new Date(e.startDate) : null,
          endDate: e.endDate ? new Date(e.endDate) : null,
          category: e.category || null,
          attendance: e.attendance ? parseInt(e.attendance) : null,
          boothType: e.boothType || null,
          boothCost: e.boothCost ? parseFloat(e.boothCost) : null,
          source: e.source || "unknown",
          link: e.link || null,
          vendorAppUrl: e.vendorApplicationUrl || e.vendorAppUrl || null,
          appDeadline: e.applicationDeadline ? new Date(e.applicationDeadline) : null,
          applicationType: e.applicationType || null,
          organizerName: e.organizerName || null,
          organizerEmail: e.organizerEmail || null,
          organizerPhone: e.organizerPhone || null,
          score: e.score || 0,
          status: e.status || "discovered",
          hasHairVendor: e.hasHairVendor ?? null,
          notes: e.notes || null,
          screenshotPath: e.screenshotPath || null,
          appliedDate: e.appliedDate ? new Date(e.appliedDate) : null,
          acceptedDate: e.acceptedDate ? new Date(e.acceptedDate) : null,
        },
      });
      migrated++;
    }
    console.log(`✓ Migrated ${migrated} events from JSON database`);
  } else {
    console.log("  No JSON database found — starting fresh");
  }

  const count = await prisma.event.count();
  console.log(`  Total events in database: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
