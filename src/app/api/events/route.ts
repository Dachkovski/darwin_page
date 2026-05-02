import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { events, optimizationConfigs } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text) return NextResponse.json({ success: true });
    
    const body = JSON.parse(text);
    
    // We expect the payload to be { events: [...] } due to Tracker batching
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const db = getDb((process.env as any) || {});

    // Insert batched events
    const valuesToInsert = body.events.map((e: any) => ({
      id: crypto.randomUUID(),
      visitorId: e.visitorId,
      sessionId: e.sessionId,
      variantId: e.variantId,
      eventType: e.eventType,
      metadataJson: e.metadataJson || null,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

    if (valuesToInsert.length > 0) {
      await db.insert(events).values(valuesToInsert);
    }

    // Check if autonomous evolution is enabled
    const configs = await db.select().from(optimizationConfigs).limit(1);
    if (configs.length > 0 && configs[0].autoPromoteEnabled) {
      // Fire and forget the evolution cycle!
      import('@/lib/evolution').then(({ runEvolutionCycle }) => {
        const visitorId = body.events[0]?.visitorId;
        runEvolutionCycle(process.env, visitorId).catch(e => console.error('Autonomous loop error:', e));
      });
    }

    // Fire and forget vision analysis if this payload is from an exit event
    if (body.isExit && (body.startImage || body.latestImage) && body.events.length > 0) {
      const exitEvent = body.events[body.events.length - 1]; // Use the last event as context
      import('@/lib/vision').then(({ analyzeVisuals }) => {
        analyzeVisuals(body.startImage, body.latestImage, exitEvent.variantId, exitEvent.visitorId, exitEvent.sessionId, process.env)
          .catch(e => console.error('Vision API error:', e));
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to track events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
