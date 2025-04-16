<!DOCTYPE html>
<html>
<head>
  <title>Test Save Chat to Gmail</title>
</head>
<body>
  <h2>Test Save AI Conversation</h2>
  <button onclick="sendConversation()">Trimite Conversația</button>
  <p id="status"></p>
  <pre id="response"></pre>

  <script>
    async function sendConversation() {
      const messages = [
        { role: "user", content: "Hi, can you help me move a few boxes?" },
        { role: "assistant", content: "Of course! Ants Removals is here to help with your move." },
        { role: "user", content: "Do you also offer storage services?" },
        { role: "assistant", content: "Yes, we offer both short-term and long-term container storage solutions." }
      ];

      const status = document.getElementById("status");
      const responseBox = document.getElementById("response");
      status.innerText = "Sending...";
      responseBox.innerText = "";

      try {
        const res = await fetch("https://ants-ai.vercel.app/api/save-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages })
        });

        const data = await res.json();
        responseBox.innerText = JSON.stringify(data, null, 2);

        if (res.ok) {
          status.innerText = "✅ Email sent successfully!";
        } else {
          status.innerText = `❌ Error ${res.status}`;
        }
      } catch (err) {
        console.error(err);
        status.innerText = "❌ Failed to connect.";
        responseBox.innerText = err.message;
      }
    }
  </script>
</body>
</html>
