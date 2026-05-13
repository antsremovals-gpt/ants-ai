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
    // VALIDARE REQUEST BODY
    // -----------------------------
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages must be a non-empty array" });
    }

    // Validate each message has required fields
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return res.status(400).json({ error: `Invalid message format at index ${i}` });
      }
    }

    const lastUserMessageRaw = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // -----------------------------
    // BUSINESS CONTACT (single source of truth)
    // -----------------------------
    const CONTACT = {
      phone: "020 8807 3721",
      email: "office@antsremovals.co.uk",
      website: "https://antsremovals.co.uk",
      quoteFormUrl: "https://antsremovals.co.uk/get-quote-2/"
    };

    // -----------------------------
    // LANGUAGE DETECTION (DYNAMIC - based on last message)
    // -----------------------------
    const detectLanguage = (text = "") => {
      if (!text) return "en";
      const t = text.toLowerCase();

      if (/[ăâîșț]/i.test(text)) return "ro";
      if (/(hola|gracias|cuánto|precio|mudanza|hablas|español)/i.test(t)) return "es";
      if (/(bonjour|merci|prix|combien|déménagement|français)/i.test(t)) return "fr";
      if (/(hallo|danke|preis|kosten|umzug|deutsch)/i.test(t)) return "de";
      if (/(ciao|grazie|quanto|prezzo|mudanza|italiano)/i.test(t)) return "it";

      return "en";
    };

    const activeLanguage = detectLanguage(lastUserMessageRaw);

    const LANGUAGE_RULE = `
LANGUAGE RULES (STRICT):
- Always respond in the same language as the user's latest message
- If the user changes language, immediately switch to that language
- Never stick to previous language
- Detected language for this response: ${activeLanguage}
    `.trim();

    // -----------------------------
    // DETECT CONTACT DETAILS IN USER MESSAGE
    // -----------------------------
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;

    const phoneRegex =
      /(\+?44[\s\-]?\(?0\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}|\+?\d[\d\s().-]{9,}\d)/;

    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];

    const isValidPhone = (phone) => {
      if (!phone) return false;
      return phone.replace(/\D/g, "").length >= 9;
    };

    const hasValidPhone = providedPhone && isValidPhone(providedPhone);

    // -----------------------------
    // INTENT DETECTION
    // -----------------------------
    // Removed the £ regex because it causes false positives
    const priceKeywords = [
      "price", "cost", "how much", "estimate", "quote", "quotation", "pricing",
      "tariff", "pret", "preț", "cât costă", "cat costa", "costs",
      "how much does", "what would it cost", "what's the cost", "how much for"
    ];

    const askedAboutPrice = priceKeywords.some(t => lastUserMessage.includes(t));

    const contactKeywords = [
      "contact", "phone", "email", "call", "contact details", "reach you"
    ];

    const askedForContact = contactKeywords.some(t => lastUserMessage.includes(t));

    const askedForQuoteForm = [
      "quote form", "get a quote", "request form", "formular"
    ].some(t => lastUserMessage.includes(t));

    // -----------------------------
    // SMALL JOB DETECTION
    // -----------------------------
    const smallJobKeywords = [
      "single", "one item", "just one", "sofa", "bed", "mattress",
      "chair", "table", "fridge", "small move", "few items"
    ];

    const isSmallJob = smallJobKeywords.some(t => lastUserMessage.includes(t)) && !askedAboutPrice;

    // -----------------------------
    // EARLY RESPONSES (NO AI CALL - saves tokens and time)
    // -----------------------------

    // Case 1: User provided contact details
    if (providedEmail || hasValidPhone) {
      const value = providedEmail || providedPhone;
      return res.status(200).json({
        reply: `Thanks — we've received your details (${value}). Our office team will contact you shortly.`
      });
    }

    // Case 2: User asked for contact information
    if (askedForContact) {
      return res.status(200).json({
        reply: `You can contact our office directly:\n📞 ${CONTACT.phone} (Mon–Fri 09:00–17:00)\n📧 ${CONTACT.email}\n${CONTACT.website}`
      });
    }

    // Case 3: User asked for quote form
    if (askedForQuoteForm) {
      return res.status(200).json({
        reply: `You can request a free quote here:\n👉 ${CONTACT.quoteFormUrl}\n\nFor an accurate price, leave your phone number or email and our office team will contact you shortly.`
      });
    }

    // Case 4: Small job → Man and Van routing (conversion optimized)
    if (isSmallJob) {
      return res.status(200).json({
        reply:
          "I understand — that sounds like a small job.\n\n" +
          "For this type of move we usually recommend our Man and Van service, which is perfect for small, light or flexible relocations.\n\n" +
          "It's a simple service and in most cases we can arrange everything quickly without a survey. Our office team can confirm the details and give you an exact price once you contact us or leave your information.\n\n" +
          `📞 ${CONTACT.phone}\n📧 ${CONTACT.email}`
      });
    }

    // -----------------------------
    // SYSTEM PROMPT
    // -----------------------------
    const systemMessage = {
      role: "system",
      content: `
You are the Ants Removals AI Assistant (UK).

${LANGUAGE_RULE}

RULES:
- Keep replies short and natural (max 3 paragraphs)
- Never provide prices or estimates
- If asked for price → say AI cannot provide pricing
- Always recommend free home survey or office contact
- No emojis
- No sales fluff
- Be helpful and conversational

PRICE RULE:
If user asks about cost/price:
→ explain pricing depends on access, distance, volume, stairs, parking
→ state AI cannot provide pricing
→ recommend free survey or office contact

CONTACT:
📞 ${CONTACT.phone}
📧 ${CONTACT.email}
${CONTACT.website}
      `.trim()
    };

    const fullMessages = [systemMessage, ...messages];

    // -----------------------------
    // OPENAI REQUEST WITH TIMEOUT
    // -----------------------------
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
    } catch (fetchError) {
      if (fetchError.name === "AbortError") {
        console.error("OpenAI request timeout");
        return res.status(504).json({ error: "Request timeout. Please try again." });
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: data.error?.message || "OpenAI service error"
      });
    }

    let reply = data.choices?.[0]?.message?.content || "";

    // Safety fallback if OpenAI returns empty response
    if (!reply || reply.length < 5) {
      return res.status(200).json({
        reply: `For an accurate price, please contact our office:\n📞 ${CONTACT.phone}\n📧 ${CONTACT.email}`
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Something went wrong. Please try again later."
    });
  }
}
