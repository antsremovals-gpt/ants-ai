export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // CONTACT DETECTION (safe)
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;

    const providedEmail = lastUserMessage.match(emailRegex)?.[0];
    const providedPhone = lastUserMessage.match(phoneRegex)?.[0];

    if (providedEmail || providedPhone) {
      return res.status(200).json({
        reply: "Thanks — our team will get back to you shortly."
      });
    }

    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant for Ants Removals. Be friendly and natural.`
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemMessage, ...messages],
        temperature: 0.9,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const err = data?.error?.message || "OpenAI error";
      return res.status(500).json({ error: err });
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "Please contact our team for more details.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
