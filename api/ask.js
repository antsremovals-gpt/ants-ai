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

    const isRo = /[ăâîșț]/i.test(lastUserMessageRaw) || /(mutare|depozit|ofertă|pret|preț|telefon|email|bun[ăa]|salut)/i.test(lastUserMessage);

    const askedForPhone = [
      "phone number", "contact number", "can i call", "what is your phone",
      "număr de telefon", "numarul de telefon", "telefonul", "telefon",
    ].some((t) => lastUserMessage.includes(t));

    const askedForEmail = [
      "email", "adresa de email", "care este emailul", "email address",
      "do you have an email", "what is your email", "mail", "e-mail",
    ].some((t) => lastUserMessage.includes(t));

    const askedForQuoteForm = [
      "quote", "get a quote", "quote form", "contact form", "request form",
      "formular", "cerere de ofertă", "cerere de oferta", "deviz", "cerere de deviz",
      "formular online", "online form",
    ].some((t) => lastUserMessage.includes(t));

    const askedForContactGeneric = [
      "contact you", "how can i contact you", "contact details", "how to contact",
      "cum va pot contacta", "cum te pot contacta", "date de contact",
    ].some((t) => lastUserMessage.includes(t));

    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // ==================== TEST LINKURI ====================
    // Testează fiecare link și alege-l pe cel care funcționează
    const possibleQuoteLinks = [
      "https://antsremovals.co.uk/get-quote-2/",  // Linkul original
      "https://antsremovals.co.uk/contact/",      // Pagina de contact
      "https://antsremovals.co.uk/get-a-quote/",  // Posibilă alternativă
      "https://antsremovals.co.uk/quote/",        // Altă variantă
      "https://antsremovals.co.uk/",              // Pagina principală
    ];
    
    // Linkul care va fi folosit (schimbă-l manual dacă unul funcționează)
    const quoteLink = "https://antsremovals.co.uk/contact/"; // ÎNCEPE CU ACESTA
    // ======================================================

    if (providedPhone || providedEmail) {
      const x = providedEmail || providedPhone;
      return res.status(200).json({
        reply: isRo
          ? `Mulțumim — revenim la ${x}. Dacă preferi alt canal sau o oră anume, spune-ne.`
          : `Thanks — we'll get back to ${x}. If you prefer another channel or a specific time, just say.`,
      });
    }

    if (askedForPhone) {
      return res.status(200).json({
        reply: isRo
          ? `📞 <a href="tel:+442088073721" style="color: #0066cc; text-decoration: none;">020 8807 3721</a><br>Program: Lun–Vin, 9:00–17:00.`
          : `📞 <a href="tel:+442088073721" style="color: #0066cc; text-decoration: none;">020 8807 3721</a><br>Available: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForEmail) {
      return res.status(200).json({
        reply: `📧 <a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: none;">office@antsremovals.co.uk</a>`,
      });
    }

    if (askedForContactGeneric) {
      return res.status(200).json({
        reply: isRo
          ? `📞 <a href="tel:+442088073721" style="color: #0066cc; text-decoration: none;">020 8807 3721</a> · 📧 <a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: none;">office@antsremovals.co.uk</a><br>Program: Lun–Vin, 9:00–17:00.`
          : `📞 <a href="tel:+442088073721" style="color: #0066cc; text-decoration: none;">020 8807 3721</a> · 📧 <a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: none;">office@antsremovals.co.uk</a><br>Hours: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForQuoteForm) {
      const invite = isRo
        ? "Dacă vrei un preț exact, lasă-ne un număr de telefon sau un email și te contactăm noi rapid."
        : "If you'd like an exact price, leave a phone number or email and we'll get back to you quickly.";
      
      return res.status(200).json({
        reply: isRo
          ? `Puteți solicita o ofertă gratuită completând formularul nostru online:<br>👉 <a href="${quoteLink}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none; font-weight: bold;">Formular cerere ofertă</a>` +
            `<br><br>${invite}`
          : `You can request a free quote by filling out our online form:<br>👉 <a href="${quoteLink}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: none; font-weight: bold;">Online Quote Form</a>` +
            `<br><br>${invite}`,
      });
    }

    // Restul scriptului rămâne la fel...
    const systemMessage = {
      role: "system",
      content: `You are Ants Removals AI Assistant...`.trim(),
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

    let reply = data.choices[0].message.content || "";
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
