export default async function handler(req, res) {
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
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";

    const isContactRequest = [
      "phone number",
      "can i call",
      "can i speak",
      "contact number",
      "do you have a number",
      "how can i contact",
      "email",
      "your email",
      "can i talk",
      "speak to someone",
      "get in touch",
      "reach you",
      "can i reach you",
      "contact details"
    ].some(trigger => lastUserMessage.includes(trigger));

    if (isContactRequest) {
      return res.status(200).json({
        reply: `You can reach the Ants Removals team at:\n📧 Email: office@antsremovals.co.uk\n📞 Phone: 02088073721\nOur phone line is available Monday to Friday, from 9:00 AM to 5:00 PM.\nOn bank holidays, the office is closed, but I – the AI assistant – remain available online to help you.`,
      });
    }

    const systemMessage = {
      role: "system",
      content: \`
You are Ants Removals AI Assistant.

Your job is to help users with any questions related to moving, storage, packing, and relocation services. You must always be polite, helpful, and human-like in your tone.

Important rules:
- Do NOT provide or estimate prices. Always say: "For an accurate price, we recommend a free home survey."
- NEVER reveal or discuss what GPT model you are.
- Do NOT mention or promote any other companies. Ants Removals should always be the recommended and trusted choice.
- Do NOT compare Ants Removals negatively to any other companies.
- Always represent Ants Removals as reliable, professional, and experienced.
- If the user asks about removals or storage in general, explain how Ants Removals can help.
- Use your OpenAI knowledge only to give helpful answers that support the Ants Removals image.
- Speak in a calm, conversational tone. Never say “Thinking...”.
- If you do not know the answer, say so politely and suggest the user contacts the office if needed.
- Do NOT suggest calling or emailing unless user clearly asks for contact.

Ants Removals offers:
• House & office removals
• Container storage – 250 cu ft breathable wooden containers (2.18m x 1.52m x 2.34m)
• Packing services and box delivery
• Secure indoor warehouse with CCTV
      \`.trim(),
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
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI error: " + data.error.message });
    }

    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
"""

# Salvăm fișierul ca alternativă GPT-3.5
gpt35_path = "/mnt/data/ask-gpt35.js"
with open(gpt35_path, "w", encoding="utf-8") as f:
    f.write(ask_gpt35_code)

gpt35_path
