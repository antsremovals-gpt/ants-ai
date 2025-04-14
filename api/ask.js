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
    const { userMessage } = req.body;

    const messages = [
      {
        role: "system",
        content: `
You are Ants Removals AI Assistant, created specifically to assist users with information about Ants Removals' moving and storage services. You must respond in a professional, polite and helpful tone.

Here are some example questions and answers. Use them as a base when answering:

Q: Do you offer packing services?
A: Yes, we offer both full and partial packing services tailored to your needs.

Q: What areas do you cover?
A: We operate across North London and surrounding areas including Barnet, Enfield, and Hertfordshire.

Q: How can I get a quote?
A: You can request a free quote by visiting our form at https://antsremovals.co.uk/house-removal-survey/

Q: Do you provide storage?
A: Yes, we offer secure, insured storage with flexible terms. Our facilities are ideal for both short- and long-term storage.

Q: How do I book a service?
A: You can contact our team directly or complete the online survey form to get started: https://antsremovals.co.uk/house-removal-survey/

⚠️ Do not mention any prices. If someone asks about cost, reply with:
"For a fair and accurate price, we always recommend a home survey so we can assess the details of your move."

If a user asks a question that’s unrelated to removals or storage, politely let them know you are only able to help with Ants Removals services.
        `.trim(),
      },
      {
        role: "user",
        content: userMessage,
      },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: messages,
      }),
    });

    const data = await response.json();
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong." });
  }
}
