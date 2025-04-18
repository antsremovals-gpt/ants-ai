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

  // 🧠 Conținutul static din fișierele tale
  const combinedKnowledge = `
[STORAGE]
ANTS REMOVALS AND STORAGE IN WOODFORD
HOW CAN WE HELP
Book Now!
Your Name(Required) Email(Required)

Phone(Required)Subject Message(Required)
I understand/acknowledge that the controller of my personal data is Ants Removals Limited...
Removals in Woodford
Local Expertise and Dependability
With over a decade of experience in East London, no other removals company offers the same level of trust, professionalism, and expertise as Ants Removals.

[REMOVALS]
Commercial and Domestic Moving
We offer tailored removals services across North London. Our professional team ensures smooth transitions, careful handling, and flexible scheduling...

[CONTACT]
Email: office@antsremovals.co.uk
Phone: 02088073721
Available: Monday to Friday, 9:00 – 17:00
On bank holidays, the office is closed but the AI assistant is available to help you.

[COMPANY-INFO]
Ants Removals has over 35 years of experience, offering premium relocation and storage services from our base in North London.

[MISC]
We also assist with packing, box delivery, document storage, and more. Ask us if you have a special request – our team is here to help.
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
