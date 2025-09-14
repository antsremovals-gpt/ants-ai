export default async function handler(req, res) {
  // CORS
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
    const lastMsg = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastMsg.toLowerCase().trim();

    // ————————————————————————————————————————————————
    // Helpers
    const detectLang = (t) =>
      /[ăâîșț]/i.test(t) || /(vreau|mutare|depozit|te rog|salut|bun[ăa]|mă|suna|sună|ofertă|cerere)/i.test(t)
        ? "ro"
        : "en";

    const lang = detectLang(lastUserMessage);

    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedNumber = lastUserMessage.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessage.match(emailRegex)?.[0];

    const getHistory = (role) =>
      messages
        .filter((m) => (role ? m.role === role : true))
        .map((m) => (m.content || "").toLowerCase())
        .join(" \n ");

    const userHistory = getHistory("user");
    const assistantHistory = getHistory("assistant");

    const askedContactBefore = /(telefon|număr|numar|email|phone|e-mail|contact details)/i.test(
      assistantHistory
    );

    const saidNotNow = /(doar m[ăa] uit|mai t[âa]rziu|nu acum|revin|later|not now|maybe later|just looking)/i.test(
      lastUserMessage
    );

    const wantsMoveOrStorage = /\b(move|moving|removal|storage|depozit|depozitare|mutare|mut|relocare|container|packing)\b/i.test(
      lastUserMessage
    );

    const isGenericAck = /^(ok|okay|bine|da|perfect|super)[.!?]*$/.test(lastUserMessage);
    const hasMoveContext = /(mut|mutare|reloc|storage|depozit|moving|removal|container|packing)/i.test(
      userHistory
    );

    // Triggers (explicit requests)
    const wantsCallback = [
      "call me",
      "please call me",
      "can you call me",
      "give me a call",
      "phone me",
      "mă poți suna",
      "ma poti suna",
      "mă puteți suna",
      "ma puteti suna",
      "suna-ma",
      "sună-mă",
      "sunati-ma",
      "sunați-mă",
      "ma suni",
      "poti sa ma suni",
      "poți să mă suni",
      "te rog să mă suni",
      "vă rog să mă sunați",
    ].some((t) => lastUserMessage.includes(t));

    const wantsContactMe = [
      "contact me",
      "please contact me",
      "reach me",
      "get in touch",
      "vreau să fiu contactat",
      "vreau sa fiu contactat",
      "contactați-mă",
      "contactati-ma",
      "mă puteți contacta",
      "ma puteti contacta",
    ].some((t) => lastUserMessage.includes(t));

    const wantsContactYou = [
      "contact you",
      "how can i contact you",
      "contact details",
      "how to contact",
      "cum va pot contacta",
      "cum te pot contacta",
      "date de contact",
      "cum va contactez",
      "vreau să vă contactez",
    ].some((t) => lastUserMessage.includes(t));

    const wantsPhone = [
      "phone number",
      "contact number",
      "can i call",
      "what is your phone",
      "număr de telefon",
      "numarul de telefon",
      "telefonul",
      "telefon",
    ].some((t) => lastUserMessage.includes(t));

    const wantsEmail = [
      "email",
      "email address",
      "do you have an email",
      "what is your email",
      "adresa de email",
      "care este emailul",
      "mail",
    ].some((t) => lastUserMessage.includes(t));

    const wantsQuote = [
      "quote",
      "get a quote",
      "quote form",
      "contact form",
      "request form",
      "formular",
      "cerere de ofertă",
      "cerere de oferta",
      "deviz",
    ].some((t) => lastUserMessage.includes(t));

    const wantsEmailMe = [
      "email me",
      "send me an email",
      "drop me an email",
      "send email",
      "trimite-mi un email",
      "scrie-mi pe email",
      "scrie-mi",
      "scrieti-mi",
    ].some((t) => lastUserMessage.includes(t));

    const mentionsMyEmail = [
      "my email is",
      "email me at",
      "you can email me at",
      "emailul meu este",
      "adresa mea de email este",
      "îmi poți scrie la",
      "imi poti scrie la",
    ].some((t) => lastUserMessage.includes(t));

    const T = {
      ro: {
        callOk: (n) => `Mulțumim! Te vom suna la ${n}. Dacă ai un interval preferat (Lun–Vin, 9–17), spune-ne în două cuvinte.`,
        callAsk: `Sigur — te putem suna. Trimite-ne te rog numărul și, dacă vrei, un interval (Lun–Vin, 9–17).`,
        contactBoth: (e, n) =>
          `Perfect — îți putem scrie la ${e} sau te putem suna la ${n}. Ai un interval preferat (Lun–Vin, 9–17)?`,
        contactPhoneOnly: (n) =>
          `Mulțumim! Te putem suna la ${n}. Dacă preferi și pe email, lasă-ne adresa. Ai un interval preferat (Lun–Vin, 9–17)?`,
        contactEmailOnly: (e) =>
          `Mulțumim! Îți putem scrie la ${e}. Dacă preferi și un apel, lasă-ne numărul. Ai un interval preferat (Lun–Vin, 9–17)?`,
        contactAsk: `Desigur — te putem contacta. Ne lași un număr și/sau un email, plus un interval convenabil (Lun–Vin, 9–17)?`,
        howWeContactHas: (x) => `Folosim detaliile pe care ni le-ai dat (${x}). Dacă vrei și alt canal, spune-ne.`,
        howWeContactAsk: `De obicei revenim telefonic sau pe email — cum preferi? Ne lași te rog un număr sau o adresă?`,
        gentleNudge: `Te ajutăm cu drag. În linii mari, când și din ce zonă pornește mutarea?`,
        qList: [
          `În linii mari, când și din ce zonă pornește mutarea?`,
          `Ce piese mari ai și cam câte cutii (aprox.)?`,
          `Ai nevoie și de ambalare sau doar transport?`,
        ],
        softContact: `Dacă e mai simplu, lasă un telefon sau un email și te sună un coleg cu un preț exact (gratuit).`,
        okNudge: `Perfect. Hai să începem cu ceva ușor: când ai în minte să ridicăm și din ce zonă?`,
        notNow: `Totul în regulă — când ești gata, dă-ne un semn. Dacă vrei, lasă un număr sau un email și revenim noi cu un preț exact.`,
        contactYou: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Program: Lun–Vin, 9–17.`,
        emailMeKnown: (e) => `Perfect — îți scriem la ${e}. Dacă ai un subiect sau detalii de inclus, spune-ne.`,
        emailMeAsk: `Sigur — care este adresa de email la care vrei să te contactăm?`,
        gotEmailOrPhone: (x) => `Mulțumim — revenim la ${x}. Dacă preferi alt canal sau o oră anume, spune-ne.`,
        phoneOnly: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Program: Lun–Vin, 9–17.`,
        emailOnly: `📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Dacă vrei să îți scriem noi, lasă-ne adresa ta.`,
        quoteLink: `Poți solicita un deviz gratuit aici:<br>👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener">antsremovals.co.uk/get-quote-2/</a>`,
      },
      en: {
        callOk: (n) => `Thanks! We’ll call you on ${n}. If you’ve got a good time (Mon–Fri, 9–5), let us know.`,
        callAsk: `Sure — we can call you. Drop your number and, if you like, a good time (Mon–Fri, 9–5).`,
        contactBoth: (e, n) => `Great — we can email ${e} or call ${n}. Any preferred time (Mon–Fri, 9–5)?`,
        contactPhoneOnly: (n) => `Thanks! We can call you on ${n}. If you prefer email too, share the address. Any preferred time (Mon–Fri, 9–5)?`,
        contactEmailOnly: (e) => `Thanks! We can email you at ${e}. If you’d also like a call, share your number. Any preferred time (Mon–Fri, 9–5)?`,
        contactAsk: `Happy to — leave a number and/or email, plus a good time (Mon–Fri, 9–5).`,
        howWeContactHas: (x) => `We’ll use the details you shared (${x}). If you want another channel, just say.`,
        howWeContactAsk: `We usually follow up by phone or email — what do you prefer? Pop a number or address here.`,
        gentleNudge: `Happy to help. Roughly when and from which area is the move starting?`,
        qList: [
          `Roughly when and from which area is the move starting?`,
          `What are the big items and roughly how many boxes?`,
          `Do you need packing as well, or just transport?`,
        ],
        softContact: `If it’s easier, leave a phone or email and a colleague will call with an exact price (free).`,
        okNudge: `Great. Let’s start simple: when were you thinking, and which area are we collecting from?`,
        notNow: `No worries — when you’re ready, just ping us. If you like, leave a phone or email and we’ll come back with an exact price.`,
        contactYou: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Hours: Mon–Fri, 9–5.`,
        emailMeKnown: (e) => `Perfect — we’ll email you at ${e}. If there’s anything specific to include, tell us.`,
        emailMeAsk: `Sure — what’s the best email to reach you on?`,
        gotEmailOrPhone: (x) => `Thanks — we’ll get back to you at ${x}. If you prefer another channel or time, just say.`,
        phoneOnly: `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Hours: Mon–Fri, 9–5.`,
        emailOnly: `📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>If you want us to email you, share your address here.`,
        quoteLink: `You can request a free quote here:<br>👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener">antsremovals.co.uk/get-quote-2/</a>`,
      },
    };

    const pickQuestion = () => {
      const list = T[lang].qList;
      const seed = (messages.length + lastUserMessage.length) % list.length;
      // avoid repeating the same question if it already appears in recent assistant history
      for (let i = 0; i < list.length; i++) {
        const idx = (seed + i) % list.length;
        if (!assistantHistory.includes(list[idx].toLowerCase())) return list[idx];
      }
      return list[seed];
    };

    // ————————————————————————————————————————————————
    // High-priority explicit intents

    // A) Call me
    if (wantsCallback) {
      if (providedNumber) return res.status(200).json({ reply: T[lang].callOk(providedNumber) });
      return res.status(200).json({ reply: T[lang].callAsk });
    }

    // B) Contact me
    if (wantsContactMe) {
      if (providedNumber && providedEmail)
        return res.status(200).json({ reply: T[lang].contactBoth(providedEmail, providedNumber) });
      if (providedNumber && !providedEmail)
        return res.status(200).json({ reply: T[lang].contactPhoneOnly(providedNumber) });
      if (!providedNumber && providedEmail)
        return res.status(200).json({ reply: T[lang].contactEmailOnly(providedEmail) });
      return res.status(200).json({ reply: T[lang].contactAsk });
    }

    // B2) How will you contact me?
    if (/cum.*(contacta|sun[ăa]|scrie)/i.test(lastUserMessage) || /how.*(contact|call|email)/i.test(lastUserMessage)) {
      const x = providedNumber || providedEmail;
      if (x) return res.status(200).json({ reply: T[lang].howWeContactHas(x) });
      return res.status(200).json({ reply: T[lang].howWeContactAsk });
    }

    // C) Provide our contact details only when asked
    if (wantsContactYou) return res.status(200).json({ reply: T[lang].contactYou });
    if (wantsPhone) return res.status(200).json({ reply: T[lang].phoneOnly });
    if (wantsEmail) return res.status(200).json({ reply: T[lang].emailOnly });

    // D) "Email me"
    if (wantsEmailMe) {
      if (providedEmail) return res.status(200).json({ reply: T[lang].emailMeKnown(providedEmail) });
      return res.status(200).json({ reply: T[lang].emailMeAsk });
    }

    // E) User drops contact details (email/phone) in the message
    if (mentionsMyEmail || providedEmail || providedNumber) {
      const chosen = providedEmail || providedNumber || "detaliile transmise";
      return res.status(200).json({ reply: T[lang].gotEmailOrPhone(chosen) });
    }

    // F) Quote / form
    if (wantsQuote) return res.status(200).json({ reply: T[lang].quoteLink });

    // G) "Not now" / browsing only — be helpful, don’t insist
    if (saidNotNow) return res.status(200).json({ reply: T[lang].notNow });

    // H) Light, non-repetitive follow-up when move/storage is mentioned
    if (wantsMoveOrStorage || (isGenericAck && hasMoveContext)) {
      const q = pickQuestion();
      const tail = !askedContactBefore ? `\n${T[lang].softContact}` : "";
      return res.status(200).json({ reply: `${q}${tail}` });
    }

    // ————————————————————————————————————————————————
    // SYSTEM MESSAGE — keep it simple & human
    const systemMessage = {
      role: "system",
      content: `You are Ants Removals AI Assistant. Speak as part of our team (\"we\"). Mirror the user's language (English/Romanian).\n\nTONE: Warm, natural, short, human. Ask at most ONE light question at a time. If the user is vague or avoids the topic, do not insist; switch to a gentle offer to follow up by phone/email. Never repeat the same question.\n\nSCOPE: Moving, storage, packing, quotes/surveys, availability, opening hours, service areas, insurance, how we work. Do NOT proactively show our phone/email/links unless the user asks.\n\nCONTACT: It’s ok to INVITE the user to leave a phone or email so a colleague can give an exact price by phone. Be subtle and optional.\n\nPRICES: Do NOT give prices or estimates. Say a human will provide the exact price by phone or via a free survey.\n\nSTORAGE (if asked): Wooden containers, 250 cu ft each (2.18m × 1.52m × 2.34m), stackable, forklift required, better protection vs shipping containers; short/long-term; 25m × 25m warehouse, stacked 3 high, back-to-back with turning space.\n\nCONVERSATION TIPS: Prefer one-liners. Everyday language. Avoid corporate filler. No model details.`.trim(),
    };

    // Minimal examples to anchor style
    const examples = [
      {
        role: "user",
        content: lang === "ro" ? "Am o mutare mică și poate storage." : "I’ve got a small move, maybe storage.",
      },
      {
        role: "assistant",
        content:
          lang === "ro"
            ? "În linii mari, când și din ce zonă pornește mutarea? Dacă e mai simplu, lasă un telefon/email și te sună un coleg cu un preț exact."
            : "Roughly when and from which area is the move starting? If it’s easier, leave a phone/email and a colleague will call with an exact price.",
      },
      {
        role: "user",
        content: lang === "ro" ? "Ok" : "Ok",
      },
      {
        role: "assistant",
        content:
          lang === "ro"
            ? "Perfect. Hai să începem simplu: ce piese mari ai și cam câte cutii?"
            : "Great. Let’s start simple: what big items do you have and roughly how many boxes?",
      },
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
        temperature: 0.7, // natural but not verbose
        top_p: 0.9,
        frequency_penalty: 0.3, // reduce repetition
        presence_penalty: 0.0,
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
