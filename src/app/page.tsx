import AppSandboxRenderer, { AppVariant } from "@/components/AppSandboxRenderer";
import EvolutionState from "@/components/EvolutionState";
import Tracker from "@/components/Tracker";
import { db } from "@/db";
import { variants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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

  try {
    const activeVariantsList = await db
      .select()
      .from(variants)
      .where(eq(variants.status, 'active'))
      .orderBy(desc(variants.generation))
      .limit(1);

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

  return (
    <>
      <Tracker variantId={trackingId} />
      <AppSandboxRenderer variant={activeVariantData} />
      <EvolutionState 
        generation={generation}
        variantId={trackingId}
        score={score}
        lastMutation={lastMutation}
      />
    </>
  );
}
