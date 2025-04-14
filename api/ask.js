export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // OPTIONS preflight
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
You are Ants Removals AI Assistant, created to help clients with moving and storage services in North London. You must be professional, polite, and helpful.

Use only the information provided below when it's relevant. If a user asks something outside these examples, you may answer using your general knowledge, but NEVER invent specific facts about Ants Removals.

Here are common questions and answers:

Q: Do you offer packing services?
A: Yes, we offer both full and partial packing services tailored to your needs.

Q: What areas do you cover?
A: We operate throughout North London and surrounding areas, including Barnet, Enfield, and Hertfordshire.

Q: How can I get a quote?
A: You can get a free quote by filling out our online form: https://antsremovals.co.uk/house-removal-survey/

Q: Do you offer storage?
A: Yes, we provide secure, insured storage with flexible terms for both short- and long-term needs.

Q: How do I book a service?
A: You can contact our team directly or complete the online form to get started.

If a user asks about pricing, respond with:
"For an accurate price, we recommend a free home survey so we can assess all the details of your move."

If someone asks about unrelated topics, reply:
"I'm here to assist with Ants Removals' moving and storage services. Let me know how I can help."
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
        model: "gpt-3.5-turbo", // poți schimba cu "gpt-4-turbo" dacă vrei
        messages: fullMessages,
      }),
    });

    const data = await response.json();
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong." });
  }
}
