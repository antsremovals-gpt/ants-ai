import mailjet from "node-mailjet";

const mailjetClient = mailjet.apiConnect(
  "9c24e3383ec9713c7dc1f939224c052b",
  "a2af416983593878c133071a924c8d90"
);

function formatDate(date) {
  return date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", "");
}

export default async function handler(req, res) {
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

    await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: "ants.ai.report@gmail.com",
              Name: "AI-Asistent-ANTS"
            },
            To: [
              {
                Email: "ants.ai.report@gmail.com",
                Name: "Ovidiu"
              }
            ],
            Subject: subject,
            HTMLPart: `<h2>Full AI Conversation</h2>${htmlBody}`
          }
        ]
      });

    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Mailjet error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
}
