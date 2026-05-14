// ============================================
// API Handler cu corectare linkuri pentru chat
// ============================================

// Funcție pentru corectarea linkurilor dublate
function corecteazaLinkuriContact(text) {
    if (!text || typeof text !== 'string') return text;
    
    let rezultat = text;
    
    // 1. Corectare număr de telefon format UK (02088073721)
    rezultat = rezultat.replace(
        /<a href="tel:<a href="tel:(\d+)">\1<\/a>"><a href="tel:\1">([^<]+)<\/a><\/a>/g,
        '<a href="tel:$1">$2</a>'
    );
    
    // 2. Corectare email
    rezultat = rezultat.replace(
        /<a href="mailto:<a href="mailto:([^"]+)">\1<\/a>"><a href="mailto:\1">([^<]+)<\/a><\/a>/g,
        '<a href="mailto:$1">$2</a>'
    );
    
    // 3. Caz general - orice dublare de linkuri
    rezultat = rezultat.replace(
        /<a href="(tel|mailto):<a[^>]+>([^<]+)<\/a>">[^<]*<a[^>]+>([^<]+)<\/a><\/a>/g,
        function(match, tip, continut1, continut2) {
            const continut = continut2 || continut1;
            if (tip === 'tel') {
                const numarCurat = continut.replace(/\s/g, '');
                return `<a href="tel:${numarCurat}">${continut}</a>`;
            } else {
                return `<a href="mailto:${continut}">${continut}</a>`;
            }
        }
    );
    
    // 4. Curăță tag-uri HTML dublate rămase
    rezultat = rezultat.replace(
        /<a href="(tel|mailto):([^"]+)"><a href="[^"]+">([^<]+)<\/a><\/a>/g,
        '<a href="$1:$2">$3</a>'
    );
    
    // 5. Elimină orice alt format de link invalid
    rezultat = rezultat.replace(
        /<a href="(tel|mailto):([^">]*[&<>][^">]*)">/g,
        function(match, tip, continutGresit) {
            const numarCurat = continutGresit.replace(/<[^>]*>/g, '').replace(/\s/g, '');
            if (tip === 'tel') {
                return `<a href="tel:${numarCurat}">`;
            }
            return match;
        }
    );
    
    return rezultat;
}

// Funcție pentru a genera link-uri corecte din text simplu
function genereazaLinkContact(text, tip, valoare, textAfisat) {
    if (tip === 'tel') {
        const numarCurat = valoare.replace(/\s/g, '');
        return `<a href="tel:${numarCurat}">${textAfisat || valoare}</a>`;
    } else if (tip === 'mailto') {
        return `<a href="mailto:${valoare}">${textAfisat || valoare}</a>`;
    }
    return text;
}

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
- Large jobs: naturally suggest a free home survey

IMPORTANT:
- Do not overcomplicate the conversation
- Keep the customer feeling guided and comfortable

CONTACT BEHAVIOUR:
- If customer shows booking intent, naturally ask for phone number OR email address
- NEVER provide both phone number and email in the same response
- Provide ONLY ONE contact method per response (either phone OR email, not both)
- If user asks for contact details, provide phone number only, not email

OFFICIAL CONTACT DETAILS:
Phone: 020 8807 3721
Email: office@antsremovals.co.uk

📞 PHONE NUMBER FORMATTING RULE:
- When providing the phone number, ALWAYS format it as a clickable link
- Use this EXACT format: <a href="tel:02088073721">020 8807 3721</a>
- NEVER nest multiple <a> tags
- NEVER double-wrap the phone number
- Provide the phone number ONCE, not twice

📧 EMAIL FORMATTING RULE:
- When providing email, use this EXACT format: <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>
- NEVER nest multiple <a> tags
- Provide the email ONCE, not twice

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

QUESTION STYLE:
- Only ask one short question when it helps move the booking forward
- Prefer statements over questions
- If unsure, guide instead of interrogating

BOOKING BEHAVIOUR:
- Always gently guide the user toward booking when intent is clear
- If user shows interest, suggest next step naturally (call or email)
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
- NEVER repeat the same phone number or email twice in one response
- NEVER list both phone and email together
- NEVER double-wrap contact links

TOKEN LIMIT:
- Maximum 150 tokens per reply`.trim()
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
      "Please contact our team at <a href=\"tel:02088073721\">020 8807 3721</a> for more details.";

    // APLICĂ CORECTAREA LINKURILOR ÎNAINTE DE TRIMITERE
    reply = corecteazaLinkuriContact(reply);

    // Verifică și corectează manual dacă linkurile nu sunt corecte
    if (reply.includes('href="tel') && !reply.match(/href="tel:\d+">[^<]+<\/a>/)) {
      // Dacă linkul e corupt, înlocuiește-l cu formatul corect
      reply = reply.replace(
        /(020\s?8807\s?3721|02088073721)/g,
        '<a href="tel:02088073721">020 8807 3721</a>'
      );
    }
    
    if (reply.includes('href="mailto') && !reply.match(/href="mailto:[^"]+@[^"]+\.[^"]+">[^<]+<\/a>/)) {
      reply = reply.replace(
        /(office@antsremovals\.co\.uk)/g,
        '<a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>'
      );
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}
