import { getDb } from './db';
import { events } from '@/db/schema';

export async function analyzeVisuals(startImage: string, latestImage: string, variantId: string, visitorId: string, sessionId: string, env: any) {
  const apiKey = env.OPENAI_API_KEY;
  const baseUrl = env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = env.OPENAI_MODEL || "gpt-5.5";

  if (!apiKey) {
    console.warn("⚠️ OPENAI_API_KEY is not set. Skipping visual analysis.");
    return;
  }

  const prompt = "You are an expert UI/UX visual researcher. You are looking at two screenshots of a web application: the moment the user loaded the page, and the final state before they left. Describe concisely what the interface looks like, and if it changed, what happened visually. Limit your response to 2 sentences.";

  try {
    const messages: any[] = [
      { role: "system", content: "You are an expert UX researcher analyzing screenshots." },
      { role: "user", content: [ { type: "text", text: prompt } ] }
    ];

    if (startImage) {
      messages[1].content.push({ type: "image_url", image_url: { url: startImage } });
    }
    if (latestImage && latestImage !== startImage) {
      messages[1].content.push({ type: "image_url", image_url: { url: latestImage } });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 150
      })
    });

    if (!response.ok) {
      console.error("Vision API Error:", await response.text());
      return;
    }

    const data = (await response.json()) as any;
    const insight = data.choices[0].message.content.trim();

    // For this deployment, we store the scaled down base64 strings directly in the database 
    // to act as visual memory without needing an external R2 bucket.
    const startImagePath = startImage || null;
    const latestImagePath = latestImage || null;

    // Store this insight as an event in the DB so it acts as "visual memory"
    const db = getDb(env);
    await db.insert(events).values({
      id: globalThis.crypto.randomUUID(),
      visitorId,
      sessionId,
      variantId,
      eventType: 'visual_analysis',
      metadataJson: JSON.stringify({ insight, startImagePath, latestImagePath }),
      timestamp: new Date()
    });

    console.log(`📸 Visual Insight saved: ${insight}`);

  } catch (error) {
    console.error("Failed to analyze visuals:", error);
  }
}
