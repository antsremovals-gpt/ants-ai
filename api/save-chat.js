let fullConversation = [];

function sendChatMessage() {
  const inputBox = document.getElementById("chat-question");
  const input = inputBox.value.trim();
  const responseArea = document.getElementById("chat-response");

  if (input === "") return;

  fullConversation.push({ role: "user", content: input });

  responseArea.innerHTML = '<div class="question">Q: ' + input + '</div><div class="answer">Thinking...</div>';

  fetch("https://ants-ai.vercel.app/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages: [{ role: "user", content: input }] })
  })
    .then(res => res.json())
    .then(data => {
      if (data.reply) {
        fullConversation.push({ role: "assistant", content: data.reply });

        responseArea.innerHTML =
          '<div class="question">Q: ' + input + '</div>' +
          '<div class="answer">A: ' + data.reply + '</div>';
      }
    });

  inputBox.value = "";
}

// 🕒 Salvare automată după 5 minute inactivitate sau refresh
let inactivityTimer;

function scheduleSave() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    if (fullConversation.length > 0) {
      fetch("https://ants-ai.vercel.app/api/save-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chatID: Date.now().toString(),
          messages: fullConversation
        })
      }).then(() => {
        fullConversation = [];
      });
    }
  }, 300000); // 5 minute
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("chat-question").addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
      scheduleSave();
    }
  });

  document.getElementById("send-button").addEventListener("click", () => {
    sendChatMessage();
    scheduleSave();
  });

  window.addEventListener("beforeunload", () => {
    if (fullConversation.length > 0) {
      navigator.sendBeacon("https://ants-ai.vercel.app/api/save-chat", JSON.stringify({
        chatID: Date.now().toString(),
        messages: fullConversation
      }));
    }
  });
});
