import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const data = req.body;

    // Extragem datele exact cum le trimite site-ul tău
    const chatContent = data.content || "No content received";
    const chatSubject = data.subject || `AI Chat Log - ${new Date().toLocaleString('en-GB')}`;
    const reason = data.reason || "Automatic save";

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      secure: true,
      auth: {
        user: 'ants.ai.report@gmail.com',
        pass: 'xrkjpmbpktbonlsu'
      }
    });

    await transporter.sendMail({
      from: 'Ants AI Assistant <ants.ai.report@gmail.com>',
      to: 'ants.ai.report@gmail.com',
      subject: chatSubject,
      text: `Reason for saving: ${reason}\n\nCONVERSATION:\n\n${chatContent}`
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending mail:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
