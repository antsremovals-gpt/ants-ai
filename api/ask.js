import fs from 'fs';
import path from 'path';

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

    // 🧠 Citește fișierele din folderul ai-knowledge
    const knowledgeFolder = path.resolve('./ai-knowledge');
    const knowledgeFiles = fs.readdirSync(knowledgeFolder);
    let combinedKnowledge = '';

    knowledgeFiles.forEach(file => {
      const filePath = path.join(knowledgeFolder, file);
      const content = fs.readFileSync(filePath, 'utf8');
      combinedKnowledge += `\n\n[${file.replace('.txt', '').toUpperCase()}]\n${content}`;
    });

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
