export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optimizationConfigs } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const authPassword = process.env.ADMIN_PASSWORD;
    const adminToken = req.cookies.get('admin_token')?.value;

    if (authPassword && adminToken !== authPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as any;
    const db = getDb((process.env as any) || {});

    // Delete existing to keep it simple, then insert new
    await db.delete(optimizationConfigs);
    
    await db.insert(optimizationConfigs).values({
      id: "default",
      autoPromoteEnabled: body.autoPromoteEnabled,
      personalEvolutionEnabled: body.personalEvolutionEnabled !== undefined ? body.personalEvolutionEnabled : true,
      minVisitorsPerVariant: body.minVisitorsPerVariant,
      maxFreeGenerations: body.maxFreeGenerations !== undefined ? body.maxFreeGenerations : 3,
      llmSystemPrompt: body.llmSystemPrompt,
      optimizationGoal: body.optimizationGoal,
      activeMetricName: body.activeMetricName || 'default_score',
      scoreWeightsJson: body.scoreWeightsJson || JSON.stringify({ cta_click_rate: 1.0, scroll_depth_rate: 0.5, time_on_page: 0.2, bounce_rate: -0.2 })
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
