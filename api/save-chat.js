export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { chatID, messages } = req.body;

  try {
    res.status(200).json({
      success: true,
      chatID,
      totalMessages: messages?.length || 0,
      message: "TEST OK – email logic not included in this version"
    });
  } catch (error) {
    res.status(500).json({ error: "Something went wrong." });
  }
}
