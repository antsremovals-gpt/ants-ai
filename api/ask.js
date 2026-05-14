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

    // Small job detection (NEW RULE - checked FIRST)
    const smallJobKeywords = [
      // Single items
      "single item", "one item", "just one", "only one",
      // Furniture / appliances
      "sofa", "bed", "mattress",
      "chair", "table", "fridge",
      "washing machine", "dryer",
      // Small move expressions
      "small move", "tiny move", "mini move", "little move",
      "small job", "tiny job", "mini job", "little job",
      // Quantity-based
      "few items", "couple of items", "handful of items",
      // Other
      "light move", "small relocation", "man and van"
    ];

    const isSmallJob = smallJobKeywords.some(t =>
      lastUserMessage.includes(t)
    );

    if (isSmallJob) {
      return res.status(200).json({
        reply:
          "I understand — that sounds like a small job.\n\n" +
          "For this type of move we usually recommend our Man and Van service, which is perfect for small, light or flexible relocations.\n\n" +
          "It's a simple service and in most cases we can arrange everything quickly without a survey. Our office team can confirm the details and give you an exact price once you contact us or leave your information.\n\n" +
          "📞 020 8807 3721\n📧 office@antsremovals.co.uk"
      });
    }

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

    // System prompt with RESPONSE LENGTH RULE added
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
- Always say:
"For an accurate price, we recommend a free home survey."

RESPONSE STYLE:
- Keep replies short and clear
- Maximum 3–5 short lines
- Stay strictly on topic
- Avoid long explanations
- Avoid repetitive wording
- Avoid robotic replies
- Only expand if customer explicitly asks for details
- Use natural UK English
- Speak naturally like an experienced office staff member

QUESTION RULES:
- Only ask questions if truly necessary
- Ask a maximum of one simple question at a time
- Never ask for full inventories
- Never ask multiple logistical questions together
- Avoid unnecessary details
- Understand the move naturally from context
- Keep the conversation easy and relaxed

JOB LOGIC:
- Small jobs:
  naturally mention our Man and Van service

- Large jobs:
  naturally suggest a free home survey

IMPORTANT:
- Do not overcomplicate the conversation
- Keep the customer feeling guided and comfortable

CONTACT BEHAVIOUR:
- If customer shows booking intent,
  naturally ask for:
  - phone number
  OR
  - email address

OFFICIAL CONTACT DETAILS:
Phone: 020 8807 3721
Email: office@antsremovals.co.uk

STORAGE DETAILS:
- We use breathable wooden storage containers
- Each container has a volume of 250 cu ft
- Dimensions:
  2.18m (L) × 1.52m (W) × 2.34m (H)
- Containers are stackable
- Forklift access is used between warehouse rows
- Wooden containers protect better against condensation and odours than shipping containers
- Suitable for both short-term and long-term storage

TOKEN LIMIT:
- Maximum 150 tokens per reply
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
