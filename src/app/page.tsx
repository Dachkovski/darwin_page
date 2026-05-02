import AppSandboxRenderer, { AppVariant } from "@/components/AppSandboxRenderer";
import EvolutionState from "@/components/EvolutionState";
import Tracker from "@/components/Tracker";
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
    let activeVariantsList = [];
    
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
