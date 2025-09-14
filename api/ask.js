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
    // Normalizare minimală
    const rawLast = messages[messages.length - 1]?.content || "";
    const lastUserMessage = rawLast.toLowerCase().trim();

    // ✅ E întrebare?
    const isQuestion =
      /\?\s*$/.test(lastUserMessage) ||
      /^(who|what|when|where|why|how|can|could|should|do|does|is|are|may|will|would|which|whom|whose|cine|ce|cand|când|unde|de ce|cum|care|poți|poti|puteți|puteti|ai putea|aveti|aveți|este|sunt)\b/.test(lastUserMessage);

    // 🔎 Detectăm date furnizate în mesaj
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedNumber = lastUserMessage.match(phoneRegex)?.[0];
    const providedEmail  = lastUserMessage.match(emailRegex)?.[0];

    // Trigger sets
    const callMeTriggers = [
      "call me","please call me","can you call me","give me a call","phone me",
      "mă poți suna","ma poti suna","mă puteți suna","ma puteti suna",
      "suna-ma","sună-mă","sunati-ma","sunați-mă",
      "te rog să mă suni","va rog sa ma sunati","vă rog să mă sunați"
    ];

    const contactMeTriggers = [
      "contact me","please contact me","reach me","get in touch with me",
      "vreau să fiu contactat","vreau sa fiu contactat","contactați-mă","contactati-ma",
      "ma puteti contacta","mă puteți contacta","contactati va rog","contactați vă rog"
    ];

    // ⬇️ EXTINS: expresii frecvente RO ca să livreze linkuri HTML (tel/mailto)
    const contactYouTriggers = [
      "contact you","how can i contact you","contact details","how to contact",
      "cum va pot contacta","cum ne putem contacta","cum te pot contacta",
      "date de contact","modalitati de contact","cum va contactez","cum va pot suna",
      "vreau sa va contactez","vreau să vă contactez","as vrea sa va contactez","aș vrea să vă contactez",
      "pot sa va contactez","pot să vă contactez","cum va pot scrie","vreau sa iau legatura","vreau să iau legătura",
      "doresc sa va contactez","doresc să vă contactez","as dori sa va contactez","aș dori să vă contactez",
      "vreau datele voastre de contact","datele voastre de contact"
    ];

    // ⬇️ EXTINS: „telefon” + sinonime uzuale
    const phoneTriggers = [
      "phone number","contact number","can i call","what is your phone","call you",
      "număr de telefon","numarul de telefon","care este numărul vostru de telefon","telefonul",
      "telefon","nr de telefon","nr. de telefon","numar de telefon","numărul de telefon","numarul vostru","numărul vostru","numarul dvs","numărul dvs"
    ];

    const emailTriggers = [
      "email","email address","do you have an email","what is your email",
      "adresa de email","adresa email","care este emailul","mail","emailul","e-mail","e mail","mailul"
    ];

    const quoteTriggers = [
      "quote","get a quote","quote form","contact form","request form",
      "formular","cerere de ofertă","cerere de oferta","deviz","cerere de deviz"
    ];

    const emailMeTriggers = [
      "email me","send me an email","drop me an email","send email",
      "trimite-mi un email","trimitemi un email","trimite-mi email","trimitemi email",
      "imi poti scrie pe email","îmi poți scrie pe email","scrie-mi pe email","scrieti-mi pe email","scrieți-mi pe email"
    ];

    const myEmailTriggers = [
      "my email is","email me at","you can email me at",
      "emailul meu este","adresa mea de email este","imi poti scrie la","îmi poți scrie la"
    ];

    const wantsCallback     = callMeTriggers.some(t => lastUserMessage.includes(t));
    const wantsContactMe    = contactMeTriggers.some(t => lastUserMessage.includes(t));
    const wantsContactYou   = contactYouTriggers.some(t => lastUserMessage.includes(t));
    const wantsPhone        = phoneTriggers.some(t => lastUserMessage.includes(t));
    const wantsEmail        = emailTriggers.some(t => lastUserMessage.includes(t));
    const wantsQuote        = quoteTriggers.some(t => lastUserMessage.includes(t));
    const wantsEmailMe      = emailMeTriggers.some(t => lastUserMessage.includes(t));
    const mentionsMyEmail   = myEmailTriggers.some(t => lastUserMessage.includes(t));

    /* ───────────────────────────────────────────────
       RĂSPUNSURI PRIORITARE
       ─────────────────────────────────────────────── */

    // A) Callback
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

    // B) Contact me (user vrea contact)
    if (wantsContactMe) {
      if (providedNumber && providedEmail) {
        return res.status(200).json({
          reply: `Great—thanks! We can reach you by phone (${providedNumber}) or email (${providedEmail}). What time works best for you (Mon–Fri, 9:00–17:00)?`
        });
      }
      if (providedNumber && !providedEmail) {
        return res.status(200).json({
          reply: `Thanks! We can call you on ${providedNumber}. If you’d also like us to email you, please share your email address. What time works best (Mon–Fri, 9:00–17:00)?`
        });
      }
      if (!providedNumber && providedEmail) {
        return res.status(200).json({
          reply: `Thanks! We can email you at ${providedEmail}. If you’d also like us to call, please share your phone number. What time works best (Mon–Fri, 9:00–17:00)?`
        });
      }
      return res.status(200).json({
        reply: "Of course—we can contact you. Could you please provide your phone number and/or email address, plus the best time to reach you (Mon–Fri, 9:00–17:00)?"
      });
    }

    // B2) User întreabă "cum mă veți contacta?"
    if (/cum.*(contacta|sun[aă]|scrie)/.test(lastUserMessage)) {
      if (providedNumber || providedEmail) {
        return res.status(200).json({
          reply: `We’ll use the details you gave us (${providedNumber || providedEmail}). If you’d like us to use another method too, just let us know.`
        });
      }
      return res.status(200).json({
        reply: "We usually contact clients by phone or email. Could you please share the number or email where you'd like us to reach you?"
      });
    }

    // C) Datele firmei (cu linkuri clickabile)
    if (wantsContactYou) {
      return res.status(200).json({
        reply: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>We’re available Monday–Friday, 9:00–17:00.`
      });
    }

    if (wantsEmailMe) {
      if (providedEmail) {
        return res.status(200).json({
          reply: `Great—we'll email you at ${providedEmail}. If there's a preferred subject or any details you'd like us to include, let us know.`
        });
      }
      return res.status(200).json({
        reply: "Sure—what's the best email address to reach you? (You can also add any details you'd like us to include.)"
      });
    }

    if (mentionsMyEmail || providedEmail) {
      return res.status(200).json({
        reply: `Thanks—we'll reach you at ${providedEmail || "your email"}. If you prefer a call too, share your phone number and a good time (Mon–Fri, 9:00–17:00).`
      });
    }

    if (wantsPhone) {
      return res.status(200).json({
        reply: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>We’re available Monday–Friday, 9:00–17:00.`
      });
    }

    if (wantsEmail) {
      return res.status(200).json({
        reply: `📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>If you'd like us to email you, share your address and we'll reach out.`
      });
    }

    if (wantsQuote) {
      return res.status(200).json({
        reply: `You can request a free quote by filling out our online form:<br>👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener">antsremovals.co.uk/get-quote-2/</a>`
      });
    }

    // ——— SYSTEM MESSAGE ———
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

LANGUAGE:
- Reply in the user's language (English or Romanian).

SCOPE:
- Answer only about moving services, storage, packing, quotes/surveys, availability, opening hours, service areas, insurance, and how we work.
- Do NOT proactively show phone/email/links unless explicitly asked.

STYLE:
- Sound natural and human. Short sentences. Contractions in English. Everyday Romanian.
- Avoid corporate filler.
- Be concise unless asked for detail.

RULES:
- No prices or estimates. Say: "For an accurate price, we recommend a free home survey."
- Never reveal model details.
- Never promote other companies.
- Speak as part of the team.

WHEN ASKED ABOUT STORAGE:
- Wooden containers, 250 cu ft each (2.18m × 1.52m × 2.34m).
- Stackable, forklift required, better protection vs shipping containers.
- Short/long-term storage.
- 25m × 25m warehouse, 3 high, back-to-back with turning space.
`.trim(),
    };

    // Exemple pentru stil
    const examples = [
      { role: "user", content: "Do you provide packing materials?" },
      { role: "assistant", content: "Yes, we can supply boxes and packing materials. Tell us what you need and the move date, and we’ll sort it." },

      { role: "user", content: "Puteți face mutări în Muswell Hill?" },
      { role: "assistant", content: "Da, acoperim Muswell Hill. Spuneți-ne data și volumul aproximativ și vă ghidăm mai departe." },

      { role: "user", content: "Can you call me?" },
      { role: "assistant", content: "We can. Share your phone number and a good time (Mon–Fri, 9:00–17:00), and we’ll ring you." },

      { role: "user", content: "How can I contact you?" },
      { role: "assistant", content: "📞 020 8807 3721 · 📧 office@antsremovals.co.uk. We’re available Mon–Fri, 9:00–17:00." }
    ];

    const fullMessages = [systemMessage, ...examples, ...messages];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: fullMessages,
        temperature: 0.8,
        top_p: 0.95,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI error: " + (data?.error?.message || "unknown") });
    }

    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
