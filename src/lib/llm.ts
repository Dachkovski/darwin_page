import { search } from 'duck-duck-scrape';

export async function callLLM(prompt: string, systemPrompt: string = "You are an expert data analyst and UX researcher."): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

  if (!apiKey) {
    console.warn("⚠️ OPENAI_API_KEY is not set. Using a mock LLM response for local testing.");
    return JSON.stringify({
      observation: "The variant has high click rates but low scroll depth.",
      hypothesis: "We should shorten the value propositions."
    });
  }

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "search_web",
        description: "Search the internet for up-to-date information, news, code libraries, or facts to inspire your next UI evolution or answer a user's question.",
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

  let maxLoops = 5;
  while (maxLoops > 0) {
    maxLoops--;
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;
    messages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`[Darwin Agent] LLM requested tools:`, message.tool_calls.map((t:any) => t.function.name).join(', '));
      
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "search_web") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`[Darwin Agent] Searching web for: "${args.query}"`);
            
            const searchResults = await search(args.query);
            // Grab the first 5 results and format them
            const formattedResults = searchResults.results.slice(0, 5).map((r, i) => 
              `${i+1}. ${r.title}\nURL: ${r.url}\nDescription: ${r.description}`
            ).join('\n\n');
            
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: formattedResults || "No results found."
            });
          } catch (err: any) {
            console.error("[Darwin Agent] Search failed:", err);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: `Error performing search: ${err.message}`
            });
          }
        } else {
          // Unrecognized tool
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: "Error: Tool not found."
          });
        }
      }
    } else {
      // Final text response
      return message.content.trim();
    }
  }

  throw new Error("LLM exceeded max tool loops.");
}
