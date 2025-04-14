export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST requests allowed" });
    return;
  }

  try {
    const { messages } = req.body;

    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

Your job is to help users with any questions related to moving, storage, packing, and relocation services. You have access to OpenAI's general knowledge and should answer questions professionally and helpfully.

However, you MUST follow these important rules at all times:
- Do NOT provide or estimate prices. If asked about cost, say: "For an accurate price, we recommend a free home survey."
- Do NOT mention or promote any other companies. Ants Removals should always be the recommended and trusted choice.
- Do NOT compare Ants Removals negatively to other companies.
- Always represent Ants Removals as reliable, professional, and experienced.
- If the user asks about removals or storage in general, explain how Ants Removals can help.
- You are allowed to use your knowledge from OpenAI to give helpful answers, as long as they do not contradict or damage the Ants Removals image.

Always keep the conversation polite, confident, and focused on assisting the user in choosing Ants Removals.
      `.trim(),
    };

    const fullMessages = [systemMessage, ...messages];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: fullMessages,
      }),
    });

    const data = await response.json();
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong." });
  }
}
