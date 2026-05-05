import { getDb } from './db';
import { optimizationConfigs } from '@/db/schema';

// Edge-compatible minimal DuckDuckGo scraper
async function searchWeb(query: string) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const html = await res.text();
    const results = [];
    const regex = /<a class="result__snippet[^>]*>(.*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 5) {
      results.push(match[1].replace(/<\/?[^>]+(>|$)/g, ""));
      count++;
    }
    return results.join("\n\n");
  } catch (err) {
    return "Search unavailable.";
  }
}

export async function callLLM(prompt: string, systemPrompt: string = "You are an expert data analyst and UX researcher.", env?: any, responseFormat?: any, allowTools?: boolean): Promise<string> {
  const db = getDb(env);
  const configs = await db.select().from(optimizationConfigs).limit(1);
  const activeConfig = configs.length > 0 ? configs[0] : null;
  
  let finalSystemPrompt = systemPrompt;
  if (activeConfig && activeConfig.llmSystemPrompt) {
    finalSystemPrompt = activeConfig.llmSystemPrompt;
  }

  const messages: any[] = [
    { role: "system", content: finalSystemPrompt },
    { role: "user", content: prompt }
  ];

  const apiKey = env ? env.OPENAI_API_KEY : process.env.OPENAI_API_KEY;
  const model = env?.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const baseUrl = env?.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const bodyData: any = {
    model,
    messages
  };

  if (responseFormat) {
    bodyData.response_format = responseFormat;
  }

  if (allowTools) {
    bodyData.tools = [
      {
        type: "function",
        function: {
          name: "search_web",
          description: "Search the web for real-time information, UX trends, or best practices.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "The search query." }
            },
            required: ["query"]
          }
        }
      }
    ];
    bodyData.tool_choice = "auto";
  }

  for (let i = 0; i < 3; i++) { // Max 3 interactions
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(bodyData)
    });
    const endTime = Date.now();
    console.log(`[LLM Debug] Model: ${model} | Response Time: ${endTime - startTime}ms | Attempt: ${i + 1}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API Error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as any;
    const message = data.choices[0].message;
    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "search_web") {
          const args = JSON.parse(toolCall.function.arguments);
          try {
            const formattedResults = await searchWeb(args.query);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: formattedResults || "No results found."
            });
          } catch (err: any) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Error performing search: ${err.message}`
            });
          }
        }
      }
    } else {
      // Final text response
      return message.content.trim();
    }
  }

  throw new Error("LLM exceeded max tool loops.");
}
