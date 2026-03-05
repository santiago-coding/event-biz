import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  let settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "default" } });
  }
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const data: Record<string, unknown> = {};
  const allowedFields = [
    "businessName", "legalName", "owner", "email", "phone", "address",
    "ein", "website", "boothSize", "boothType", "productCategory",
    "productDescription", "targetDemographic", "crewSize",
    "dailySalesTarget", "expenseBudget",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  return NextResponse.json(settings);
}
