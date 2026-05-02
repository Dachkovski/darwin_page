import { getDb } from './db';
import { events, metricSnapshots, optimizationConfigs, researchLogs, variants } from '@/db/schema';
import { callLLM } from './llm';
import { desc, eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function runEvolutionCycle(env: any) {
  const db = getDb(env);

  // 1. Get optimization config
  const configs = await db.select().from(optimizationConfigs).limit(1);
  if (configs.length === 0) return { status: 'error', message: 'No config found' };
  const config = configs[0];
  const weights = JSON.parse(config.scoreWeightsJson);

  // 2. Check if we meet threshold for autonomous evolution (e.g., minimum 10 visitors)
  const activeVariants = await db.select().from(variants).where(eq(variants.status, 'active')).orderBy(desc(variants.generation)).limit(1);
  if (activeVariants.length === 0) return { status: 'error', message: 'No active variant' };
  const variant = activeVariants[0];

  const variantEvents = await db.select().from(events).where(eq(events.variantId, variant.id));
  const uniqueVisitors = new Set(variantEvents.map(e => e.visitorId)).size;

  // Example simple autonomous threshold from DB could be configurable
  if (uniqueVisitors < 5) {
    return { status: 'skipped', message: `Not enough data yet. Only ${uniqueVisitors} visitors.` };
  }

  // --- ANALYZE PHASE ---
  const pageViews = variantEvents.filter(e => e.eventType === 'page_view').length;
  const ctaClicks = variantEvents.filter(e => e.eventType === 'cta_click').length;
  const ctaClickRate = pageViews > 0 ? ctaClicks / pageViews : 0;
  
  const score = (ctaClickRate * weights.cta_click_rate); // simplified for edge fast run

  let observation = "Auto-generated analysis.";
  let hypothesis = "We need a more engaging CTA.";

  const userPrompt = `Variant ID: ${variant.id}\nScore: ${score}\nCTA Rate: ${ctaClickRate}\nJSON: ${variant.contentJson}\nProvide an observation and hypothesis.`;
  
  try {
    const llmResponse = await callLLM(userPrompt, `You are DarwinPage UX Researcher. Reply in strict JSON: {"observation":"", "hypothesis":""}`);
    const parsed = JSON.parse(llmResponse.replace(/```json/g, '').replace(/```/g, ''));
    observation = parsed.observation || observation;
    hypothesis = parsed.hypothesis || hypothesis;
  } catch (e) {}

  await db.insert(researchLogs).values({
    id: crypto.randomUUID(),
    generation: variant.generation,
    action: 'analyze_metrics',
    observation,
    hypothesis,
    mutation: 'Pending evolution',
    result: `Score: ${score.toFixed(4)}`,
    decision: 'Moving to evolve phase',
    metricsJson: JSON.stringify({ score })
  });

  // --- EVOLVE PHASE ---
  const evolvePrompt = `Old Content:\n${variant.contentJson}\nObservation: ${observation}\nHypothesis: ${hypothesis}\nGenerate NEW JSON content strictly matching the previous schema.`;
  let newContentJson = variant.contentJson;

  try {
    const llmResponse = await callLLM(evolvePrompt, `You are DarwinPage Generator. Return valid JSON only.`);
    let jsonStr = llmResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    JSON.parse(jsonStr); // validate
    newContentJson = jsonStr;
  } catch (e) {
    const fb = JSON.parse(newContentJson);
    fb.primary_cta_text += " (Auto Evolved)";
    newContentJson = JSON.stringify(fb);
  }

  const newGen = variant.generation + 1;
  const newVariantId = `hero_${String.fromCharCode(97 + (newGen % 26))}_${String(newGen).padStart(3, '0')}`;
  
  const parsedContent = JSON.parse(newContentJson);
  parsedContent.id = newVariantId;
  
  // Update old, insert new
  await db.update(variants).set({ status: 'archived', archivedAt: new Date() }).where(eq(variants.id, variant.id));
  await db.insert(variants).values({
    id: newVariantId,
    generation: newGen,
    parentVariantId: variant.id,
    status: 'active',
    contentJson: JSON.stringify(parsedContent),
    hypothesis,
    mutationReason: 'Autonomous Cron Evolution'
  });

  return { status: 'evolved', message: `Successfully evolved from Gen ${variant.generation} to Gen ${newGen}` };
}
