import { db } from './index';
import { variants, optimizationConfigs, researchLogs } from './schema';
import crypto from 'crypto';

async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Optimization Config
  console.log('Inserting Optimization Config...');
  await db.insert(optimizationConfigs).values({
    id: crypto.randomUUID(),
    activeMetricName: 'default_score',
    scoreWeightsJson: JSON.stringify({
      cta_click_rate: 0.45,
      scroll_depth_rate: 0.25,
      normalized_time_on_page: 0.20,
      bounce_rate: -0.10
    }),
    minVisitorsPerVariant: 100,
    minExperimentDays: 3,
    minScoreImprovement: 0.10,
    autoPromoteEnabled: false
  });

  // 2. Initial Variant (The Winner)
  console.log('Inserting Initial Variant...');
  const variantId = 'hero_a_001';
  await db.insert(variants).values({
    id: variantId,
    generation: 1,
    status: 'active',
    hypothesis: 'Initial base variant for the project.',
    mutationReason: 'Genesis',
    contentJson: JSON.stringify({
      id: variantId,
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
    })
  });

  // 3. Initial Research Log
  console.log('Inserting Genesis Research Log...');
  await db.insert(researchLogs).values({
    id: crypto.randomUUID(),
    generation: 1,
    action: 'seed_database',
    observation: 'No existing data.',
    hypothesis: 'Creating an initial variant will start the feedback loop.',
    mutation: 'None',
    result: 'Variant hero_a_001 activated.',
    decision: 'Start data collection.',
    metricsJson: '{}'
  });

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
