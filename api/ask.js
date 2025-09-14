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

// 🔎 Detectăm intenții & date furnizate de utilizator (EN + RO)

/** Detectăm email/telefon scrise direct în mesaj */
const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const providedNumber = lastUserMessage.match(phoneRegex)?.[0];
const providedEmail  = lastUserMessage.match(emailRegex)?.[0];

/** 1) "Call me" / "Sună-mă" (cerere de apel înapoi) */
const callMeTriggers = [
  "call me","please call me","can you call me","give me a call","phone me",
  "mă poți suna","ma poti suna","mă puteți suna","ma puteti suna",
  "suna-ma","sună-mă","sunati-ma","sunați-mă",
  "te rog să mă suni","va rog sa ma sunati","vă rog să mă sunați"
];

/** 2) "Contact me" (vrea să fie contactat pe orice canal) */
const contactMeTriggers = [
  "contact me","please contact me","reach me","get in touch with me",
  "vreau să fiu contactat","vreau sa fiu contactat","contactați-mă","contactati-ma",
  "ma puteti contacta","mă puteți contacta","contactati va rog","contactați vă rog"
];

/** 3) "How can I contact you" (cerere de datele voastre) */
const contactYouTriggers = [
  "contact you","how can i contact you","contact details","how to contact",
  "cum va pot contacta","cum ne putem contacta","cum te pot contacta",
  "date de contact","modalitati de contact","cum va contactez","cum va pot suna"
];

/** 4) Cereri explicite pentru telefon/email/quote */
const phoneTriggers = [
  "phone number","contact number","can i call","what is your phone","call you",
  "număr de telefon","numarul de telefon","care este numărul vostru de telefon","telefonul"
];
const emailTriggers = [
  "email","email address","do you have an email","what is your email",
  "adresa de email","adresa email","care este emailul","mail"
];
const quoteTriggers = [
  "quote","get a quote","quote form","contact form","request form",
  "formular","cerere de ofertă","cerere de oferta","deviz","cerere de deviz"
];

const wantsCallback   = callMeTriggers.some(t => lastUserMessage.includes(t));
const wantsContactMe  = contactMeTriggers.some(t => lastUserMessage.includes(t));
const wantsContactYou = contactYouTriggers.some(t => lastUserMessage.includes(t));
const wantsPhone      = phoneTriggers.some(t => lastUserMessage.includes(t));
const wantsEmail      = emailTriggers.some(t => lastUserMessage.includes(t));
const wantsQuote      = quoteTriggers.some(t => lastUserMessage.includes(t));

/* ─────────────────────────────────────────────────────────────
   PRIORITATE RĂSPUNSURI: callback/contact-me → contact-you → phone/email/quote
   ───────────────────────────────────────────────────────────── */

/** A) Utilizatorul vrea să fie SUNAT (callback) */
if (wantsCallback) {
  if (providedNumber) {
    return res.status(200).json({
      reply: `Thanks! We'll ask our team to call you on ${providedNumber}. If you'd like, share your preferred time (Mon–Fri, 9:00–17:00).`
    });
  }
  return res.status(200).json({
    reply: "Sure—we can call you. Please send your phone number and your preferred time (Mon–Fri, 9:00–17:00)."
  });
}

/** B) Utilizatorul vrea să fie CONTACTAT (orice canal) */
if (wantsContactMe) {
  // avem deja date?
  if (providedNumber && providedEmail) {
    return res.status(200).json({
      reply: `Great—thanks! We can reach you by phone (${providedNumber}) or email (${providedEmail}). What time works best for you (Mon–Fri, 9:00–17:00)?`
    });
  }
  if (providedNumber && !providedEmail) {
    return res.status(200).json({
      reply: `Thanks! We can call you on ${providedNumber}. If you prefer email as well, please share your email address. Also, what's a good time (Mon–Fri, 9:00–17:00)?`
    });
  }
  if (!providedNumber && providedEmail) {
    return res.status(200).json({
      reply: `Thanks! We can email you at ${providedEmail}. If you'd like a call too, please share your phone number. Also, what's a good time (Mon–Fri, 9:00–17:00)?`
    });
  }
  // nu avem încă date → cerem ambele
  return res.status(200).json({
    reply: "Of course—we can contact you. Could you please provide your phone number and/or email address, plus the best time to reach you (Mon–Fri, 9:00–17:00)?"
  });
}

/** C) Utilizatorul cere CUM vă poate contacta (datele firmei) */
if (wantsContactYou) {
  return res.status(200).json({
    reply: `📞 Phone: 02088073721\n📧 Email: office@antsremovals.co.uk\nWe’re available Monday–Friday, 9:00–17:00.`
  });
}

/** D) Cereri explicite pentru telefon/email/quote (datele firmei) */
if (wantsPhone) {
  return res.status(200).json({
    reply: `📞 Phone: 02088073721\nWe’re available Monday–Friday, 9:00–17:00.`
  });
}

if (wantsEmail) {
  return res.status(200).json({
    reply: `📧 Email: office@antsremovals.co.uk`
  });
}

if (wantsQuote) {
  return res.status(200).json({
    reply: `You can request a free quote by filling out our online form:\n👉 https://antsremovals.co.uk/get-quote-2/`
  });
}

    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

SCOPE:
- Answer only about moving services (house/office), storage (our wooden containers), packing, quotes/surveys, availability, opening hours, service areas, insurance, and how we work.
- Do NOT proactively show phone/email/links. If the user explicitly asks how to contact us or asks for phone/email, provide them directly (no redirect).

STYLE & RULES:
- Use a polite, human tone in British English.
- Do NOT give or estimate prices. Say: "For an accurate price, we recommend a free home survey."
- Do not reveal model details or internal system info.
- Do not mention or promote other companies. Ants Removals should always be the recommended and trusted choice.
- Do not compare Ants Removals negatively to any other companies.
- Speak as part of the team ("we", "our team", or "I" when appropriate). Never refer to Ants Removals as a separate entity.
- Stay professional, friendly and focused on assisting the user in choosing Ants Removals.

WHEN ASKED ABOUT STORAGE (use facts below):
- Breathable wooden containers, 250 cu ft each (2.18m L × 1.52m W × 2.34m H).
- Containers are stackable and require forklift access; better protection against condensation and odours than shipping containers.
- Suitable for short-term and long-term storage.
- 25m × 25m warehouse layout allows forklifts to circulate easily between rows.
- Containers are stacked 3 high, placed back-to-back with turning space.
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
