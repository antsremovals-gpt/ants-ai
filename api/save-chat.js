import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Luăm absolut tot ce trimite site-ul, indiferent de format
    const body = req.body;
    
    // Transformăm tot ce am primit într-un text citibil
    const debugInfo = JSON.stringify(body, null, 2);

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      secure: true,
      auth: {
        user: 'ants.ai.report@gmail.com',
        pass: 'xrkjpmbpktbonlsu'
      }
    });

    // Trimitem email-ul chiar dacă nu sunt "mesaje" clare
    // Așa vedem exact ce trimite site-ul tău
    await transporter.sendMail({
      from: 'ants.ai.report@gmail.com',
      to: 'ants.ai.report@gmail.com',
      subject: `AI Chat RAW DATA - ${new Date().toLocaleString('en-GB')}`,
      text: `Date primite de la site:\n\n${debugInfo}`
    });

    return res.status(200).json({ success: true, received: body });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
