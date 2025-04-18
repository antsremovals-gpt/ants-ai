# Refacem complet `ask.js` cu optimizări:
# - păstrăm doar ultimele 6 mesaje (user + assistant)
# - setăm timeout pe fetch
# - adăugăm comportament inteligent + fără Thinking
# - eliminăm istoricul lung care provoacă blocaje

final_ask_optimized_path = "/mnt/data/ask-optimized-humanlike.js"

optimized_js_code = f"""
export default async function handler(req, res) {{
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {{
    res.status(200).end();
    return;
  }}

  if (req.method !== "POST") {{
    res.status(405).json({{ error: "Only POST requests allowed" }});
    return;
  }}

  const {{ messages }} = req.body;

  // Limităm istoricul la ultimele 6 mesaje (user + assistant)
  const trimmedMessages = messages.slice(-6);

  const systemMessage = {{
    role: "system",
    content: `
You are Ants Removals AI Assistant.

Use the internal knowledge provided below to help answer user questions. Follow the instructions carefully to ensure a human-like, helpful conversation.

KNOWLEDGE:
[STORAGE]
Ants Removals offers secure, clean, and fully managed storage solutions for both short-term and long-term needs. We use wooden storage containers of 250 cubic feet each, measuring approx. 2.18m x 1.52m x 2.34m.

[REMOVALS]
We provide expert removal services across North London for both home and office moves.

[CONTACT]
To contact Ants Removals:
Request a quote: https://antsremovals.co.uk/get-quote-2/
Email: office@antsremovals.co.uk
Phone: 02088073721
Available: Mon–Fri, 9:00–17:00. On bank holidays, only AI is available.

[COMPANY-INFO]
Over 35 years of experience with a trained, insured team.

RULES:
- Do NOT estimate prices.
- Do NOT mention GPT or AI model.
- Do NOT show contact details unless clearly asked (e.g., phone, email, quote).
- No repeated info.
- Be calm, human-like, not robotic.
- Never say "Thinking...".
- If unsure, reason smartly and say so naturally.
- If user seems lost, help first; suggest human contact only if needed.
    `.trim()
  }};

  const fullMessages = [systemMessage, ...trimmedMessages];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 sec timeout

  try {{
    const response = await fetch("https://api.openai.com/v1/chat/completions", {{
      method: "POST",
      headers: {{
        "Content-Type": "application/json",
        Authorization: `Bearer ${{process.env.OPENAI_API_KEY}}`,
      }},
      body: JSON.stringify({{
        model: "gpt-4-turbo",
        messages: fullMessages,
        temperature: 0.6,
      }}),
      signal: controller.signal,
    }});

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {{
      console.error("OpenAI API Error:", data);
      return res.status(500).json({{ error: "OpenAI error: " + data.error.message }});
    }}

    res.status(200).json({{ reply: data.choices[0].message.content }});
  }} catch (error) {{
    clearTimeout(timeout);
    console.error("Server error:", error);
    res.status(500).json({{ error: "Something went wrong." }});
  }}
}}
"""

with open(final_ask_optimized_path, "w", encoding="utf-8") as f:
    f.write(optimized_js_code)

final_ask_optimized_path
