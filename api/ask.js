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

    // Verificare dacă utilizatorul a dat deja telefon/email
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // Detectare cuvinte cheie (simplificat)
    const askedForPhone = ["phone", "call", "number", "telefon", "suna", "appeler"].some(t => lastUserMessage.includes(t));
    const askedForEmail = ["email", "mail", "adresa", "adresse"].some(t => lastUserMessage.includes(t));
    const askedForQuote = ["quote", "price", "cost", "pret", "preț", "ofertă", "devis", "prix"].some(t => lastUserMessage.includes(t));

    // Linkuri
    const phoneLink = '<a href="tel:+442088073721" style="color: #0066cc; text-decoration: underline; font-weight: bold;">020 8807 3721</a>';
    const emailLink = '<a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: underline; font-weight: bold;">office@antsremovals.co.uk</a>';
    const quoteUrl = "https://antsremovals.co.uk/get-quote-2/";

    // --- RĂSPUNSURI DIRECTE UMANE (fără OpenAI) ---
    
    // 1. User-ul a dat contact
    if (providedPhone || providedEmail) {
      const contact = providedEmail
        ? `<a href="mailto:${providedEmail}" style="color: #0066cc; text-decoration: underline;">${providedEmail}</a>`
        : `<a href="tel:${providedPhone}" style="color: #0066cc; text-decoration: underline;">${providedPhone}</a>`;
      
      return res.status(200).json({
        reply: `Perfect! We have your contact ${contact}. Someone from our team will call you within the next hour to discuss your move. 😊<br><br>If you have any other questions in the meantime, just ask!`
      });
    }

    // 2. Cere telefon - RĂSPUNS UMAN
    if (askedForPhone) {
      return res.status(200).json({
        reply: `Of course! Here's our phone number: ${phoneLink}<br><br>You can call us anytime:<br>• Monday to Friday: 9am - 5pm<br>• Saturday: 10am - 2pm (by appointment)<br><br>We're here to answer any questions you might have about your move! If we don't answer right away, leave a message and we'll call you back as soon as possible.`
      });
    }

    // 3. Cere email - RĂSPUNS UMAN
    if (askedForEmail) {
      return res.status(200).json({
        reply: `Sure thing! You can email us at ${emailLink}<br><br>Just drop us a message with what you need, and we'll get back to you within 2 hours during business days.<br><br>Feel free to include any details about your move - the more we know, the better we can help!`
      });
    }

    // 4. Cere ofertă/preț - RĂSPUNS UMAN
    if (askedForQuote) {
      return res.status(200).json({
        reply: `Great! To give you an accurate quote for your move, here are a few easy options:<br><br>1️⃣ <strong>Quick online form</strong> - takes just 2 minutes<br>👉 <a href="${quoteUrl}" style="color: #0066cc; text-decoration: underline; font-weight: bold;">Fill out our form here</a><br><br>2️⃣ <strong>Give us a call</strong> - talk directly with our team<br>📞 ${phoneLink}<br><br>3️⃣ <strong>Send us an email</strong> - tell us what you need<br>📧 ${emailLink}<br><br>Whichever you choose, we'll get back to you quickly with a personalized quote!`
      });
    }

    // --- DOAR DACĂ NU E NICIUNUL DIN CELE DE MAI SUS, MERGE LA OPENAI ---
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant. Be friendly, conversational, and human-like.

Important:
- Use "we", "our team" - you're part of Ants Removals
- Be helpful and natural in conversation
- Never say you're AI or mention other companies
- For prices: say "We recommend a free survey for an accurate quote"
- For storage: mention our wooden containers (250 cu ft, 2.18m × 1.52m × 2.34m)

Talk like a real person helping with moving and storage questions!
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
        temperature: 0.8, // Mai creativ
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({ error: "OpenAI error: " + data.error.message });
    }

    let reply = data.choices[0].message.content || "";
    
    // Fără adăugare de linkuri aici - lasă răspunsul natural de la OpenAI

    res.status(200).json({ reply });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
