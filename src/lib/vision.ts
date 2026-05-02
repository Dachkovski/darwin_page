import { getDb } from './db';
import { events } from '@/db/schema';
import crypto from 'crypto';

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

    const data = await response.json();
    const insight = data.choices[0].message.content.trim();

    // Save images to disk
    let startImagePath = null;
    let latestImagePath = null;
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const snapshotsDir = path.join(process.cwd(), 'public', 'snapshots');
      await fs.mkdir(snapshotsDir, { recursive: true }).catch(() => {});
      
      const timestamp = Date.now();
      if (startImage && startImage.startsWith('data:image')) {
        const base64Data = startImage.replace(/^data:image\/\w+;base64,/, '');
        const filename = `start_${variantId}_${sessionId}_${timestamp}.png`;
        await fs.writeFile(path.join(snapshotsDir, filename), base64Data, 'base64');
        startImagePath = `/snapshots/${filename}`;
      }
      
      if (latestImage && latestImage.startsWith('data:image') && latestImage !== startImage) {
        const base64Data = latestImage.replace(/^data:image\/\w+;base64,/, '');
        const filename = `end_${variantId}_${sessionId}_${timestamp}.png`;
        await fs.writeFile(path.join(snapshotsDir, filename), base64Data, 'base64');
        latestImagePath = `/snapshots/${filename}`;
      }
    } catch(err) {
      console.error("Failed to save image files to disk:", err);
    }

    // Store this insight as an event in the DB so it acts as "visual memory"
    const db = getDb(env);
    await db.insert(events).values({
      id: crypto.randomUUID(),
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
