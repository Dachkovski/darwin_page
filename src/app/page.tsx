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
    const activeVariants = await db
      .select()
      .from(variants)
      .where(eq(variants.status, 'active'))
      .orderBy(desc(variants.generation))
      .limit(1);

    if (activeVariants.length > 0) {
      const v = activeVariants[0];
      activeVariantData = JSON.parse(v.contentJson) as AppVariant;
      generation = v.generation;
      lastMutation = v.mutationReason || "Unknown";
    }
  } catch (error) {
    console.error("Error fetching variant:", error);
  }

  return (
    <>
      <Tracker variantId={activeVariants?.length > 0 ? activeVariants[0].id : "fallback"} />
      <AppSandboxRenderer variant={activeVariantData} />
      <EvolutionState 
        generation={generation}
        variantId={activeVariants?.length > 0 ? activeVariants[0].id : "fallback"}
        score={score}
        lastMutation={lastMutation}
      />
    </>
  );
}
