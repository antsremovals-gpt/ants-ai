import mailjet from "node-mailjet";

const mailjetClient = mailjet.apiConnect(
  "9c24e3383ec9713c7dc1f939224c052b",
  "a2af416983593878c133071a924c8d90"
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await mailjetClient
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
            Subject: "Test – Mailjet Connection",
            TextPart: "This is a simple test to verify Mailjet connection is working."
          }
        ]
      });

    console.log("Mailjet response:", result.body);
    res.status(200).json({ success: true, message: "Mail sent." });
  } catch (error) {
    console.error("Mailjet error:", error);
    res.status(500).json({ error: "Failed to send email via Mailjet." });
  }
}
