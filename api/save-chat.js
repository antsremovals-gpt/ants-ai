import mailjet from "node-mailjet";

const mailjetClient = mailjet.apiConnect(
  "9c24e3383ec9713c7dc1f939224c052b", // API Key
  "a2af416983593878c133071a924c8d90"  // Secret Key
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chatID, messages } = req.body;

  const conversationText = messages
    .map((msg, i) => `${i + 1}. ${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
    .join("\n\n");

  try {
    const result = await mailjetClient
      .post("send", { version: "v3.1" })
      .request({
        Messages: [
          {
            From: {
              Email: "ants.ai.report@gmail.com",
              Name: "AI-Asistent-ANTS",
            },
            To: [
              {
                Email: "ants.ai.report@gmail.com",
                Name: "Ovidiu",
              },
            ],
            Subject: `🧠 AI Conversation [ID: ${chatID}]`,
            TextPart: conversationText,
          },
        ],
      });

    res.status(200).json({
      success: true,
      message: "Email sent via Mailjet",
      result: result.body,
    });
  } catch (error) {
    console.error("❌ Mailjet send error:", error);
    res.status(500).json({ error: "Failed to send email via Mailjet" });
  }
}
