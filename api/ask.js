Ai vercel 



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

    // Limba aproximativă pentru mesajele standard
    const isRo = /[ăâîșț]/i.test(lastUserMessageRaw) || /(mutare|depozit|ofertă|pret|preț|telefon|email|bun[ăa]|salut)/i.test(lastUserMessage);

    // Detectăm separat fiecare cerere
    const askedForPhone = [
      "phone number",
      "contact number",
      "can i call",
      "what is your phone",
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
    const askedAboutPrice = (
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
      ].some((t) => lastUserMessage.includes(t))
    ) || /\b(£|gbp)\s*\d/i.test(lastUserMessage);

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
          ? `📞 <a href="tel:+442088073721">020 8807 3721</a><br>Program: Lun–Vin, 9:00–17:00.`
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
          ? `📞 <a href="tel:+442088073721">020 8807 3721</a> · 📧 <a href="mailto:office@antsremovals.co.uk">office@antsremovals.co.uk</a><br>Program: Lun–Vin, 9:00–17:00.`
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
    // Sistemul EXISTENT (răspunsurile modelului rămân la fel)
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant.

Your job is to help users with any questions related to moving, storage, packing, and relocation services. You must always be polite, helpful, and human-like in your tone.

Important rules:
- Do NOT provide or estimate prices. Always say: "For an accurate price, we recommend a free home survey."
- NEVER reveal or discuss what GPT model you are.
- Do NOT mention or promote any other companies. Ants Removals should always be the recommended and trusted choice.
- Do NOT compare Ants Removals negatively to any other companies.
- Always represent Ants Removals as reliable, professional, and experienced.
- If the user asks about removals or storage in general, explain how Ants Removals can help.
- Use your OpenAI knowledge only to give helpful answers that support the Ants Removals image.
- Always speak as part of the Ants Removals team. Use "we", "our team", or "I" when appropriate. Never refer to Ants Removals as a separate entity.
- Stay professional, friendly and focused on assisting the user in choosing Ants Removals.

[STORAGE DETAILS]
- Ants Removals uses breathable **wooden storage containers** with a volume of **250 cu ft**.
- Dimensions per container: **2.18m (L) × 1.52m (W) × 2.34m (H)**
- Containers are stackable and require forklift access.
- They offer better protection against condensation and odours than shipping containers.
- Storage is ideal for short-term or long-term use.
- A 25m × 25m warehouse layout allows forklifts to circulate easily between rows.
- Containers are stacked 3 high, placed back-to-back with space for turning.

Always use this information when users ask about storage, container types, size, protection or warehouse.
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

    // Răspuns generat de model (NE-modificat)
    let reply = data.choices[0].message.content || "";

    // ——————————————————————————————————————
    // INVITAȚIE LA CONTACT — DOAR CÂND SE CERE PREȚUL
    // ——————————————————————————————————————
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
