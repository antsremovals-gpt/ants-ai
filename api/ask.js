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
    // -----------------------------
    // VALIDARE REQUEST
    // -----------------------------
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages must be a non-empty array" });
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return res.status(400).json({ error: `Invalid message format at index ${i}` });
      }
    }

    const lastUserMessageRaw = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // -----------------------------
    // CONTACT (DOAR INTERNE, NU ÎN RĂSPUNSURI REPETATE)
    // -----------------------------
    const CONTACT = {
      phone: "020 8807 3721",
      email: "office@antsremovals.co.uk",
      website: "https://antsremovals.co.uk",
      quoteFormUrl: "https://antsremovals.co.uk/get-quote-2/"
    };

    // -----------------------------
    // LANGUAGE DETECTION
    // -----------------------------
    const detectLanguage = (text = "") => {
      const t = text.toLowerCase();

      if (/[ăâîșț]/i.test(text)) return "ro";
      if (/(hola|gracias|precio|mudanza)/i.test(t)) return "es";
      if (/(bonjour|merci|prix|déménagement)/i.test(t)) return "fr";
      if (/(hallo|danke|umzug|preis)/i.test(t)) return "de";
      if (/(ciao|grazie|prezzo|trasloco)/i.test(t)) return "it";

      return "en";
    };

    const activeLanguage = detectLanguage(lastUserMessageRaw);

    const LANGUAGE_RULE = `
- Always respond in the user's language (${activeLanguage})
- Switch language immediately if user changes it
`.trim();

    // -----------------------------
    // CONTACT DETECTION
    // -----------------------------
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const phoneRegex = /(\+?\d[\d\s().-]{8,}\d)/;

    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];

    const isValidPhone = (phone) =>
      phone && phone.replace(/\D/g, "").length >= 9;

    const hasValidPhone = isValidPhone(providedPhone);

    // -----------------------------
    // INTENT DETECTION
    // -----------------------------
    const priceKeywords = [
      "price", "cost", "how much", "quote", "estimate", "pricing"
    ];

    const askedAboutPrice = priceKeywords.some(t =>
      lastUserMessage.includes(t)
    );

    const contactKeywords = [
      "contact", "phone", "email", "call"
    ];

    const askedForContact = contactKeywords.some(t =>
      lastUserMessage.includes(t)
    );

    const quoteKeywords = [
      "quote form", "get a quote", "request form"
    ];

    const askedForQuoteForm = quoteKeywords.some(t =>
      lastUserMessage.includes(t)
    );

    // -----------------------------
    // LEAD INTENT (IMPORTANT FIX)
    // -----------------------------
    const leadIntentKeywords = [
      "move", "moving", "removal", "relocation",
      "help", "need", "can you help",
      "mutare", "servicii", "transport", "job"
    ];

    const isLeadIntent = leadIntentKeywords.some(t =>
      lastUserMessage.includes(t)
    );

    const smallJobKeywords = [
      "sofa", "bed", "chair", "fridge", "table",
      "single", "one item", "few items", "small job"
    ];

    const isSmallJob = smallJobKeywords.some(t =>
      lastUserMessage.includes(t)
    );

    const shouldTriggerLeadFlow = isSmallJob || isLeadIntent;

    // -----------------------------
    // EARLY RESPONSES
    // -----------------------------

    if (providedEmail || hasValidPhone) {
      const value = providedEmail || providedPhone;

      return res.status(200).json({
        reply: `Thanks — we've received your details. Our team will contact you shortly.`
      });
    }

    if (askedForContact) {
      return res.status(200).json({
        reply: `You can contact us through our website or leave your details here and we’ll get back to you.`
      });
    }

    if (askedForQuoteForm) {
      return res.status(200).json({
        reply: `You can request a quote on our website. Or leave your details here and we’ll handle everything for you.`
      });
    }

    // -----------------------------
    // LEAD FLOW (FIXED — NO MORE REPETITION)
    // -----------------------------
    if (shouldTriggerLeadFlow) {
      return res.status(200).json({
        reply:
          "I can help with that.\n\n" +
          "To give you an accurate price, I just need a few quick details.\n\n" +
          "Can you leave your phone number or email here in the chat? Our team will get back to you shortly."
      });
    }

    // -----------------------------
    // SYSTEM PROMPT (OPTIMIZED FOR CONVERSION)
    // -----------------------------
    const systemMessage = {
      role: "system",
      content: `
You are a UK removals assistant.

${LANGUAGE_RULE}

RULES:
- Keep answers short and natural (max 3 paragraphs)
- Never give prices
- Focus on getting user to leave contact details in chat
- Do NOT repeat phone/email unless user asks directly
- If user shows intent → ask for contact details
- No emojis
- Be conversational, not formal

If user asks for price:
- Explain it depends on access, distance, volume
- Ask for contact details instead of redirecting outside
      `.trim()
    };

    const fullMessages = [systemMessage, ...messages];

    // -----------------------------
    // OPENAI CALL
    // -----------------------------
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;

    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: fullMessages,
          temperature: 0.4,
          max_tokens: 250
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "OpenAI error"
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    return res.status(200).json({
      reply:
        reply?.length > 5
          ? reply
          : "I can help with that — can you share a few details about your move?"
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error. Please try again later."
    });
  }
}
