import { db } from '../src/db/index';
import { researchLogs, variants } from '../src/db/schema';
import { callLLM } from '../src/lib/llm';
import { desc, eq } from 'drizzle-orm';
import crypto from 'crypto';

async function evolve() {
  console.log('🧬 Starting Evolution Phase...');

  // 1. Get the active variant
  const activeVariants = await db.select().from(variants).where(eq(variants.status, 'active')).orderBy(desc(variants.generation)).limit(1);
  if (activeVariants.length === 0) {
    console.log('No active variant found to evolve from.');
    process.exit(0);
  }
  const parentVariant = activeVariants[0];

  // 2. Get the latest research log for the hypothesis
  const logs = await db.select().from(researchLogs)
    .where(eq(researchLogs.generation, parentVariant.generation))
    .orderBy(desc(researchLogs.timestamp))
    .limit(1);

  if (logs.length === 0 || !logs[0].hypothesis) {
    console.log('No research log / hypothesis found for the current generation. Run `npm run analyze` first.');
    process.exit(0);
  }

  const latestLog = logs[0];
  console.log(`   Evolving from Gen ${parentVariant.generation} (Variant: ${parentVariant.id})`);
  console.log(`   Hypothesis to apply: "${latestLog.hypothesis}"`);

  // 3. Prompt the LLM to generate the new variant
  console.log(`   🧠 Asking LLM to generate the next generation...`);
  
  const systemPrompt = `You are the creative engine of an evolutionary website.
Your task is to take an existing page variant and a hypothesis for improvement, and output a NEW page variant that implements the hypothesis.
Return ONLY valid JSON matching this structure exactly:
{
  "hero_headline": "string",
  "hero_subheadline": "string",
  "primary_cta_text": "string",
  "secondary_cta_text": "string",
  "value_propositions": ["string", "string", "string"],
  "footer_text": "string"
}`;

  const userPrompt = `
Current Variant Content:
${parentVariant.contentJson}

Research Observation:
${latestLog.observation}

Hypothesis for Improvement:
${latestLog.hypothesis}

Generate the new variant JSON now.`;

  let newContentJson = parentVariant.contentJson; // Fallback to same content

  try {
    const llmResponse = await callLLM(userPrompt, systemPrompt);
    
    // We need to parse out the JSON in case the LLM wrapped it in markdown blocks
    let jsonString = llmResponse;
    if (jsonString.includes('```json')) {
      jsonString = jsonString.split('```json')[1].split('```')[0].trim();
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1].split('```')[0].trim();
    }

    // Validate parsing
    JSON.parse(jsonString);
    newContentJson = jsonString;
  } catch (error) {
    console.log(`   ⚠️ LLM Generation Error: ${error}. Using fallback mock mutation.`);
    // Fallback mutation if API key is missing or parsing fails
    const fallbackData = JSON.parse(parentVariant.contentJson);
    fallbackData.hero_headline = fallbackData.hero_headline + " (Evolved)";
    fallbackData.primary_cta_text = "Click to Evolve";
    newContentJson = JSON.stringify(fallbackData);
  }

  // 4. Create new variant
  const newGeneration = parentVariant.generation + 1;
  const newVariantId = `hero_${String.fromCharCode(97 + (newGeneration % 26))}_${String(newGeneration).padStart(3, '0')}`;
  
  // Inject ID into the content JSON for consistency
  const parsedNewContent = JSON.parse(newContentJson);
  parsedNewContent.id = newVariantId;
  const finalContentJson = JSON.stringify(parsedNewContent);

  console.log(`   Creating new variant: ${newVariantId}`);

  // Archive the old variant
  await db.update(variants)
    .set({ status: 'archived', archivedAt: new Date() })
    .where(eq(variants.id, parentVariant.id));

  // Insert the new variant
  await db.insert(variants).values({
    id: newVariantId,
    generation: newGeneration,
    parentVariantId: parentVariant.id,
    status: 'active',
    contentJson: finalContentJson,
    hypothesis: latestLog.hypothesis,
    mutationReason: 'Automated LLM Evolution',
  });

  // Write research log
  await db.insert(researchLogs).values({
    id: crypto.randomUUID(),
    generation: newGeneration,
    action: 'evolve_variant',
    observation: 'Applied hypothesis from previous generation.',
    hypothesis: 'The new variant should outperform the baseline.',
    mutation: `Evolved ${parentVariant.id} -> ${newVariantId}`,
    result: 'New generation activated.',
    decision: 'Wait for data collection.',
    metricsJson: '{}'
  });

  console.log('\n✅ Evolution phase complete. Generation advanced.');
  process.exit(0);
}

evolve().catch((err) => {
  console.error('❌ Evolution failed:', err);
  process.exit(1);
});
