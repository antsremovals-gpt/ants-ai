const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "ants.ai.report@gmail.com",
    pass: "hpht znsw eymw ifdg"
  }
});

function formatDate(date) {
  return date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", "");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages received" });
  }

  try {
    const startTime = new Date(messages[0].timestamp || Date.now());
    const endTime = new Date(messages[messages.length - 1].timestamp || Date.now());
    const subject = `AI Chat – ${formatDate(startTime)} to ${formatDate(endTime)}`;

    const htmlBody = messages.map(msg => {
      return `<p><strong>${msg.role.toUpperCase()}:</strong> ${msg.content}</p>`;
    }).join("<hr>");

    await transporter.sendMail({
      from: '"AI-Asistent-ANTS" <ants.ai.report@gmail.com>',
      to: "ants.ai.report@gmail.com",
      subject: subject,
      html: `<h2>Full AI Conversation</h2>${htmlBody}`
    });

    res.status(200).json({ success: true, message: "Email sent successfully via Gmail." });
  } catch (error) {
    console.error("Gmail SMTP error:", error);
    res.status(500).json({ error: "Failed to send email via Gmail." });
  }
};
