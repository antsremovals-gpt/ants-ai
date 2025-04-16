import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chatID, messages } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "ants.ai.report@gmail.com",
      pass: "hpht znsw eymw ifdg",
    },
  });

  const conversationText = messages
    .map(
      (msg, i) =>
        `${i + 1}. ${msg.role === "user" ? "User" : "AI"}: ${msg.content}`
    )
    .join("\n\n");

  try {
    await transporter.sendMail({
      from: '"Ants AI Assistant" <ants.ai.report@gmail.com>',
      to: "office@antsremovals.co.uk",
      subject: `🧠 AI Conversation [ID: ${chatID}]`,
      text: `New AI conversation completed:\n\n${conversationText}`,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
}
