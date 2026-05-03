require('dotenv').config();

async function test() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-5.5";

  console.log("Using API Key:", apiKey ? "Set" : "Not Set");
  console.log("Using Base URL:", baseUrl);
  console.log("Using Model:", model);

  // A valid 1x1 black pixel jpeg
  const pixel = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  const prompt = "You are an expert UI/UX visual researcher. Describe this image.";

  const messages = [
    { role: "system", content: "You are an expert UX researcher analyzing screenshots." },
    { role: "user", content: [ 
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: pixel } }
      ] 
    }
  ];

  try {
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

    console.log("Status:", response.status);
    console.log("Body:", await response.text());
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

test();
