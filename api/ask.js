export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST requests allowed" });

  try {
    const { messages } = req.body;
    const lastUserMessageRaw = messages?.[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    const CONTACT = {
      phone: "020 8807 3721",
      email: "office@antsremovals.co.uk",
      website: "https://antsremovals.co.uk",
      quoteFormUrl: "https://antsremovals.co.uk/get-quote-2/"
    };

    // ---------------- LANGUAGE (LOCKED PER REQUEST, NO FLIP)
    const isRo =
      /[ăâîșț]/i.test(lastUserMessageRaw) ||
      /(salut|bună|buna|preț|pret|mutare|canapea|ajutor)/i.test(lastUserMessage);

    // ---------------- CONTACT DETECTION
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // ---------------- INTENT
    const askedAboutPrice = /(price|cost|how much|quote|pret|preț|cât costă|cat costa)/i.test(lastUserMessage);

    const askedForContact =
      /(contact|phone|email|telefon|mail|date de contact)/i.test(lastUserMessage);

    // ---------------- SMALL JOB (IMPORTANT FIX)
    const isSmallJob =
      /(sofa|canapea|bed|pat|mattress|saltea|chair|scaun|table|masa|fridge|frigider|washing machine|small job|single item|one item|doar o|o singur|o canapea)/i.test(lastUserMessage) &&
      !askedAboutPrice;

    // ---------------- EARLY RETURNS (HIGHEST PRIORITY)

    // user left contact
    if (providedPhone || providedEmail) {
      const value = providedEmail || providedPhone;
      return res.status(200).json({
        reply: isRo
          ? `Mulțumim — revenim la ${value}.`
          : `Thanks — we’ll get back to ${value}.`
      });
    }

    // contact request
    if (askedForContact) {
      return res.status(200).json({
        reply: `📞 ${CONTACT.phone}\n📧 ${CONTACT.email}`
      });
    }

    // ---------------- SMALL JOB ROUTE (MAN & VAN FIX)
    if (isSmallJob) {
      return res.status(200).json({
        reply: isRo
          ? 
`Înțeleg — este un job mic.

Pentru acest tip de mutare recomandăm serviciul nostru Man and Van, ideal pentru 1-2 obiecte sau mutări rapide.

În majoritatea cazurilor nu este nevoie de evaluare. Ne poți lăsa numărul sau emailul și te contactăm rapid pentru preț exact.

📞 ${CONTACT.phone}
📧 ${CONTACT.email}`
          :
`I understand — that’s a small job.

For this type of move we usually recommend our Man and Van service, ideal for single items or small relocations.

In most cases no survey is needed. Leave your phone or email and we’ll get back to you with an exact price.

📞 ${CONTACT.phone}
📧 ${CONTACT.email}`
      });
    }

    // ---------------- SYSTEM PROMPT (STRICT CONTROL)
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

RULES (VERY IMPORTANT):
- Always reply in the SAME language as the user message
- Never switch language randomly
- Never provide prices
- Always redirect pricing to contact or survey
- Keep replies short (max 5-6 lines)
- If small job: do NOT mention pricing, only Man and Van + contact

Tone:
- Simple, human, helpful
- No repetition
- No spam contact details unless needed
      `.trim()
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
        temperature: 0.3,
        max_tokens: 250
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "OpenAI error" });
    }

    let reply = data.choices?.[0]?.message?.content || "";

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
