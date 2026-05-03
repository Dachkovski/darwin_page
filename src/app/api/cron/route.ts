export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import { runEvolutionCycle } from "@/lib/evolution";

export async function GET(req: NextRequest) {
  // Optional security: Ensure cron is called via Cloudflare internal token or header
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { getDb } = await import('@/lib/db');
    const { optimizationConfigs } = await import('@/db/schema');
    const db = getDb(process.env as any);
    const configs = await db.select().from(optimizationConfigs).limit(1);
    
    if (configs.length > 0 && !configs[0].autoPromoteEnabled) {
      return NextResponse.json({ message: 'Global Autonomous Loop is disabled in Admin config.' });
    }

    // process.env contains the Cloudflare D1 binding in Pages Edge Runtime
    const result = await runEvolutionCycle(process.env);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cron evolution failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
