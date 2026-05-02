import LandingPageRenderer, { PageVariant } from "@/components/LandingPageRenderer";
import EvolutionState from "@/components/EvolutionState";

// Fallback initial variant until DB is connected
const INITIAL_VARIANT: PageVariant = {
  id: "hero_a_001",
  hero_headline: "This website improves itself.",
  hero_subheadline: "A minimal self-optimizing content system. It generates variants, measures behavior, scores outcomes and evolves over generations.",
  primary_cta_text: "See the feedback loop",
  secondary_cta_text: "Read the docs",
  value_propositions: [
    "Hypothesis-Driven: Every mutation is backed by a specific hypothesis.",
    "Measurable Fitness: Clear fitness functions define what 'better' actually means.",
    "Traceable Decisions: A robust ResearchLog ensures reasoning is transparent."
  ],
  footer_text: "DarwinPage - A Karpathy-style AutoResearch loop."
};

export default function Home() {
  return (
    <>
      <LandingPageRenderer variant={INITIAL_VARIANT} />
      <EvolutionState />
    </>
  );
}
