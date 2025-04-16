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
  const { chatID, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages to save" });
  }

  // Formatăm conversația pentru email
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  // Configurare nodemailer
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'ants.ai.report@gmail.com',
      pass: 'hphtznsweymwifdg'
    }
  });

  await transporter.sendMail({
    from: 'AI-Asistent-ANTS <ants.ai.report@gmail.com>',
    to: 'ants.ai.report@gmail.com',
    subject: `AI Chat - ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    text: conversationText
  });

  res.status(200).json({ success: true });
} catch (error) {
  console.error("Save Chat Error:", error);
  res.status(500).json({ error: "Internal server error" });
}
