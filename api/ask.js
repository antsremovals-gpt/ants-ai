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

    // Check if user is asking for a form or wants to book
    const formKeywords = ["form", "quote form", "booking form", "application", "request", "online form", "get a quote"];
    const wantsForm = formKeywords.some(keyword => lastUserMessage.toLowerCase().includes(keyword));
    
    // Check if booking intent is clear (but no contact info yet)
    const bookingIntent = ["move", "removal", "transport", "quote", "estimate", "price", "cost", "how much", "book", "booking", "relocation"].some(
      keyword => lastUserMessage.toLowerCase().includes(keyword)
    );

    // If user explicitly asks for a form OR shows booking intent after some conversation
    if (wantsForm || (bookingIntent && messages.length > 2)) {
      return res.status(200).json({
        reply: "Fill out our quick quote form for a personalized estimate:\nhttps://antsremovals.co.uk/get-quote-2/",
        showForm: true,
        formUrl: "https://antsremovals.co.uk/get-quote-2/"
      });
    }

    const systemMessage = {
      role: "system",
      content: `You are Ants Removals AI Assistant.

Your role is to help customers with:
- house removals
- office removals
- man and van services
- storage
- packing
- relocation services

You always speak naturally, professionally, and conversationally.

IMPORTANT RULES:
- Never reveal or mention that you are an AI or GPT model
- Never mention competitors or recommend other companies
- Never compare Ants Removals negatively
- Always represent Ants Removals as reliable, experienced, and professional
- Always speak using "we", "our team", and "us"

PRICING RULE:
- Never provide fixed prices or estimates
- Always say: "Contact the office for an accurate price."

RESPONSE STYLE:
- Keep replies short and clear
- Maximum 3–5 short lines
- Stay strictly on topic
- Avoid long explanations
- Avoid repetitive wording
- Avoid robotic replies
- Only expand if customer explicitly asks for details
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
- Small jobs: naturally mention our Man and Van service
- Large jobs: suggest contacting the office for an accurate price

IMPORTANT:
- Do not overcomplicate the conversation
- Keep the customer feeling guided and comfortable

CONTACT BEHAVIOUR:
- If customer shows booking intent, naturally ask for phone number OR email address
- When providing contact details, ALWAYS format them as clickable links:
  * Phone: <a href="tel:02088073721">020 8807 3721</a>
  * Email: <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>

OFFICIAL CONTACT DETAILS (clickable):
- Phone: <a href="tel:02088073721">020 8807 3721</a>
- Email: <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>

FORM BEHAVIOUR:
- When user asks for a form or shows clear booking intent, mention that we can send them our quote form
- Suggest completing the form for a faster, more accurate response
- Form URL: https://antsremovals.co.uk/get-quote-2/

STORAGE DETAILS:
- We use breathable wooden storage containers
- Each container has a volume of 250 cu ft
- Dimensions: 2.18m (L) × 1.52m (W) × 2.34m (H)
- Containers are stackable
- Forklift access is used between warehouse rows
- Wooden containers protect better against condensation and odours than shipping containers
- Suitable for both short-term and long-term storage

CONVERSATION STYLE:
- Respond like a real office coordinator, not a chatbot
- Avoid structured or list-like answers unless necessary
- Do not over-explain
- Sound confident, not uncertain or overly polite

BOOKING BEHAVIOUR:
- Always gently guide the user toward booking when intent is clear
- If user shows interest, suggest next step naturally
- Do not be passive when intent is strong

BALANCE RULE:
- Do not reply with only one sentence unless it is a direct answer
- Aim for 2–4 short sentences naturally flowing

CLARITY:
- Avoid vague answers like "it depends" without explanation
- Always add a simple reason when mentioning price depends

DUPLICATION CONTROL:
- Do not repeat questions already asked in the conversation
- Check conversation context before asking anything new

TOKEN LIMIT:
- Maximum 150 tokens per reply

IMPORTANT FORMATTING:
- When displaying phone numbers, ALWAYS use HTML link format: <a href="tel:02088073721">020 8807 3721</a>
- When displaying email addresses, ALWAYS use HTML link format: <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>
- This makes them clickable on phones and computers.`.trim()
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
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const err = data?.error?.message || "OpenAI error";
      return res.status(500).json({ error: err });
    }

    let reply = data.choices?.[0]?.message?.content ||
      "Contact us at <a href=\"tel:02088073721\">020 8807 3721</a> or <a href=\"mailto:office@antsremovals.co.uk\">office@antsremovals.co.uk</a> for more details.";

    // Ensure any phone number or email in reply becomes clickable
    reply = reply.replace(/(\d{3}[\s-]?\d{4}[\s-]?\d{4}|\d{4}[\s-]?\d{4})/g, (match) => {
      const cleanNumber = match.replace(/\s/g, '');
      return `<a href="tel:${cleanNumber}">${match}</a>`;
    });
    
    reply = reply.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match) => {
      return `<a href="mailto:${match}">${match}</a>`;
    });

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
