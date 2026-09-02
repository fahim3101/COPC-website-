// CoPC AI Assistant widget — sends messages to /api/chat (Vercel serverless
// function), which proxies to Groq. No API key ever touches the browser.
(function () {
  const toggleBtn = document.getElementById("ai-toggle-btn");
  const closeBtn = document.getElementById("ai-close-btn");
  const panel = document.getElementById("ai-panel");
  const messagesEl = document.getElementById("ai-messages");
  const form = document.getElementById("ai-form");
  const input = document.getElementById("ai-input");
  const sendBtn = document.getElementById("ai-send-btn");

  if (!toggleBtn || !panel) return;

  const backToTop = document.getElementById("back-to-top");

  let history = []; // { role: 'user' | 'assistant', content: string }
  let isSending = false;

  function openPanel() {
    panel.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
    if (backToTop) backToTop.classList.add("ai-hidden");
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
    if (backToTop) backToTop.classList.remove("ai-hidden");
  }

  toggleBtn.addEventListener("click", () => {
    panel.hidden ? openPanel() : closePanel();
  });
  closeBtn.addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = "ai-msg " + (role === "user" ? "ai-msg-user" : "ai-msg-bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "ai-msg-typing";
    div.id = "ai-typing-indicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("ai-typing-indicator");
    if (el) el.remove();
  }

  async function sendMessage(text) {
    if (isSending) return;
    isSending = true;
    sendBtn.disabled = true;

    addMessage(text, "user");
    history.push({ role: "user", content: text });
    showTyping();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      hideTyping();

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't generate a reply.";
      addMessage(reply, "bot");
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      hideTyping();
      const div = addMessage(
        "Oops, something went wrong reaching the assistant. Try again in a bit.",
        "bot"
      );
      div.classList.add("ai-msg-error");
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    sendMessage(text);
  });
})();
