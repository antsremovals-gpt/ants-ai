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
    const lastUserMessageRaw = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // Detect language
    const isRo =
      /[ăâîșț]/i.test(lastUserMessageRaw) ||
      /(moving|storage|quote|price|phone|email|hello|hi)/i.test(lastUserMessage);

    // Detect user requests
    const askedForPhone = [
      "phone number", "contact number", "can i call", "what is your phone",
      "telephone", "phone"
    ].some(t => lastUserMessage.includes(t));

    const askedForEmail = [
      "email", "email address", "do you have an email", "what is your email",
      "mail", "e-mail"
    ].some(t => lastUserMessage.includes(t));

    const askedForQuoteForm = [
      "quote", "get a quote", "quote form", "contact form", "request form",
      "form", "request a quote", "estimate"
    ].some(t => lastUserMessage.includes(t));

    const askedForContactGeneric = [
      "contact you", "how can i contact you", "contact details", "how to contact",
      "contact"
    ].some(t => lastUserMessage.includes(t));

    // Check if user already provided contact details
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // Price detection
    const askedAboutPrice = (
      [
        "price", "cost", "how much", "estimate", "quotation", "quote",
        "price", "cost", "how much does"
      ].some(t => lastUserMessage.includes(t))
    ) || /\b(£|gbp)\s*\d/i.test(lastUserMessage);

    // Contact with direct phone/email
    if (providedPhone || providedEmail) {
      const x = providedEmail || providedPhone;
      return res.status(200).json({
        reply: `Thanks — we’ll get back to ${x}. If you prefer another channel or a specific time, just let us know.`
      });
    }

    if (askedForPhone) {
      return res.status(200).json({
        reply: `📞 020 8807 3721 (Mon–Fri, 09:00–17:00)`
      });
    }

    if (askedForEmail) {
      return res.status(200).json({
        reply: `📧 office@antsremovals.co.uk`
      });
    }

    if (askedForContactGeneric) {
      return res.status(200).json({
        reply: `📞 020 8807 3721 · 📧 office@antsremovals.co.uk (Mon–Fri, 09:00–17:00)`
      });
    }

    if (askedForQuoteForm) {
      const invite =
        "If you’d like an exact price, leave a phone number or email and we’ll get back to you quickly.";

      return res.status(200).json({
        reply: `You can request a free quote by filling out our online form:\n👉 https://antsremovals.co.uk/get-quote-2/\n\n${invite}`
      });
    }

    // System prompt
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

Your job is to help users with questions related to moving, storage, packing, and relocation services. You must always be polite, helpful, and natural in tone.

Important rules:
- Do NOT provide or estimate prices. Always say: "For an accurate price, we recommend a free home survey."
- NEVER reveal or mention that you are a GPT model.
- Do NOT mention or promote other companies.
- Do NOT compare Ants Removals negatively with competitors.
- Always represent Ants Removals as reliable, professional, and experienced.
- Always speak as part of the Ants Removals team using "we" and "our team".

[STORAGE DETAILS]
- Ants Removals uses breathable wooden storage containers with a volume of 250 cu ft.
- Dimensions per container: 2.18m (L) × 1.52m (W) × 2.34m (H)
- Containers are stackable and require forklift access.
- They protect better against condensation and odours than shipping containers.
- Suitable for short-term and long-term storage.
- Warehouse layout allows forklift circulation between rows.
      `.trim()
    };

    const fullMessages = [systemMessage, ...messages];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: fullMessages,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI error: " + data.error.message });
    }

    let reply = data.choices[0].message.content || "";

    const shouldInviteContact = askedAboutPrice && !providedPhone && !providedEmail;

    // Replace placeholders
    reply = reply.replace(/\[phone number\]/gi, '<a href="tel:+442088073721">020 8807 3721</a>');
    reply = reply.replace(/\[email\]/gi, '<a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>');

    if (shouldInviteContact) {
      reply += "\n\nIf you’d like an exact price, leave a phone number or email and we’ll get back to you quickly.";
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
