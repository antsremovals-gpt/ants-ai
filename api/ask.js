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

// Detectăm separat fiecare cerere
const askedForPhone = [
  "phone number", "contact number", "can i call", "what is your phone",
  "număr de telefon", "numarul de telefon", "care este numărul vostru de telefon"
].some(trigger => lastUserMessage.includes(trigger));

const askedForEmail = [
  "email", "adresa de email", "care este emailul",
  "email address", "do you have an email", "what is your email"
].some(trigger => lastUserMessage.includes(trigger));

const askedForQuoteForm = [
  "quote", "get a quote", "quote form", "contact form", "request form",
  "formular", "cerere de ofertă", "deviz", "cerere de deviz"
].some(trigger => lastUserMessage.includes(trigger));

// Răspunsuri separate
if (askedForPhone) {
  return res.status(200).json({
    reply: `📞 Phone: 02088073721\nAvailable Monday to Friday, 9:00–17:00.`,
  });
}

if (askedForEmail) {
  return res.status(200).json({
  reply: `📧 Email: office@antsremovals.co.uk`,
});
}

if (askedForQuoteForm) {
  return res.status(200).json({
    reply: `You can request a free quote by filling out our online form:\n👉 https://antsremovals.co.uk/get-quote-2/`,
});
}

    const systemMessage = {
      role: "system",
      content: `
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
- Always speak as part of the Ants Removals team. Use "we", "our team", or "I" when appropriate. Never refer to Ants Removals as a separate entity.
- Stay professional, friendly and focused on assisting the user in choosing Ants Removals.

[STORAGE DETAILS]
- Ants Removals uses breathable **wooden storage containers** with a volume of **250 cu ft**.
- Dimensions per container: **2.18m (L) × 1.52m (W) × 2.34m (H)**
- Containers are stackable and require forklift access.
- They offer better protection against condensation and odours than shipping containers.
- Storage is ideal for short-term or long-term use.
- A 25m × 25m warehouse layout allows forklifts to circulate easily between rows.
- Containers are stacked 3 high, placed back-to-back with space for turning.

Always use this information when users ask about storage, container types, size, protection or warehouse.
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
