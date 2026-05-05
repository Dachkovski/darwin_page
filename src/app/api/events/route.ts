export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { events, optimizationConfigs, variants } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    if (!text) return Response.json({ success: true });
    
    const body = JSON.parse(text);
    
    // We expect the payload to be { events: [...] } due to Tracker batching
    if (!body.events || !Array.isArray(body.events)) {
      return Response.json({ error: "Invalid payload format" }, { status: 400 });
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

    // Get the personal variants count for this visitor to enforce BYOK
    let personalVariantCount = 0;
    const visitorId = body.events[0]?.visitorId;
    if (visitorId) {
      const { eq } = await import('drizzle-orm');
      const pvResult = await db.select().from(variants).where(eq(variants.visitorId, visitorId));
      personalVariantCount = pvResult.length;
    }

    // Check if autonomous evolution is enabled and get BYOK threshold
    const configs = await db.select().from(optimizationConfigs).limit(1);
    const maxFreeGenerations = configs.length > 0 ? configs[0].maxFreeGenerations : 3;

    // Extract BYOK key from cookies
    const userApiKey = req.cookies.get('openai_api_key')?.value;
    const adminToken = req.cookies.get('admin_token')?.value;
    const authPassword = process.env.ADMIN_PASSWORD;
    const isAdmin = !!(authPassword && adminToken === authPassword);

    const dynamicEnv = { ...process.env };
    
    if (userApiKey) {
      dynamicEnv.OPENAI_API_KEY = userApiKey;
    } else if (!isAdmin && personalVariantCount >= maxFreeGenerations) {
      // Enforce BYOK after maxFreeGenerations for non-admins
      delete dynamicEnv.OPENAI_API_KEY;
    }

    const isAdminEvolutionEnabled = configs.length > 0 && configs[0].autoPromoteEnabled;
    const isVisitorEvolutionEnabled = configs.length > 0 && configs[0].personalEvolutionEnabled;

    const shouldEvolve = (isAdmin && isAdminEvolutionEnabled) || (!isAdmin && isVisitorEvolutionEnabled);

    if (shouldEvolve) {
      // Check if we have a valid key to run evolution
      const hasKey = !!dynamicEnv.OPENAI_API_KEY;
      if (hasKey) {
        const visitorId = body.events[0]?.visitorId;
        const { after } = await import('next/server');
        after(async () => {
          try {
            const { runEvolutionCycle } = await import('@/lib/evolution');
            await runEvolutionCycle(dynamicEnv, visitorId);
          } catch (e) {
            console.error('Autonomous loop error:', e);
          }
        });
      }
    }

    if (body.isExit && (body.startImage || body.latestImage) && body.events.length > 0) {
      const exitEvent = body.events[body.events.length - 1]; // Use the last event as context
      
      const visionEnv = { ...dynamicEnv };
      if (!shouldEvolve || !dynamicEnv.OPENAI_API_KEY) {
        delete visionEnv.OPENAI_API_KEY; // Skip OpenAI call to save API costs if disabled or no key
      }

      const { after } = await import('next/server');
      after(async () => {
        try {
          const { analyzeVisuals } = await import('@/lib/vision');
          await analyzeVisuals(body.startImage, body.latestImage, exitEvent.variantId, exitEvent.visitorId, exitEvent.sessionId, visionEnv);
        } catch (e) {
          console.error('Vision API error:', e);
        }
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to track events:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
