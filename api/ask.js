export default async function handler(req, res) {
  // CORS pentru acces din browser
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt missing" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4", // sau "gpt-3.5-turbo" dacă vrei
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400
      })
    });

    const data = await response.json();

    const reply = data.choices?.[0]?.message?.content || "No response from OpenAI.";
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch from OpenAI." });
  }
}
