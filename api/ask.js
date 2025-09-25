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
    const lastUserMessageRaw = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // Limba aproximativă pentru mesajele standard (RO/EN)
    const isRo =
      /[ăâîșț]/i.test(lastUserMessageRaw) ||
      /(mutare|depozit|ofert[ăa]|pret|preț|telefon|email|bun[ăa]|salut)/i.test(lastUserMessage);

    // Detectăm separat fiecare cerere (ușor extins)
    const askedForPhone = [
      "phone number",
      "contact number",
      "can i call",
      "what is your phone",
      "call you",
      "ring you",
      "număr de telefon",
      "numarul de telefon",
      "care este numărul vostru de telefon",
      "care este numarul vostru de telefon",
      "telefonul",
      "telefon",
    ].some((t) => lastUserMessage.includes(t));

    const askedForEmail = [
      "email",
      "adresa de email",
      "care este emailul",
      "email address",
      "do you have an email",
      "what is your email",
      "mail",
      "e-mail",
    ].some((t) => lastUserMessage.includes(t));

    const askedForQuoteForm = [
      "quote",
      "get a quote",
      "quote form",
      "contact form",
      "request form",
      "formular",
      "cerere de ofertă",
      "cerere de oferta",
      "deviz",
      "cerere de deviz",
    ].some((t) => lastUserMessage.includes(t));

    const askedForContactGeneric = [
      "contact you",
      "how can i contact you",
      "contact details",
      "how to contact",
      "cum va pot contacta",
      "cum te pot contacta",
      "date de contact",
      "cum va contactez",
      "vreau sa va contactez",
      "vreau să vă contactez",
    ].some((t) => lastUserMessage.includes(t));

    // Utilizatorul a lăsat deja contact
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // 🔎 A întrebat DESPRE PREȚ / COST?
    const askedAboutPrice =
      [
        "price",
        "cost",
        "how much",
        "how much is",
        "how much does",
        "estimate",
        "estimation",
        "quotation",
        "quote",
        "ballpark",
        "rough price",
        "pret",
        "preț",
        "cat costa",
        "cât costă",
        "costa",
        "estimare",
        "deviz",
        "oferta de pret",
        "ofertă de preț",
        "tarif",
        "tarife",
      ].some((t) => lastUserMessage.includes(t)) || /\b(£|gbp)\s*\d/i.test(lastUserMessage);

    // ——————————————————————————————————————
    // Răspunsuri separate pentru contact (cu linkuri clickabile)
    // ——————————————————————————————————————
    if (providedPhone || providedEmail) {
      const x = providedEmail || providedPhone;
      return res.status(200).json({
        reply: isRo
          ? `Mulțumim — revenim la ${x}. Dacă preferi alt canal sau o oră anume, spune-ne.`
          : `Thanks — we’ll get back to ${x}. If you prefer another channel or a specific time, just say.`,
      });
    }

    if (askedForPhone) {
      return res.status(200).json({
        reply: isRo
          ? `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Program: Lun–Vin, 09:00–17:00.`
          : `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Available: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForEmail) {
      return res.status(200).json({
        reply: `📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>`,
      });
    }

    if (askedForContactGeneric) {
      return res.status(200).json({
        reply: isRo
          ? `📞 <a href="tel:+442088073721">020 8807 3721</a> · 📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Program: Lun–Vin, 09:00–17:00.`
          : `📞 <a href="tel:+442088073721">020 8807 3721</a> · 📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Hours: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForQuoteForm) {
      const invite = isRo
        ? "Dacă vrei un preț exact, lasă-ne un număr de telefon sau un email și te contactăm noi rapid."
        : "If you’d like an exact price, leave a phone number or email and we’ll get back to you quickly.";
      return res.status(200).json({
        reply:
          `You can request a free quote by filling out our online form:<br>👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener">antsremovals.co.uk/get-quote-2/</a>` +
          `\n\n${invite}`,
      });
    }

    // ——————————————————————————————————————
    // System prompt: REGULI DE BAZĂ, ton natural, fără survey agresiv
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals’ assistant. Speak as “we/us”. Use UK English or Romanian to match the user.
Be natural, warm and concise.

- Do not push or repeat a home survey. Suggest a survey only if it’s clearly a full house/office move with many unknowns, or if the user explicitly asks.
- For simple/specific jobs, give a direct helpful reply without insisting on a survey.
- When the user asks about price, avoid exact figures; ask only what’s necessary once, in a conversational way. No long lists, no canned examples.
- After giving a useful reply, you may offer one optional contact path (once per conversation), politely:
  “We can call you if you share a number, or you can ring us on 020 8807 3721; email works too: office@antsremovals.co.uk.”
- Do not repeat questions already asked.
- Keep it human and friendly.
      `.trim(),
    };

    const fullMessages = [systemMessage, ...messages];

    // OpenAI request
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

    // Răspuns generat de model
    let reply = data.choices[0].message.content || "";

    // ——————————————————————————————————————
    // Invitație de contact DOAR când se cere prețul (politicos, cu linkuri clicabile)
    // ——————————————————————————————————————
    const shouldInviteContact = askedAboutPrice && !providedPhone && !providedEmail;

    if (shouldInviteContact) {
      const invite = isRo
        ? `\n\nDacă preferi o discuție cu o persoană reală, ne poți lăsa un număr și te sunăm noi. Sau ne găsești la telefon <a href="tel:+442088073721">020 8807 3721</a> ori pe email <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>.`
        : `\n\nIf you’d rather speak to a real person, share a number and we’ll call you. You can also ring us on <a href="tel:+442088073721">020 8807 3721</a> or email <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a>.`;
      reply += invite;
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
