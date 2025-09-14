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

    // Istoric utilizator (pt. "ok" după ce a menționat mutarea)
    const userHistory = messages
      .filter(m => m.role === "user")
      .map(m => (m.content || "").toLowerCase())
      .join(" ");

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
      "suna-ma","suna ma","sună-mă","sunama","sunama tu","sunati-ma","sunați-mă",
      "ma suni","poti sa ma suni","poți să mă suni","poti sa ma suni?",
      "te rog să mă suni","va rog sa ma sunati","vă rog să mă sunați"
    ];

    const contactMeTriggers = [
      "contact me","please contact me","reach me","get in touch with me",
      "vreau să fiu contactat","vreau sa fiu contactat","contactați-mă","contactati-ma",
      "ma puteti contacta","mă puteți contacta","contactati va rog","contactați vă rog",
      "ma suni sau imi scrii","mă suni sau îmi scrii"
    ];

    const contactYouTriggers = [
      "contact you","how can i contact you","contact details","how to contact",
      "cum va pot contacta","cum ne putem contacta","cum te pot contacta",
      "date de contact","modalitati de contact","cum va contactez","cum va pot suna",
      "vreau sa va contactez","vreau să vă contactez","as vrea sa va contactez","aș vrea să vă contactez",
      "pot sa va contactez","pot să vă contactez","cum va pot scrie","vreau sa iau legatura","vreau să iau legătura",
      "doresc sa va contactez","doresc să vă contactez","as dori sa va contactez","aș dori să vă contactez",
      "vreau datele voastre de contact","datele voastre de contact"
    ];

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
      "scrie-mi pe email","scrieti-mi pe email","scrieți-mi pe email",
      "scrie-mi","scrieti-mi","scrietimi","scrie-mi un email","scrieti-mi un email","scrieți-mi un email",
      "imi poti scrie","îmi poți scrie","imi puteti scrie","îmi puteți scrie"
    ];

    const myEmailTriggers = [
      "my email is","email me at","you can email me at",
      "emailul meu este","adresa mea de email este","imi poti scrie la","îmi poți scrie la"
    ];

    // 🔎 Intent de mutare/depozitare (pentru follow-up inteligent)
    const moveIntentKeywords = [
      "ma mut","mă mut","mutare","mut","relocare","moving","removal","move",
      "storage","stirage","depozitare","depozit","container","cutii","mobilier",
      "garsonier","1 camer","2 camer","3 camer","4 camer","studio","one bedroom","two bedroom"
    ];
    const wantsMoveOrStorage = moveIntentKeywords.some(t => lastUserMessage.includes(t));

    // ✅ "ok/bine/super" după ce s-a discutat de mutare/depozitare
    const hasMoveContext = /(mut|mutare|reloc|storage|stirage|depozit)/.test(userHistory);
    const isGenericAck = /^(ok|okay|bine|da|perfect|super)[.!?]*$/.test(lastUserMessage);

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
          reply: `Mulțumim! Te vom suna la ${providedNumber}. Spune-ne și intervalul preferat (Lun–Vin, 9:00–17:00).`
        });
      }
      return res.status(200).json({
        reply: "Sigur — te putem suna. Trimite-ne numărul tău și un interval preferat (Lun–Vin, 9:00–17:00)."
      });
    }

    // B) Contact me (user vrea contact)
    if (wantsContactMe) {
      if (providedNumber && providedEmail) {
        return res.status(200).json({
          reply: `Perfect, îți putem scrie la ${providedEmail} sau te putem suna la ${providedNumber}. Ce interval ți se potrivește (Lun–Vin, 9:00–17:00)?`
        });
      }
      if (providedNumber && !providedEmail) {
        return res.status(200).json({
          reply: `Mulțumim! Te putem suna la ${providedNumber}. Dacă vrei și pe email, lasă-ne adresa. Ce interval ți se potrivește (Lun–Vin, 9:00–17:00)?`
        });
      }
      if (!providedNumber && providedEmail) {
        return res.status(200).json({
          reply: `Mulțumim! Îți putem scrie la ${providedEmail}. Dacă preferi și un apel, lasă-ne numărul. Ce interval ți se potrivește (Lun–Vin, 9:00–17:00)?`
        });
      }
      return res.status(200).json({
        reply: "Desigur — te putem contacta. Ne lași te rog numărul și/sau emailul, plus un interval convenabil (Lun–Vin, 9:00–17:00)?"
      });
    }

    // B2) "Cum mă veți contacta?"
    if (/cum.*(contacta|sun[aă]|scrie)/.test(lastUserMessage)) {
      if (providedNumber || providedEmail) {
        return res.status(200).json({
          reply: `Folosim detaliile pe care ni le-ai dat (${providedNumber || providedEmail}). Dacă vrei și alt canal, spune-ne.`
        });
      }
      return res.status(200).json({
        reply: "De obicei contactăm telefonic sau pe email. Ne lași numărul sau adresa unde preferi să te contactăm?"
      });
    }

    // 🆕 B3) Follow-up inteligent pentru mutare/depozitare
    if (wantsMoveOrStorage || (isGenericAck && hasMoveContext)) {
      return res.status(200).json({
        reply:
`Super — ca să-ți facem o recomandare corectă, ne ajută 3 detalii:
1) Data ridicării (aprox.) și codul poștal de preluare
2) Volumul: piese mari + ~număr de cutii
3) Durata depozitării și dacă ai nevoie de ambalare
Dacă preferi, lasă un telefon sau email și te contactăm noi pentru o evaluare rapidă (gratuită).`
      });
    }

    // C) Datele firmei (cu linkuri clickabile)
    if (wantsContactYou) {
      return res.status(200).json({
        reply: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Suntem disponibili Lun–Vin, 9:00–17:00.`
      });
    }

    if (wantsEmailMe) {
      if (providedEmail) {
        return res.status(200).json({
          reply: `Perfect — îți vom scrie la ${providedEmail}. Dacă ai un subiect preferat sau detalii de inclus, spune-ne.`
        });
      }
      return res.status(200).json({
        reply: "Sigur — care este adresa de email la care vrei să te contactăm?"
      });
    }

    if (mentionsMyEmail || providedEmail) {
      return res.status(200).json({
        reply: `Mulțumim — îți vom scrie la ${providedEmail || "adresa transmisă"}. Dacă vrei și un apel, lasă-ne numărul și un interval (Lun–Vin, 9:00–17:00).`
      });
    }

    if (wantsPhone) {
      return res.status(200).json({
        reply: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Suntem disponibili Lun–Vin, 9:00–17:00.`
      });
    }

    if (wantsEmail) {
      return res.status(200).json({
        reply: `📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Dacă vrei să îți scriem noi, lasă-ne adresa ta și revenim rapid.`
      });
    }

    if (wantsQuote) {
      return res.status(200).json({
        reply: `Poți solicita un deviz gratuit aici:<br>👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener">antsremovals.co.uk/get-quote-2/</a>`
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
- Natural, helpful, concise. Short sentences. Everyday Romanian / contractions in English.
- Avoid corporate filler.

CONVERSATION FLOW:
- When the user mentions a move or storage, ask 2–3 targeted follow-up questions to gather: pickup postcode & date, volume (big items + ~boxes), storage duration, packing needs, access (floors/elevator/parking).
- If the user says "ok/okay/bine" without giving enough info, proactively ask the next key question (do not end the conversation).
- Offer a free home survey and invite the user to share phone/email for a quick call, but do not push.

RULES:
- No prices or estimates. Say: "For an accurate price, we recommend a free home survey."
- Never reveal model details. Never promote other companies. Speak as part of the team.

WHEN ASKED ABOUT STORAGE:
- Wooden containers, 250 cu ft each (2.18m × 1.52m × 2.34m).
- Stackable, forklift required; better protection vs shipping containers.
- Short/long-term storage.
- 25m × 25m warehouse, 3 high, back-to-back with turning space.
`.trim(),
    };

    // Exemple pentru stil
    const examples = [
      { role: "user", content: "Este o casă cu 2 camere, nu știu încă adresa finală, dar vreau storage." },
      { role: "assistant", content: "Super — ca să-ți facem o recomandare corectă, ne ajuți cu: data ridicării și codul poștal de preluare, piesele mari + ~număr de cutii și durata depozitării? Dacă preferi, lasă un telefon/email și te contactăm noi pentru o evaluare rapidă." },

      { role: "user", content: "Ok" },
      { role: "assistant", content: "Mulțumesc! Începem cu data ridicării și codul poștal de preluare? Apoi trecem la volum (piese mari + cutii) și dacă ai nevoie de ambalare." },

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
