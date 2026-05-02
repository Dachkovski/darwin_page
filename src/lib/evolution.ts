import { getDb } from './db';
import { events, metricSnapshots, optimizationConfigs, researchLogs, variants } from '@/db/schema';
import { callLLM } from './llm';
import { desc, eq, and, isNull, asc } from 'drizzle-orm';
import crypto from 'crypto';

export async function runEvolutionCycle(env: any, targetVisitorId?: string) {
  const db = getDb(env);

  // 1. Get optimization config
  const configs = await db.select().from(optimizationConfigs).limit(1);
  if (configs.length === 0) return { status: 'error', message: 'No config found' };
  const config = configs[0];
  const weights = JSON.parse(config.scoreWeightsJson);

  // 2. Find the active variant to evolve
  let activeVariants = [];
  if (targetVisitorId) {
    activeVariants = await db.select().from(variants)
      .where(and(eq(variants.status, 'active'), eq(variants.visitorId, targetVisitorId)))
      .orderBy(desc(variants.generation)).limit(1);
    if (activeVariants.length === 0) {
      activeVariants = await db.select().from(variants)
        .where(and(eq(variants.status, 'active'), isNull(variants.visitorId)))
        .orderBy(desc(variants.generation)).limit(1);
    }
  } else {
    activeVariants = await db.select().from(variants)
      .where(and(eq(variants.status, 'active'), isNull(variants.visitorId)))
      .orderBy(desc(variants.generation)).limit(1);
  }

  if (activeVariants.length === 0) return { status: 'error', message: 'No active variant' };
  const variant = activeVariants[0];

  let variantEvents = [];
  let userHistoryContext = "";

  if (targetVisitorId) {
    // Fetch ALL events for this specific user across all variants they've seen
    const allUserEvents = await db.select().from(events).where(eq(events.visitorId, targetVisitorId)).orderBy(desc(events.timestamp)); // desc to get newest first
    variantEvents = allUserEvents.filter(e => e.variantId === variant.id);
    
    // Build context
    const interactions = allUserEvents.filter(e => e.eventType === 'interaction_click').map(e => {
        try { return JSON.parse(e.metadataJson || '{}').text; } catch(err){ return null; }
    }).filter(Boolean);
    
    // Calculate total time
    let totalTime = 0;
    allUserEvents.filter(e => e.eventType === 'time_on_page').forEach(e => {
        try { totalTime += JSON.parse(e.metadataJson || '{}').seconds || 0; } catch(err){}
    });
    
    // COOLDOWN CHECK: Don't evolve if the current variant was created less than 2 minutes ago
    // or if they haven't spent enough time on it yet to justify an evolution.
    const now = Date.now();
    const createdTime = variant.createdAt ? new Date(variant.createdAt).getTime() : 0;
    if (now - createdTime < 2 * 60 * 1000) {
      return { status: 'skipped', message: 'Personal variant is too new (cooldown active).' };
    }

    userHistoryContext = `\n--- USER JOURNEY CONTEXT ---
This evolution is HIGHLY PERSONALIZED for a specific user.
The user has spent a total of ${totalTime} seconds interacting with your previous variants.
Recently clicked elements (newest first): ${interactions.slice(0, 15).join(', ')}.
CRITICAL INSTRUCTION: Use this history to generate a NEW, customized experience. Do NOT show them the exact same thing if they already explored it. Build successively on their progress!
EXTREME PERSONALIZATION REQUIRED: You MUST include a personalized greeting or status message explicitly acknowledging their progress (e.g., "Welcome back! You have explored for ${totalTime} seconds and clicked on X, Y, Z."). Make them feel like the app is alive and watching them.`;
  } else {
    variantEvents = await db.select().from(events).where(eq(events.variantId, variant.id));
    const uniqueVisitors = new Set(variantEvents.map(e => e.visitorId)).size;
    if (uniqueVisitors < config.minVisitorsPerVariant) {
      return { status: 'skipped', message: `Not enough data yet. Only ${uniqueVisitors} visitors out of ${config.minVisitorsPerVariant} required.` };
    }
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
    let jsonStr = llmResponse.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    observation = parsed.observation || observation;
    hypothesis = parsed.hypothesis || hypothesis;
  } catch (e) {
    console.error("Analysis LLM failed:", e);
  }

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
${userHistoryContext}

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
    let jsonStr = llmResponse.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    JSON.parse(jsonStr); // validate
    newContentJson = jsonStr;
  } catch (e) {
    console.error("Evolution LLM call failed:", e);
    const fb = JSON.parse(newContentJson);
    fb.html = fb.html + "\n<!-- Evolved (Failed to parse) -->";
    newContentJson = JSON.stringify(fb);
  }

  const newGen = variant.generation + 1;
  const uniqueHash = Math.random().toString(36).substring(2, 10);
  const newVariantId = `hero_${String.fromCharCode(97 + (newGen % 26))}_${String(newGen).padStart(3, '0')}_${uniqueHash}`;
  
  const parsedContent = JSON.parse(newContentJson);
  parsedContent.id = newVariantId;
  
  // Update old, insert new
  if (!variant.visitorId || variant.visitorId === targetVisitorId) {
    // If it's a global evolution, archive the old global variant
    // If it's a personal evolution based on a previous personal variant, archive the old personal variant
    // If it's a personal evolution based on a global variant, DO NOT archive the global variant!
    if (!(targetVisitorId && !variant.visitorId)) {
      await db.update(variants).set({ status: 'archived', archivedAt: new Date() }).where(eq(variants.id, variant.id));
    }
  }
  await db.insert(variants).values({
    id: newVariantId,
    visitorId: targetVisitorId || null,
    generation: newGen,
    parentVariantId: variant.id,
    status: 'active',
    contentJson: JSON.stringify(parsedContent),
    hypothesis,
    mutationReason: 'Autonomous Cron Evolution'
  });

  return { status: 'evolved', message: `Successfully evolved from Gen ${variant.generation} to Gen ${newGen}` };
}
