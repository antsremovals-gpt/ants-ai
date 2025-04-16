export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("✅ Endpoint is alive");
    res.status(200).json({ success: true, message: "Endpoint is alive and working!" });
  } catch (error) {
    console.error("❌ Error in endpoint:", error);
    res.status(500).json({ error: "Endpoint crashed." });
  }
}
