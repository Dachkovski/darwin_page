export async function callLLM(prompt: string, systemPrompt: string = "You are an expert data analyst and UX researcher."): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    console.warn("⚠️ OPENAI_API_KEY is not set. Using a mock LLM response for local testing.");
    return JSON.stringify({
      observation: "The variant has high click rates but low scroll depth, suggesting the hero section is engaging but the rest of the page is not.",
      hypothesis: "We should shorten the value propositions to keep the user engaged longer."
    });
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
