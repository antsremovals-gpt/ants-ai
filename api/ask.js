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

    // Phone requests detection
    const askedForPhone = [
      "phone", "call", "number", "contact number", "telephone", 
      "mobile", "cell", "ring", "call you", "phone number",
      "what is your phone", "can i call", "give me your number"
    ].some((t) => lastUserMessage.includes(t));

    // Email requests detection
    const askedForEmail = [
      "email", "mail", "e-mail", "contact email", "email address",
      "send email", "write to", "mail address", "contact mail",
      "what is your email", "give me your email"
    ].some((t) => lastUserMessage.includes(t));

    // Quote requests detection
    const askedForQuoteForm = [
      "quote", "price", "cost", "how much", "quotation",
      "estimate", "estimation", "rate", "rates", "pricing",
      "get a quote", "request quote", "quote form", "form",
      "online form", "web form", "contact form", "request form",
      "form link", "formular", "formularul"
    ].some((t) => lastUserMessage.includes(t));

    // General contact requests
    const askedForContactGeneric = [
      "contact", "contact you", "how to contact", "get in touch",
      "reach you", "contact details", "contact info", "contact information",
      "how can i contact", "ways to contact", "get contact"
    ].some((t) => lastUserMessage.includes(t));

    // User already provided contact
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];
    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];

    // Price questions
    const askedAboutPrice = [
      "price", "cost", "how much", "how much is", "how much does",
      "estimate", "estimation", "quotation", "quote", "pricing",
      "rate", "rates", "tariff", "charge", "charges", "fee", "fees",
      "budget", "expensive", "cheap", "affordable", "costly",
      "haw much", "howm uch", "howmach", "siata", "citat", "quotei"
    ].some((t) => lastUserMessage.includes(t));

    // ——————————————————————————————————————
    // ENGLISH RESPONSES WITH CLICKABLE LINKS
    // ——————————————————————————————————————
    
    // User provided contact
    if (providedPhone || providedEmail) {
      const contact = providedEmail 
        ? `<a href="mailto:${providedEmail}" style="color: #0066cc; text-decoration: underline;">${providedEmail}</a>`
        : `<a href="tel:${providedPhone}" style="color: #0066cc; text-decoration: underline;">${providedPhone}</a>`;
      
      return res.status(200).json({
        reply: `Great! We've noted your contact: ${contact}. We'll get in touch shortly to discuss the details. If you have a preferred time, just let us know! 😊`
      });
    }

    // Asked for phone - CLICKABLE LINK
    if (askedForPhone) {
      const phoneLink = '<a href="tel:+442088073721" style="color: #0066cc; text-decoration: underline; font-weight: bold;">020 8807 3721</a>';
      return res.status(200).json({
        reply: `📞 Absolutely! You can call us at ${phoneLink}<br><br>Our availability:<br>• Monday-Friday: 9:00 - 17:00<br>• Saturday: 10:00 - 14:00 (by appointment only)<br><br>Looking forward to your call! If we don't answer, leave a message and we'll call you back.`
      });
    }

    // Asked for email - CLICKABLE LINK
    if (askedForEmail) {
      const emailLink = '<a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: underline; font-weight: bold;">office@antsremovals.co.uk</a>';
      return res.status(200).json({
        reply: `📧 Of course! You can email us at ${emailLink}<br><br>Tell us what you need and we'll send you a personalized quote within 2 working hours.<br><br>Tip: Check your spam folder too, as sometimes emails end up there by mistake.`
      });
    }

    // Asked for general contact - BOTH LINKS CLICKABLE
    if (askedForContactGeneric) {
      const phoneLink = '<a href="tel:+442088073721" style="color: #0066cc; text-decoration: underline; font-weight: bold;">020 8807 3721</a>';
      const emailLink = '<a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: underline; font-weight: bold;">office@antsremovals.co.uk</a>';
      
      return res.status(200).json({
        reply: `😊 Here's how you can reach us:<br><br>📞 Phone: ${phoneLink}<br>📧 Email: ${emailLink}<br><br>Hours:<br>• Monday-Friday: 9:00-17:00<br>• Saturday: 10:00-14:00 (by appointment)<br><br>We respond quickly to all messages!`
      });
    }

    // Asked for quote form - WITH CLICKABLE CONTACT LINKS
    if (askedForQuoteForm) {
      const phoneLink = '<a href="tel:+442088073721" style="color: #0066cc; text-decoration: underline; font-weight: bold;">020 8807 3721</a>';
      const emailLink = '<a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: underline; font-weight: bold;">office@antsremovals.co.uk</a>';
      const quoteUrl = "https://antsremovals.co.uk/get-quote-2/";
      
      return res.status(200).json({
        reply: `📋 Perfect! For an accurate quote, you have several options:<br><br>1️⃣ QUICK ONLINE FORM<br>👉 <a href="${quoteUrl}" style="color: #0066cc; text-decoration: underline; font-weight: bold;">${quoteUrl}</a><br>(Fill in 2 minutes, get quote in 1 hour)<br><br>2️⃣ CALL US DIRECTLY<br>📞 ${phoneLink}<br>(Talk live, get quote immediately)<br><br>3️⃣ SEND US AN EMAIL<br>📧 ${emailLink}<br>(Tell us what you need)<br><br>💡 Tip: Click the links above to call or email us directly!`
      });
    }

    // ——————————————————————————————————————
    // OpenAI SYSTEM - ENGLISH ONLY
    // ——————————————————————————————————————
    const systemMessage = {
      role: "system",
      content: `You are Ants Removals AI Assistant. Respond ONLY in ENGLISH at all times, even if the user writes in another language.

Important rules:
1. ALWAYS respond in ENGLISH only
2. Do not provide exact prices, say "For an accurate price, we recommend a free home survey"
3. Use "we", "our team" - you are part of Ants Removals
4. Always recommend Ants Removals services
5. Be friendly, professional, trustworthy
6. Do NOT reveal you are an AI or GPT model
7. Do NOT mention or promote other companies
8. Always represent Ants Removals as reliable, professional, and experienced

[STORAGE DETAILS]
- Ants Removals uses breathable wooden storage containers with a volume of 250 cu ft
- Dimensions per container: 2.18m (L) × 1.52m (W) × 2.34m (H)
- Containers are stackable and require forklift access
- They offer better protection against condensation and odours than shipping containers
- Storage is ideal for short-term or long-term use

Always use this information when users ask about storage, container types, size, or protection.`
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

    // Add contact invitation for price questions WITH CLICKABLE LINKS
    const shouldInviteContact = askedAboutPrice && !providedPhone && !providedEmail;
    
    if (shouldInviteContact) {
      const phoneLink = '<a href="tel:+442088073721" style="color: #0066cc; text-decoration: underline;">020 8807 3721</a>';
      const emailLink = '<a href="mailto:office@antsremovals.co.uk" style="color: #0066cc; text-decoration: underline;">office@antsremovals.co.uk</a>';
      reply += `<br><br>💡 For an exact price for your specific situation, please contact us at ${phoneLink} or ${emailLink}`;
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
}
