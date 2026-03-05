import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreEvent } from "@/lib/scoring";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const state = searchParams.get("state");
  const minScore = searchParams.get("minScore");
  const sort = searchParams.get("sort") || "score";
  const order = searchParams.get("order") || "desc";
  const limit = parseInt(searchParams.get("limit") || "100");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (state) where.state = state;
  if (minScore) where.score = { gte: parseInt(minScore) };

  const orderBy: Record<string, string> = {};
  orderBy[sort] = order;

  const events = await prisma.event.findMany({
    where,
    orderBy,
    take: limit,
  });

  const stats = {
    total: await prisma.event.count(),
    discovered: await prisma.event.count({ where: { status: "discovered" } }),
    researching: await prisma.event.count({ where: { status: "researching" } }),
    applied: await prisma.event.count({ where: { status: "applied" } }),
    accepted: await prisma.event.count({ where: { status: "accepted" } }),
    rejected: await prisma.event.count({ where: { status: "rejected" } }),
    scheduled: await prisma.event.count({ where: { status: "scheduled" } }),
    completed: await prisma.event.count({ where: { status: "completed" } }),
  };

  return NextResponse.json({ events, stats });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const score = scoreEvent(body);

  const event = await prisma.event.create({
    data: {
      name: body.name,
      state: body.state || null,
      location: body.location || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      category: body.category || null,
      attendance: body.attendance || null,
      boothType: body.boothType || null,
      boothCost: body.boothCost || null,
      source: body.source || "manual",
      link: body.link || null,
      vendorAppUrl: body.vendorAppUrl || null,
      appDeadline: body.appDeadline ? new Date(body.appDeadline) : null,
      applicationType: body.applicationType || null,
      organizerName: body.organizerName || null,
      organizerEmail: body.organizerEmail || null,
      organizerPhone: body.organizerPhone || null,
      score,
      status: body.status || "discovered",
      hasHairVendor: body.hasHairVendor ?? null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
