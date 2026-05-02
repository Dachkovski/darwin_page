import LandingPageRenderer, { PageVariant } from "@/components/LandingPageRenderer";
import EvolutionState from "@/components/EvolutionState";
import Tracker from "@/components/Tracker";
import { db } from "@/db";
import { variants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Fallback initial variant in case DB is completely empty or errors
const FALLBACK_VARIANT: PageVariant = {
  id: "fallback_001",
  hero_headline: "This website improves itself.",
  hero_subheadline: "A minimal self-optimizing content system.",
  primary_cta_text: "See the feedback loop",
  secondary_cta_text: "Read the docs",
  value_propositions: ["System is starting up..."],
  footer_text: "DarwinPage - Booting..."
};

export default async function Home() {
  // Fetch the active variant from the database
  let activeVariantData: PageVariant = FALLBACK_VARIANT;
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
      activeVariantData = JSON.parse(v.contentJson) as PageVariant;
      generation = v.generation;
      lastMutation = v.mutationReason || "Unknown";
      
      // We would fetch the current score from MetricSnapshot here eventually,
      // but for now we default to 0.00 as we just started
    }
  } catch (error) {
    console.error("Error fetching variant:", error);
  }

  return (
    <>
      <Tracker variantId={activeVariantData.id} />
      <LandingPageRenderer variant={activeVariantData} />
      <EvolutionState 
        generation={generation}
        variantId={activeVariantData.id}
        score={score}
        lastMutation={lastMutation}
      />
    </>
  );
}
