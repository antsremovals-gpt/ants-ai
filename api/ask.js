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

    const lastUserMessage =
      messages[messages.length - 1]?.content || "";

    // -----------------------------
    // CONTACT DETECTION (simple + safe)
    // -----------------------------
    const emailRegex =
      /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

    const phoneRegex =
      /(\+?\d[\d\s().-]{7,}\d)/;

    const providedEmail = lastUserMessage.match(emailRegex)?.[0];
    const providedPhone = lastUserMessage.match(phoneRegex)?.[0];

    if (providedEmail || providedPhone) {
      return res.status(200).json({
        reply:
          "Thanks — our team will get back to you shortly."
      });
    }

    // -----------------------------
    // SYSTEM PROMPT (YOUR EXACT RULES)
    // -----------------------------
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

Your job is to help users with questions related to moving, storage, packing, and relocation services. You must always be polite, helpful, and natural in tone.

IMPORTANT RULES:
- Never reveal or mention that you are an AI or GPT model
- Never mention competitors or recommend other companies
- Never compare Ants Removals negatively
- Always represent Ants Removals as reliable, experienced, and professional
- Always speak using "we", "our team", and "us"

PRICING RULE:
- Never provide fixed prices or estimates
- Always say: "For an accurate price, we recommend a free home survey."

RESPONSE STYLE:
- Keep replies short and clear
- Maximum 3–5 short lines
- Stay strictly on topic
- Avoid long explanations
- Avoid repetitive wording
- Avoid robotic replies
- Use natural UK English

CONTACT BEHAVIOUR:
- If customer shows booking intent, naturally ask for phone number OR email address

OFFICIAL CONTACT DETAILS:
Phone: 020 8807 3721 | Email: office@antsremovals.co.uk

STORAGE DETAILS:
- Wooden containers: 250 cu ft (2.18m L × 1.52m W × 2.34m H)
- Stackable, forklift access, protects against condensation
- Suitable for short or long-term storage
      `.trim()
    };

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 150
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "OpenAI error"
      });
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
