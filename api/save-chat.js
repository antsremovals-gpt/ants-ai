import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Invalid messages" });
    }

    const lastUserMessageRaw =
      messages[messages.length - 1]?.content || "";

    const lastUserMessage = lastUserMessageRaw.toLowerCase();

    // -----------------------------
    // CONTACT
    // -----------------------------
    const CONTACT = {
      phone: "020 8807 3721",
      email: "office@antsremovals.co.uk",
      website: "https://antsremovals.co.uk",
    };

    // -----------------------------
    // DETECT EMAIL / PHONE
    // -----------------------------
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
    const phoneRegex = /(\+?\d[\d\s().-]{7,}\d)/;

    const providedEmail = lastUserMessageRaw.match(emailRegex)?.[0];
    const providedPhone = lastUserMessageRaw.match(phoneRegex)?.[0];

    // -----------------------------
    // PRICE DETECTION (important)
    // -----------------------------
    const askedAboutPrice = [
      "price",
      "cost",
      "how much",
      "quote",
      "estimate",
      "tarif",
      "pret",
      "cât costă",
    ].some((t) => lastUserMessage.includes(t));

    // -----------------------------
    // SMALL JOB DETECTION
    // -----------------------------
    const isSmallJob = [
      "single",
      "one item",
      "sofa",
      "bed",
      "mattress",
      "chair",
      "fridge",
      "small move",
    ].some((t) => lastUserMessage.includes(t));

    // -----------------------------
    // EMAIL TRIGGER (only when user gives details)
    // -----------------------------
    if (providedEmail || providedPhone) {
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "ants.ai.report@gmail.com",
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: "AI Chat <ants.ai.report@gmail.com>",
        to: "ants.ai.report@gmail.com",
        subject: "New Lead from AI Chat",
        text: `User submitted contact:\n\n${providedEmail || providedPhone}`,
      });

      return res.status(200).json({
        reply: `Thanks — we've received your details (${providedEmail || providedPhone}). Our team will contact you shortly.`,
      });
    }

    // -----------------------------
    // SMALL JOB RESPONSE (NO AI)
    // -----------------------------
    if (isSmallJob) {
      return res.status(200).json({
        reply:
          "That sounds like a small job. We can help with that.\n\n" +
          "For an accurate price, please contact our office or leave your details and we’ll get back to you shortly.\n\n" +
          `📞 ${CONTACT.phone}\n📧 ${CONTACT.email}`,
      });
    }

    // -----------------------------
    // OPENAI CALL
    // -----------------------------
    const systemMessage = {
      role: "system",
      content: `
You are Ants Removals AI Assistant (UK).

RULES:
- Always respond in the same language as the user
- Never provide prices
- If asked for price → recommend free survey
- Be short, helpful, natural
- No emojis
- No other companies mention
- Always act as Ants Removals assistant

CONTACT:
Phone: ${CONTACT.phone}
Email: ${CONTACT.email}
Website: ${CONTACT.website}
      `.trim(),
    };

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [systemMessage, ...messages],
          temperature: 0.4,
          max_tokens: 300,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "OpenAI error",
      });
    }

    let reply = data.choices?.[0]?.message?.content || "";

    if (!reply || reply.length < 5) {
      return res.status(200).json({
        reply: `For an accurate price, please contact us:\n📞 ${CONTACT.phone}\n📧 ${CONTACT.email}`,
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Server error. Please try again later.",
    });
  }
}
