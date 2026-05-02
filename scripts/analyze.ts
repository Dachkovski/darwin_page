import { db } from '../src/db/index';
import { events, metricSnapshots, optimizationConfigs, researchLogs, variants } from '../src/db/schema';
import { callLLM } from '../src/lib/llm';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

async function analyze() {
  console.log('📊 Starting Analysis Phase...');

  // 1. Get optimization config
  const configs = await db.select().from(optimizationConfigs).limit(1);
  if (configs.length === 0) {
    throw new Error("No optimization config found. Please run seed.");
  }
  const config = configs[0];
  const weights = JSON.parse(config.scoreWeightsJson);

  // 2. Get active variants
  const activeVariants = await db.select().from(variants).where(eq(variants.status, 'active'));
  if (activeVariants.length === 0) {
    console.log('No active variants to analyze.');
    process.exit(0);
  }

  for (const variant of activeVariants) {
    console.log(`\nAnalyzing variant: ${variant.id} (Gen ${variant.generation})`);

    // 3. Aggregate metrics
    const variantEvents = await db.select().from(events).where(eq(events.variantId, variant.id));
    
    const uniqueVisitors = new Set(variantEvents.map(e => e.visitorId)).size;
    const pageViews = variantEvents.filter(e => e.eventType === 'page_view').length;
    const ctaClicks = variantEvents.filter(e => e.eventType === 'cta_click').length;
    
    // Bounce rate: sessions with only page_view and variant_seen, or explicit 'bounce' event
    const bounces = variantEvents.filter(e => e.eventType === 'bounce').length;
    
    // Scroll depth average
    const scrolls25 = variantEvents.filter(e => e.eventType === 'scroll_depth_25').length;
    const scrolls50 = variantEvents.filter(e => e.eventType === 'scroll_depth_50').length;
    const scrolls75 = variantEvents.filter(e => e.eventType === 'scroll_depth_75').length;
    const scrolls100 = variantEvents.filter(e => e.eventType === 'scroll_depth_100').length;
    
    // Time on page average
    const timeEvents = variantEvents.filter(e => e.eventType === 'time_on_page');
    let totalTime = 0;
    timeEvents.forEach(e => {
      try {
        if (e.metadataJson) {
          const meta = JSON.parse(e.metadataJson);
          totalTime += meta.seconds || 0;
        }
      } catch (err) {}
    });

    const ctaClickRate = pageViews > 0 ? ctaClicks / pageViews : 0;
    const bounceRate = pageViews > 0 ? bounces / pageViews : 0;
    const avgTimeOnPage = timeEvents.length > 0 ? totalTime / timeEvents.length : 0;
    
    // normalized time on page (assuming 60 seconds is a "perfect" 1.0 score)
    const normalizedTimeOnPage = Math.min(avgTimeOnPage / 60, 1.0);

    // rudimentary scroll depth rate: average of how far people got
    const scrollScore = pageViews > 0 ? 
      ((scrolls25 * 0.25) + (scrolls50 * 0.25) + (scrolls75 * 0.25) + (scrolls100 * 0.25)) / pageViews : 0;

    // Interaction / Dead Clicks summary
    const interactionEvents = variantEvents.filter(e => e.eventType === 'interaction_click');
    const interactionSummary: Record<string, number> = {};
    interactionEvents.forEach(e => {
      try {
        if (e.metadataJson) {
          const meta = JSON.parse(e.metadataJson);
          const key = `[${meta.tag}] "${meta.text}" (${meta.isInteractive ? 'Interactive' : 'Dead Click'})`;
          interactionSummary[key] = (interactionSummary[key] || 0) + 1;
        }
      } catch (err) {}
    });

    const topInteractions = Object.entries(interactionSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => `- ${key}: ${count} clicks`)
      .join('\n') || "- No interaction clicks logged yet.";

    // 4. Calculate final score based on config weights
    const score = 
      (ctaClickRate * weights.cta_click_rate) +
      (scrollScore * weights.scroll_depth_rate) +
      (normalizedTimeOnPage * weights.normalized_time_on_page) +
      (bounceRate * weights.bounce_rate);

    console.log(`   Visitors: ${uniqueVisitors}, Views: ${pageViews}, Clicks: ${ctaClicks}`);
    console.log(`   Score: ${score.toFixed(4)}`);

    // Save metric snapshot
    const snapshotId = crypto.randomUUID();
    await db.insert(metricSnapshots).values({
      id: snapshotId,
      variantId: variant.id,
      visitors: uniqueVisitors,
      pageViews,
      ctaClicks,
      ctaClickRate,
      avgTimeOnPage,
      scrollDepthRate: scrollScore,
      bounceRate,
      score,
    });

    // 5. Karpathy-style AutoResearch LLM Analysis
    console.log(`   🧠 Asking LLM to analyze the results...`);
    
    const systemPrompt = `You are the lead UX Researcher and Data Scientist for a self-evolving website named DarwinPage.
Your goal is to look at the metrics for a specific page variant, form a clear observation of what the data is telling us, and propose a concrete hypothesis for how we could mutate the content in the next generation to improve the score.
Reply in strict JSON format with exactly two keys: "observation" and "hypothesis". Do not use markdown blocks, just raw JSON.`;

    const userPrompt = `
Variant ID: ${variant.id}
Content JSON:
${variant.contentJson}

Metrics:
- Unique Visitors: ${uniqueVisitors}
- Page Views: ${pageViews}
- CTA Clicks: ${ctaClicks} (Rate: ${(ctaClickRate * 100).toFixed(1)}%)
- Scroll Depth Score: ${(scrollScore * 100).toFixed(1)}%
- Avg Time on Page: ${avgTimeOnPage.toFixed(1)}s
- Bounce Rate: ${(bounceRate * 100).toFixed(1)}%

Current Overall Fitness Score: ${score.toFixed(4)}

Top Clicks (Heatmap & Dead Clicks):
${topInteractions}

Write an observation about these metrics (especially notice if users are clicking on non-interactive "Dead Click" elements!). What is working? What is failing?
Then, formulate a hypothesis for a mutation. What specific part of the content should we change to increase the fitness score?`;

    let observation = "LLM analysis failed or skipped.";
    let hypothesis = "We need more data.";

    try {
      const llmResponse = await callLLM(userPrompt, systemPrompt);
      try {
        const parsed = JSON.parse(llmResponse);
        observation = parsed.observation;
        hypothesis = parsed.hypothesis;
      } catch (e) {
        // Fallback if LLM didn't return strict JSON
        observation = "LLM returned unparseable text. See raw response.";
        hypothesis = llmResponse.substring(0, 500); // truncate
      }
    } catch (error) {
      console.log(`   ⚠️ LLM Error: ${error}`);
    }

    console.log(`   Observation: ${observation}`);
    console.log(`   Hypothesis: ${hypothesis}`);

    // Save research log
    await db.insert(researchLogs).values({
      id: crypto.randomUUID(),
      generation: variant.generation,
      action: 'analyze_metrics',
      observation: observation,
      hypothesis: hypothesis,
      mutation: 'Pending selection phase',
      result: `Score calculated: ${score.toFixed(4)}. Clicks: ${ctaClicks}/${pageViews}.`,
      decision: 'Logged analysis for next evolution cycle.',
      metricsJson: JSON.stringify({
        score, ctaClickRate, scrollScore, avgTimeOnPage, bounceRate
      })
    });
  }

  console.log('\n✅ Analysis phase complete.');
  process.exit(0);
}

analyze().catch((err) => {
  console.error('❌ Analysis failed:', err);
  process.exit(1);
});
