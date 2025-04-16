cenexiune save-chat.js cu apis si vercel functionala 



export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chatID, messages } = req.body;

  try {
    console.log(`Simulare email pentru chatID ${chatID}`);
    console.log(messages);
    res.status(200).json({
      success: true,
      message: "TEST OK – email logic not included in this version",
      totalMessages: messages.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
