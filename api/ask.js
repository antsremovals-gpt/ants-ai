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

  const { messages } = req.body;

  const combinedKnowledge = `
[STORAGE]
Ants Removals offers secure, clean, and fully managed storage solutions for both short-term and long-term needs. Whether you're moving to a new home that's not yet ready or simply require extra space, we provide flexible storage options tailored to your situation.

We use standard wooden storage containers with an internal volume of approximately 250 cubic feet. The internal dimensions of each container are 7ft 2in (2.18m) long × 5ft (1.52m) wide × 7ft 8in (2.34m) high. These breathable wooden containers are dry, clean, and stackable up to 4 high using forklifts. They are ideal for both domestic and commercial storage.

Each container is individually numbered for traceability and maximum security.

Our facility features 24/7 CCTV surveillance and controlled indoor conditions to ensure your items remain dry and safe. Storage is available from as little as one week, with no maximum duration. Upon request, we can arrange the return delivery of your stored items.

We do not charge extra for locks or insurance – our pricing is transparent, and customer satisfaction is a top priority.

[REMOVALS]
We offer tailored removals services across North London for both commercial and domestic clients. Our professional team ensures smooth transitions, careful handling of all belongings, and flexible scheduling to fit each client’s individual needs.

[CONTACT]
You can contact us in the following ways:

📋 Request a quote: https://antsremovals.co.uk/house-removal-survey/
📧 Email: office@antsremovals.co.uk
📞 Phone: 02088073721

We’re available Monday to Friday, 9:00 – 17:00.
On bank holidays, the office is closed but the AI assistant is here to help.

[COMPANY-INFO]
Ants Removals has over 35 years of experience, offering premium relocation and storage services from our base in North London. Our team is trained, professional, and fully insured.

[MISC]
We also assist with packing, box delivery, document storage, and other services. If you have a specific request, feel free to ask – our team is happy to help.
  `.trim();

  const systemMessage = {
    role: "system",
    content: `
You are Ants Removals AI Assistant.

Use the internal knowledge provided below to help answer user questions. If the answer is found in this knowledge, use it. If not, use your general knowledge – but ALWAYS follow the rules:

KNOWLEDGE:
${combinedKnowledge}

RULES:
- Do NOT provide or estimate prices.
- NEVER reveal or discuss what GPT model you are.
- Do NOT promote or mention other companies.
- Do NOT compare Ants Removals to other firms.
- Always be polite, helpful, and professional.
- When asked for contact: 
  📧 office@antsremovals.co.uk 
  📞 02088073721 
  ⏰ Mon–Fri, 9:00–17:00. AI only on bank holidays.
    `.trim(),
  };

  const fullMessages = [systemMessage, ...messages];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
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
