export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // Răspunde la preflight
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

    // Verificăm că avem ce salva
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages to save" });
    }

    // Trimitere email logic aici – momentan doar log
    console.log("✅ Chat received:", chatID);
    console.log(JSON.stringify(messages, null, 2));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Save Chat Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
