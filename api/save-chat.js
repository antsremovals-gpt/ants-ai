export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  // Afișăm în logs conversația primită
  console.log("📩 AI Conversation Received:");
  messages.forEach((msg, i) => {
    console.log(`#${i + 1} | ${msg.role.toUpperCase()}: ${msg.content}`);
  });

  res.status(200).json({ success: true, message: "Conversation received and logged." });
}
