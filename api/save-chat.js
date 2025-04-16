from pathlib import Path

# Cod complet pentru chat-save.js, combinat cu salvarea conversației + backend funcțional
chat_save_code = """
// ==============================
// Ants Removals – Auto Save Chat + Colectare conversație
// ==============================

// Conversație completă
const conversation = [];
let inactivityTimer = null;

// Adaugă mesaj nou (user sau AI)
function saveMessage(role, content) {
  conversation.push({ role, content });
  resetInactivityTimer();
}

// Trimite conversația salvată la backend
function sendConversation(reason = "auto") {
  if (conversation.length === 0) return;

  const payload = {
    chatID: `chat-${Date.now()}-${reason}`,
    messages: [...conversation],
  };

  fetch("/api/save-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((data) => console.log("✅ Conversație trimisă:", data))
    .catch((err) => console.error("❌ Eroare trimitere:", err));
}

// Timer 5 min inactivitate
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    sendConversation("inactivity");
  }, 5 * 60 * 1000);
}

// Trimite automat la închidere/refresh
window.addEventListener("beforeunload", () => {
  sendConversation("exit");
});

// ==============================
// Funcția de trimitere către OpenAI (exemplu funcțional actualizat)
// ==============================
async function sendToOpenAI(userMessage) {
  saveMessage("user", userMessage); // Salvăm mesajul userului

  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage }),
  });

  const data = await response.json();
  const aiReply = data.reply;

  saveMessage("assistant", aiReply); // Salvăm răspunsul AI

  return aiReply;
}

// ==============================
// Exemplu de folosire
// ==============================
// (Poți apela sendToOpenAI("Salut! Vreau o ofertă.") din consola browserului pentru test)
"""

# Salvăm fișierul
chat_save_path = Path("/mnt/data/chat-save.js")
chat_save_path.write_text(chat_save_code)

chat_save_path
