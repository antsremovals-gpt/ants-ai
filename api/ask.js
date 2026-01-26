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

    // Detect approximate language (Romanian)
    const isRo =
      /[ăâîșț]/i.test(lastUserMessageRaw) ||
      /(mutare|depozit|ofertă|preț|telefon|email|salut)/i.test(lastUserMessage);

    // Contact detection
    const askedForPhone = [
      "phone number",
      "contact number",
      "can i call",
      "what is your phone",
      "număr de telefon",
      "telefon",
    ].some((t) => lastUserMessage.includes(t));

    const askedForEmail = [
      "email",
      "mail",
      "e-mail",
      "care este emailul",
      "email address",
    ].some((t) => lastUserMessage.includes(t));

    const askedForQuoteForm = [
      "quote",
      "get a quote",
      "formular",
      "formular de ofertă",
      "cerere de ofertă",
      "request form",
    ].some((t) => lastUserMessage.includes(t));

    const askedForContactGeneric = [
      "contact you",
      "how can i contact you",
      "contact details",
      "cum va contactez",
      "vreau să vă contactez",
    ].some((t) => lastUserMessage.includes(t));

    // User provided contact
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // Asked about price/cost
    const askedAboutPrice =
      [
        "price",
        "cost",
        "how much",
        "pret",
        "preț",
        "cât costă",
        "estimare",
      ].some((t) => lastUserMessage.includes(t)) ||
      /\b(£|gbp)\s*\d/i.test(lastUserMessage);

    // ——————————————————————————————————————
    // Contact/Quote links
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
          : `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Hours: Mon–Fri, 09:00–17:00.`,
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
          `You can request a free quote by filling out our online form:<br>` +
          `👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener noreferrer">https://antsremovals.co.uk/get-quote-2/</a>` +
          `<br><br>${invite}`,
      });
    }

    // ——————————————————————————————————————
    // System/OpenAI handler
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.
(…rest of system prompt here…)
      `.trim(),
    };

    const fullMessages = [systemMessage, ...messages];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${process.env.OPENAI_API_KEY}\`,
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

    const shouldInviteContact = askedAboutPrice && !providedPhone && !providedEmail;
    if (shouldInviteContact) {
      const invite = isRo
        ? "\n\nDacă vrei un preț exact, lasă-ne un număr de telefon sau un email și te contactăm noi rapid."
        : "\n\nIf you’d like an exact price, leave a phone number or email and we’ll get back to you quickly.";
      reply += invite;
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
