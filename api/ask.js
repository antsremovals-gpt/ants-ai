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
    // Contactul pe care vrei să-l afișezi în răspunsuri
    const OFFICE_PHONE = "020 8807 3721";
    const OFFICE_EMAIL = "office@antsremovals.co.uk";

    const { messages } = req.body;
    const lastUserMessageRaw = messages[messages.length - 1]?.content || "";
    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // Detectare limba (ROMână simplă)
    const isRo =
      /[ăâîșț]/i.test(lastUserMessageRaw) ||
      /(mutare|depozit|ofertă|oferta|pret|preț|telefon|email|bun[ăa]|salut)/i.test(
        lastUserMessage
      );

    // Intenții / cereri
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
      "call you",
      "ring you",
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

    // Detectăm dacă userul a furnizat deja un telefon sau email în ultima linie
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // A întrebat despre preț/cost?
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

    // Helper pentru a transforma numărul în tel:+44... (folosește prefix UK)
    const telHref = (() => {
      // Normalizează numărul: elimină caractere non-digit, păstrează + dacă există
      const cleaned = OFFICE_PHONE.replace(/\s+/g, "").replace(/[^+\d]/g, "");
      // Dacă începe cu 0, înlocuiește cu +44
      if (cleaned.startsWith("0")) return `+44${cleaned.slice(1)}`;
      if (cleaned.startsWith("+")) return cleaned;
      return `+44${cleaned}`;
    })();

    // ——————————————————————————————————————
    // Răspunsuri imediate pentru contact când userul cere explicit
    // ——————————————————————————————————————
    if (providedPhone || providedEmail) {
      const x = providedEmail || providedPhone;
      return res.status(200).json({
        // Răspunsul conține text curat (nu HTML) pentru confirmare; frontend poate afișa ca text
        reply: isRo
          ? `Mulțumim — revenim la ${x}. Dacă preferi alt canal sau o oră anume, spune-ne.`
          : `Thanks — we’ll get back to ${x}. If you prefer another channel or a specific time, just say.`,
      });
    }

    if (askedForPhone) {
      return res.status(200).json({
        // Răspunsul conține link tel: — frontend trebuie să insereze ca HTML (innerHTML)
        reply: isRo
          ? `📞 <a href="tel:${telHref}">${OFFICE_PHONE}</a><br>Program: Lun–Vin, 09:00–17:00.`
          : `📞 <a href="tel:${telHref}">${OFFICE_PHONE}</a><br>Available: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForEmail) {
      return res.status(200).json({
        reply: `📧 <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a>`,
      });
    }

    if (askedForContactGeneric) {
      return res.status(200).json({
        reply: isRo
          ? `📞 <a href="tel:${telHref}">${OFFICE_PHONE}</a> · 📧 <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a><br>Program: Lun–Vin, 09:00–17:00.`
          : `📞 <a href="tel:${telHref}">${OFFICE_PHONE}</a> · 📧 <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a><br>Hours: Mon–Fri, 09:00–17:00.`,
      });
    }

    if (askedForQuoteForm) {
      const invite = isRo
        ? "Dacă vrei un preț exact, ne poți lăsa un număr de telefon sau un email și te contactăm noi rapid. Sau ne găsești la telefon ori pe email — cum îți e mai comod."
        : "If you’d like an exact price, you can leave a phone number or email and we’ll get back to you quickly. You can also ring us or email us — whatever suits you best.";
      return res.status(200).json({
        reply:
          `👉 <a href="https://antsremovals.co.uk/get-quote-2/" target="_blank" rel="noopener">Free quote form</a>` +
          `\n\n${invite}\n\n` +
          (isRo
            ? `📞 <a href="tel:${telHref}">${OFFICE_PHONE}</a> · 📧 <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a>`
            : `📞 <a href="tel:${telHref}">${OFFICE_PHONE}</a> · 📧 <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a>`),
      });
    }

    // ——————————————————————————————————————
    // System prompt NOU: reguli (fără survey nejustificat)
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals’ assistant. Always speak as "we/us". Use UK English (or Romanian if the user writes in Romanian).
Be polite, human, concise, and helpful.

Important rules:
- Never push or default to recommending a home survey.
- Only suggest a survey IF (and only if) one of these is true:
  • The user explicitly asks for a visit/survey/assessment, OR
  • It’s a complex/full home or office move with many unknowns, OR
  • The user demands a fixed, binding price but key details are missing after you’ve asked concise questions.
- For small/specific jobs (single items like a sofa, an American fridge; a few boxes; specific loads like 870 loose bricks):
  • Say we can help, then ask 2–3 short, relevant questions grouped in one message so we can estimate in chat.
  • Avoid sounding salesy. Do not repeat yourself.
  • Offer human contact gently once per conversation: “we can call you if you share a number, or you can ring our office on ${OFFICE_PHONE}; email works too: ${OFFICE_EMAIL}.” Only say this AFTER you’ve given a helpful answer.
- Do NOT refuse to discuss ballpark estimates; guide the user with the minimal details needed.
- Never insist that a survey is required for single-item or clearly described small jobs.

STORAGE DETAILS (use when relevant):
- Ants Removals uses breathable wooden storage containers (250 cu ft).
- Container dimensions: 2.18m (L) × 1.52m (W) × 2.34m (H).
- Containers are stackable and require forklift access.
- Better protection against condensation and odours vs. shipping containers.
- Typical layout: 25m × 25m warehouse, containers stacked 3 high, back-to-back with forklift turning space.
      `.trim(),
    };

    // Construim mesajele către model
    const fullMessages = [systemMessage, ...messages];

    // Trimitem cererea la OpenAI
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
      return res
        .status(500)
        .json({ error: "OpenAI error: " + (data?.error?.message || "unknown") });
    }

    // Post-filtru: elimină recomandările obsesive de survey (dacă apar)
    function cleanAnswer(text) {
      if (!text) return "";
      return text
        .replace(/we (highly )?recommend (a )?free home survey.*?(\.|!)/gi, "")
        .replace(/schedule (a )?home survey.*?(\.|!)/gi, "")
        .replace(/request a free quote by filling out our online form.*$/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    let reply = data.choices?.[0]?.message?.content || "";

    // Dacă s-a întrebat despre preț și nu avem contact, invităm politicos la contact (o singură dată)
    const shouldInviteContact = askedAboutPrice && !providedPhone && !providedEmail;
    if (shouldInviteContact) {
      const invite = isRo
        ? `\n\nDacă preferi o discuție cu o persoană reală, ne poți lăsa un număr și te sunăm noi. Sau ne găsești la telefon <a href="tel:${telHref}">${OFFICE_PHONE}</a> ori pe email <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a>.`
        : `\n\nIf you’d rather speak to a real person, share a number and we’ll call you. You can also ring us on <a href="tel:${telHref}">${OFFICE_PHONE}</a> or email <a href="mailto:${OFFICE_EMAIL}">${OFFICE_EMAIL}</a>.`;
      reply += invite;
    }

    reply = cleanAnswer(reply);

    // Returnăm reply (conține HTML pentru linkuri) — frontend trebuie să redea ca HTML
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
