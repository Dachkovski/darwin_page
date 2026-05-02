export const runtime = 'edge';
import AppSandboxRenderer, { AppVariant } from "@/components/AppSandboxRenderer";
import EvolutionState from "@/components/EvolutionState";
import Tracker from "@/components/Tracker";
import ApiKeyModal from "@/components/ApiKeyModal";
import { db } from "@/db";
import { variants, optimizationConfigs } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { cookies } from "next/headers";

const FALLBACK_APP: AppVariant = {
  html: "<div style='color:white;text-align:center;margin-top:20%'><h1>App Engine Booting...</h1></div>",
  css: "body { background: black; }",
  js: ""
};

export default async function Home() {
  let activeVariantData: AppVariant = FALLBACK_APP;
  let generation = 1;
  let score = 0;
  let lastMutation = "Genesis";
  const cookieStore = await cookies();
  const visitorId = cookieStore.get('visitor_id')?.value;

  try {
    let activeVariantsList: any[] = [];
    
    // First, try to find a personalized variant for this specific user
    if (visitorId) {
      activeVariantsList = await db
        .select()
        .from(variants)
        .where(and(eq(variants.status, 'active'), eq(variants.visitorId, visitorId)))
        .orderBy(desc(variants.generation))
        .limit(1);
    }

    // If no personalized variant exists, fall back to the global active variant
    if (activeVariantsList.length === 0) {
      activeVariantsList = await db
        .select()
        .from(variants)
        .where(and(eq(variants.status, 'active'), isNull(variants.visitorId)))
        .orderBy(desc(variants.generation))
        .limit(1);
    }

    if (activeVariantsList.length > 0) {
      const v = activeVariantsList[0];
      activeVariantData = JSON.parse(v.contentJson) as AppVariant;
      // Inject ID for tracking
      (activeVariantData as any).id = v.id;
      generation = v.generation;
      lastMutation = v.mutationReason || "Unknown";
    }
  } catch (error) {
    console.error("Error fetching variant:", error);
  }

  const trackingId = (activeVariantData as any).id || "fallback";

  let activeMetricName = "Unknown Metric";
  try {
    const configs = await db.select().from(optimizationConfigs).limit(1);
    if (configs.length > 0 && configs[0].activeMetricName) {
      activeMetricName = configs[0].activeMetricName;
    }
  } catch(e) {}

  return (
    <>
      {/* Unalterable Fixed Badges */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        <a href="https://github.com/Dachkovski/darwin_page" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-neutral-900/80 backdrop-blur border border-neutral-700 rounded-full text-xs font-mono text-white flex items-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg">
          <span>GitHub Repo</span>
        </a>
        <a href="/insights" className="px-3 py-1.5 bg-purple-900/80 backdrop-blur border border-purple-700 rounded-full text-xs font-mono text-purple-100 flex items-center gap-2 hover:bg-purple-800 transition-colors shadow-lg">
          <span>Public Dashboard</span>
        </a>
      </div>

      <ApiKeyModal generation={generation} />
      <Tracker variantId={trackingId} visitorId={visitorId} />
      <AppSandboxRenderer variant={activeVariantData} />
      <EvolutionState 
        generation={generation}
        variantId={trackingId}
        score={score}
        lastMutation={lastMutation}
        activeMetricName={activeMetricName}
      />
    </>
  );
}
