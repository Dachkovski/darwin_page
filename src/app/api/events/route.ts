import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // basic validation
    if (!body.visitorId || !body.sessionId || !body.variantId || !body.eventType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await db.insert(events).values({
      id: crypto.randomUUID(),
      visitorId: body.visitorId,
      sessionId: body.sessionId,
      variantId: body.variantId,
      eventType: body.eventType,
      metadataJson: body.metadata ? JSON.stringify(body.metadata) : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to track event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
