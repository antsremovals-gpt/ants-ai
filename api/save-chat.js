import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS headers
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
    const { chatID, messages, from, to, subject, content, reason } = req.body;

    let conversationText = '';

    // Dacă mesajele vin în format complet (frontend)
    if (messages && Array.isArray(messages) && messages.length > 0) {
      conversationText = messages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");
    }

    // Dacă trimit direct textul (ex: din Postman)
    if (content) {
      conversationText = content + (reason ? `\n\nReason: ${reason}` : '');
    }

    if (!conversationText) {
      return res.status(400).json({ error: "No content to send" });
    }

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      secure: true,
      auth: {
        user: 'ants.ai.report@gmail.com',
        pass: 'hphtznsweymwifdg'
      }
    });

    await transporter.sendMail({
      from: `"${from || 'AI-Asistent Chat'}" <ants.ai.report@gmail.com>`,
      to: to || 'ants.ai.report@gmail.com',
      subject: subject || `AI Chat – ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      text: conversationText
    });

    res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error("Save Chat Error:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
}
