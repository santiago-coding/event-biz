import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  const allowedFields = [
    "name", "state", "location", "startDate", "endDate", "category",
    "attendance", "boothType", "boothCost", "source", "link", "vendorAppUrl",
    "appDeadline", "applicationType", "organizerName", "organizerEmail",
    "organizerPhone", "score", "status", "hasHairVendor", "notes",
    "screenshotPath", "appliedDate", "acceptedDate",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (["startDate", "endDate", "appDeadline", "appliedDate", "acceptedDate"].includes(field)) {
        data[field] = body[field] ? new Date(body[field]) : null;
      } else {
        data[field] = body[field];
      }
    }
  }

  try {
    const event = await prisma.event.update({ where: { id }, data });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
}
