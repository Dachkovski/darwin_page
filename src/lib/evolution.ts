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
  if (uniqueVisitors < config.minVisitorsPerVariant) {
    return { status: 'skipped', message: `Not enough data yet. Only ${uniqueVisitors} visitors out of ${config.minVisitorsPerVariant} required.` };
  }

  // --- ANALYZE PHASE ---
  const pageViews = variantEvents.filter(e => e.eventType === 'page_view').length;
  const ctaClicks = variantEvents.filter(e => e.eventType === 'cta_click').length;
  const ctaClickRate = pageViews > 0 ? ctaClicks / pageViews : 0;
  
  const timeEvents = variantEvents.filter(e => e.eventType === 'time_on_page');
  let totalSeconds = 0;
  timeEvents.forEach(e => {
    try {
      const meta = JSON.parse(e.metadataJson || '{}');
      if (meta.seconds) totalSeconds += meta.seconds;
    } catch (err) {}
  });
  // Cap at 300s (5 mins) for normalization
  const avgTimeOnPage = timeEvents.length > 0 ? Math.min(totalSeconds / timeEvents.length, 300) : 0;
  const normalizedTimeOnPage = avgTimeOnPage / 300; // 0 to 1
  
  const bounces = variantEvents.filter(e => e.eventType === 'bounce').length;
  const bounceRate = pageViews > 0 ? bounces / pageViews : 0;

  const score = (ctaClickRate * (weights.cta_click_rate || 0)) + (bounceRate * (weights.bounce_rate || 0)) + (normalizedTimeOnPage * (weights.time_on_page || 0));

  let observation = "Auto-generated analysis.";
  let hypothesis = "We need a more engaging CTA.";

  const userPrompt = `Variant ID: ${variant.id}
Score: ${score}
CTA Rate: ${ctaClickRate}
Goal: ${config.optimizationGoal}
JSON: ${variant.contentJson}
Based on the goal and metrics, provide an observation and hypothesis.`;
  
  try {
    const llmResponse = await callLLM(userPrompt, `${config.llmSystemPrompt} Reply in strict JSON: {"observation":"", "hypothesis":""}`);
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
  let parsedOld = { html: "", css: "", js: "" };
  try { parsedOld = JSON.parse(variant.contentJson); } catch(e){}

  const evolvePrompt = `Goal: ${config.optimizationGoal}

Observation: ${observation}
Hypothesis: ${hypothesis}

You are an autonomous software engineer. Your task is to rewrite the application to fulfill the hypothesis and maximize user interaction.
You have access to Tailwind CSS classes in your HTML. Do NOT use markdown.
To track events (your fitness function), you MUST use \`window.darwin.trackEvent('event_name')\` in your JS. (e.g. window.darwin.trackEvent('cta_click')).

Return STRICTLY a JSON object with this exact schema:
{
  "html": "raw html code for the body",
  "css": "raw css styles if needed, else empty string",
  "js": "vanilla javascript code without script tags"
}
CRITICAL ENGINE RULE: You MUST return ONLY valid JSON. No markdown wrappers.`;
  let newContentJson = variant.contentJson;

  try {
    const llmResponse = await callLLM(evolvePrompt, `${config.llmSystemPrompt} Return valid JSON only.`);
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
