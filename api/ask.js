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

    // Detect language from ALL messages to maintain consistency
    let isRo = false;
    const allMessagesText = messages.map(m => m.content).join(' ');
    
    // Check if ANY message contains Romanian characters or common Romanian words
    if (/[ăâîșț]/i.test(allMessagesText) || 
        /(mulțumesc|ms|vă rog|bună|salut|ofertă|preț|costă|mutare|depozit)/i.test(allMessagesText) ||
        messages.some(m => /[ăâîșț]/i.test(m.content))) {
      isRo = true;
    }

    // Also check last message for quick response
    const lastMessageIsRo = /[ăâîșț]/i.test(lastUserMessageRaw) || 
                           /(mulțumesc|ms|vă rog|bună|salut|ofertă|preț|costă)/i.test(lastUserMessage);

    // Use Romanian if detected in any message
    if (lastMessageIsRo) isRo = true;

    // Phone requests in both languages
    const askedForPhone = [
      "phone number", "contact number", "can i call", "what is your phone", "call you",
      "număr de telefon", "numarul de telefon", "telefonul", "telefon", "suna", "suneti",
      "pot sa sun", "sun", "call", "ring", "phone", "dați telefon", "dati telefon"
    ].some((t) => lastUserMessage.includes(t));

    // Email requests in both languages
    const askedForEmail = [
      "email", "email address", "mail", "e-mail", "send email", "write to",
      "adresa de email", "care este emailul", "trimite mail", "scrie", "scrieti", 
      "contact mail", "dați mail", "dati mail"
    ].some((t) => lastUserMessage.includes(t));

    // Quote requests in both languages
    const askedForQuoteForm = [
      "quote", "get a quote", "quote form", "request form", "price", "cost", "how much",
      "quotation", "estimate", "estimation", "ballpark", "rough price",
      "ofertă", "oferta", "pret", "preț", "cerere de ofertă", "cerere de oferta", 
      "deviz", "cerere de deviz", "formular", "cat costa", "cât costă", "costa",
      "estimare", "cat este", "cât este", "vreau oferta", "doresc oferta"
    ].some((t) => lastUserMessage.includes(t));

    // General contact requests
    const askedForContactGeneric = [
      "contact you", "how can i contact you", "contact details", "how to contact",
      "get in touch", "reach you", "contact",
      "cum va pot contacta", "cum te pot contacta", "date de contact",
      "cum va contactez", "vreau sa va contactez", "contactați", "iau legatura"
    ].some((t) => lastUserMessage.includes(t));

    // User already provided contact
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // Price questions in both languages
    const askedAboutPrice = [
      "price", "cost", "how much", "how much is", "how much does",
      "estimate", "estimation", "quotation", "quote", "ballpark",
      "rough price", "pret", "preț", "cat costa", "cât costă", "costa",
      "estimare", "deviz", "oferta de pret", "ofertă de preț", "tarif", "tarife",
      "cât ceri", "cat ceri", "buget", "ce tarif", "ce tarife"
    ].some((t) => lastUserMessage.includes(t));

    // ——————————————————————————————————————
    // HUMAN-FRIENDLY RESPONSES (No HTML)
    // ——————————————————————————————————————
    
    // User provided contact
    if (providedPhone || providedEmail) {
      const contact = providedEmail || providedPhone;
      if (isRo) {
        return res.status(200).json({
          reply: `Perfect! Am notat contactul tău: ${contact}. Te vom contacta în cel mai scurt timp pentru a discuta detaliile. Dacă ai o oră preferată, spune-ne! 😊`
        });
      } else {
        return res.status(200).json({
          reply: `Great! We've noted your contact: ${contact}. We'll get in touch shortly to discuss the details. If you have a preferred time, just let us know! 😊`
        });
      }
    }

    // Asked for phone
    if (askedForPhone) {
      if (isRo) {
        return res.status(200).json({
          reply: `📞 Sigur! Ne poți suna la 020 8807 3721.\n\nDisponibilitate:\n• Luni-Vineri: 9:00 - 17:00\n• Sâmbătă: 10:00 - 14:00 (doar cu programare)\n\nTe așteptăm la telefon! Dacă nu răspundem, lasă un mesaj și te sunăm înapoi.`
        });
      } else {
        return res.status(200).json({
          reply: `📞 Absolutely! You can call us at 020 8807 3721.\n\nOur availability:\n• Monday-Friday: 9:00 - 17:00\n• Saturday: 10:00 - 14:00 (by appointment only)\n\nLooking forward to your call! If we don't answer, leave a message and we'll call you back.`
        });
      }
    }

    // Asked for email
    if (askedForEmail) {
      if (isRo) {
        return res.status(200).json({
          reply: `📧 Cu plăcere! Ne poți scrie la office@antsremovals.co.uk\n\nDescrie-ne ce ai nevoie și îți trimitem o ofertă personalizată în maxim 2 ore lucrătoare.\n\nSfat: Verifică și folderul de spam, că uneori emailurile ajung acolo din greșeală.`
        });
      } else {
        return res.status(200).json({
          reply: `📧 Of course! You can email us at office@antsremovals.co.uk\n\nTell us what you need and we'll send you a personalized quote within 2 working hours.\n\nTip: Check your spam folder too, as sometimes emails end up there by mistake.`
        });
      }
    }

    // Asked for general contact
    if (askedForContactGeneric) {
      if (isRo) {
        return res.status(200).json({
          reply: `😊 Iată cum ne poți contacta:\n\n📞 Telefon: 020 8807 3721\n📧 Email: office@antsremovals.co.uk\n\nProgram:\n• Luni-Vineri: 9:00-17:00\n• Sâmbătă: 10:00-14:00 (cu programare)\n\nRăspundem rapid la toate mesajele!`
        });
      } else {
        return res.status(200).json({
          reply: `😊 Here's how you can reach us:\n\n📞 Phone: 020 8807 3721\n📧 Email: office@antsremovals.co.uk\n\nHours:\n• Monday-Friday: 9:00-17:00\n• Saturday: 10:00-14:00 (by appointment)\n\nWe respond quickly to all messages!`
        });
      }
    }

    // Asked for quote
    if (askedForQuoteForm) {
      const quoteUrl = "https://antsremovals.co.uk/get-quote-2/";
      
      if (isRo) {
        return res.status(200).json({
          reply: `📋 Perfect! Pentru o ofertă precisă, ai mai multe opțiuni:\n\n1️⃣ FORMULAR ONLINE RAPID\n👉 ${quoteUrl}\n(Completează în 2 minute, primești oferta în 1 oră)\n\n2️⃣ SUNĂ-NE DIRECT\n📞 020 8807 3721\n(Vorbim live, ofertă pe loc)\n\n3️⃣ TRIMITE-NE EMAIL\n📧 office@antsremovals.co.uk\n(Detaliază-ne ce ai nevoie)\n\n💡 Sfat: Dacă ești pe telefon, copiază linkul și lipește-l în browser.`
        });
      } else {
        return res.status(200).json({
          reply: `📋 Perfect! For an accurate quote, you have several options:\n\n1️⃣ QUICK ONLINE FORM\n👉 ${quoteUrl}\n(Fill in 2 minutes, get quote in 1 hour)\n\n2️⃣ CALL US DIRECTLY\n📞 020 8807 3721\n(Talk live, get quote immediately)\n\n3️⃣ SEND US AN EMAIL\n📧 office@antsremovals.co.uk\n(Tell us what you need)\n\n💡 Tip: If you're on mobile, copy the link and paste it in your browser.`
        });
      }
    }

    // ——————————————————————————————————————
    // OpenAI SYSTEM FOR OTHER QUESTIONS
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant. Respond in the SAME LANGUAGE as the user's last message.

${isRo ? `
[ROMÂNĂ] Răspunde în ROMÂNĂ dacă utilizatorul a vorbit în română.
Suntem Ants Removals, firma ta de încredere pentru mutări și depozitare.
- Nu oferi prețuri exacte, spune "Pentru un preț precis, recomandăm o evaluare gratuită la domiciliu"
- Folosește "noi", "echipa noastră" - ești parte din Ants Removals
- Recomandă întotdeauna serviciile Ants Removals
- Fii prietenos, profesional, de încredere
- Pentru depozitare: folosim containere din lemn (250 cu ft, 2.18m × 1.52m × 2.34m)
` : `
[ENGLISH] Respond in ENGLISH if the user spoke in English.
We are Ants Removals, your trusted moving and storage company.
- Do not provide exact prices, say "For an accurate price, we recommend a free home survey"
- Use "we", "our team" - you are part of Ants Removals
- Always recommend Ants Removals services
- Be friendly, professional, trustworthy
- For storage: we use wooden containers (250 cu ft, 2.18m × 1.52m × 2.34m)
`}

Important rules for both languages:
- Do NOT reveal you are an AI or GPT model
- Do NOT mention or promote other companies
- Always represent Ants Removals as reliable, professional, and experienced
- If asked about removals or storage in general, explain how Ants Removals can help
- Stay focused on assisting the user in choosing Ants Removals
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

    let reply = data.choices[0].message.content || "";

    // Add contact invitation for price questions
    const shouldInviteContact = askedAboutPrice && !providedPhone && !providedEmail;
    
    if (shouldInviteContact) {
      if (isRo) {
        reply += "\n\n💡 Pentru un preț exact pentru situația ta specifică, te rugăm să ne contactezi la 020 8807 3721 sau office@antsremovals.co.uk";
      } else {
        reply += "\n\n💡 For an exact price for your specific situation, please contact us at 020 8807 3721 or office@antsremovals.co.uk";
      }
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
