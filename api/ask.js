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
    const lastUserMessageRaw = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // Detectăm limba aproximativ
    const isRo = /[ăâîșț]/i.test(lastUserMessageRaw) || /(mutare|depozit|ofertă|pret|preț|telefon|email|bun[ăa]|salut)/i.test(lastUserMessage);

    // Detectare cereri
    const askedForPhone = [
      "phone number", "contact number", "can i call", "what is your phone",
      "număr de telefon", "numarul de telefon", "care este numărul vostru de telefon",
      "telefonul", "telefon", "suna"
    ].some(t => lastUserMessage.includes(t));

    const askedForEmail = [
      "email", "adresa de email", "email address", "mail", "e-mail",
      "care este emailul", "do you have an email", "what is your email"
    ].some(t => lastUserMessage.includes(t));

    const askedForQuoteForm = [
      "quote", "get a quote", "quote form", "contact form", "request form",
      "formular", "cerere de ofertă", "cerere de oferta", "deviz", "cerere de deviz"
    ].some(t => lastUserMessage.includes(t));

    const askedForContactGeneric = [
      "contact you", "how can i contact you", "contact details", "how to contact",
      "cum va pot contacta", "cum te pot contacta", "date de contact",
      "cum va contactez", "vreau sa va contactez", "vreau să vă contactez"
    ].some(t => lastUserMessage.includes(t));

    // Utilizatorul a lăsat deja contact
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // Întrebări despre preț
    const askedAboutPrice = (
      [
        "price","cost","how much","estimate","estimation","quotation","quote",
        "ballpark","rough price","pret","preț","cat costa","cât costă","costa",
        "estimare","deviz","oferta de pret","ofertă de preț","tarif","tarife"
      ].some(t => lastUserMessage.includes(t))
    ) || /\b(£|gbp)\s*\d/i.test(lastUserMessage);

    // Linkuri standard
    const phoneLink = '<a href="tel:+442088073721" style="color: #0066cc; text-decoration: underline; font-weight: bold;">020 8807 3721</a>';
    const emailLink = '<a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: underline; font-weight: bold;">office@antsremovals.co.uk</a>';
    const quoteUrl = '<a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener" style="color: #0066cc; text-decoration: underline; font-weight: bold;">Fill out our quick online form</a>';

    // ——————————————————————————————————————
    // Răspunsuri rapide cu linkuri
    // ——————————————————————————————————————
    if (providedPhone || providedEmail) {
      const contact = providedEmail
        ? `<a href="mailto:${providedEmail}" style="color: #0066cc; text-decoration: underline;">${providedEmail}</a>`
        : `<a href="tel:${providedPhone}" style="color: #0066cc; text-decoration: underline;">${providedPhone}</a>`;
      
      return res.status(200).json({
        reply: isRo
          ? `Mulțumim — revenim la ${contact}. Dacă preferi alt canal sau o oră anume, spune-ne.`
          : `Thanks — we’ll get back to ${contact}. If you prefer another channel or a specific time, just let us know.`,
      });
    }

    if (askedForPhone) {
      return res.status(200).json({
        reply: isRo
          ? `📞 ${phoneLink}<br>Program: Lun–Vin, 9:00–17:00.`
          : `📞 ${phoneLink}<br>Available: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForEmail) {
      return res.status(200).json({
        reply: `📧 ${emailLink}`,
      });
    }

    if (askedForContactGeneric) {
      return res.status(200).json({
        reply: isRo
          ? `📞 ${phoneLink} · 📧 ${emailLink}<br>Program: Lun–Vin, 9:00–17:00.`
          : `📞 ${phoneLink} · 📧 ${emailLink}<br>Hours: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForQuoteForm) {
      const invite = isRo
        ? "Dacă vrei un preț exact, lasă-ne un număr de telefon sau un email și te contactăm rapid."
        : "If you’d like an exact price, leave a phone number or email and we’ll get back to you quickly.";
      return res.status(200).json({
        reply: `${quoteUrl}<br><br>${invite}`,
      });
    }

    // ——————————————————————————————————————
    // Sistem OpenAI pentru răspunsuri naturale
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant. Be friendly, conversational, and human-like.

Important rules:
- Use "we", "our team" - you're part of Ants Removals
- Be helpful and natural in conversation
- Never say you're AI or mention other companies
- For prices: say "We recommend a free survey for an accurate quote"
- For storage: mention our wooden containers (250 cu ft, 2.18m × 1.52m × 2.34m)
- Always keep a professional, polite and trustworthy tone
      `.trim()
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
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI error: " + data.error.message });
    }

    let reply = data.choices[0].message.content || "";

    // Invitație la contact doar când e întrebat despre preț
    if (askedAboutPrice && !providedPhone && !providedEmail) {
      const invite = isRo
        ? "\n\nDacă vrei un preț exact, lasă-ne un număr de telefon sau un email și te contactăm rapid."
        : "\n\nIf you’d like an exact price, leave a phone number or email and we’ll get back to you quickly.";
      reply += invite;
    }

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
