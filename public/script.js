const $ = (sel) => document.querySelector(sel);
const messagesEl = $("#messages");
const inputEl = $("#userInput");
const sendBtn = $("#sendBtn");
const exportBtn = $("#exportBtn");
const deleteHistoryBtn = $("#deleteHistory");
const historyList = $("#historyList");
const newChatBtn = $("#newChatBtn");
const loadingIndicator = $("#loadingIndicator");
const menuBtn = $("#menuBtn");
const sidebar = $("#sidebar");
const overlay = $("#overlay");

let messages = JSON.parse(localStorage.getItem("desinix_chat_messages") || "[]");
let history = JSON.parse(localStorage.getItem("desinix_chat_history") || "[]");
let currentThreadId = localStorage.getItem("desinix_current_thread") || null;
let isTyping = false;

function uid() { return Math.random().toString(36).slice(2, 10); }

function save() {
  localStorage.setItem("desinix_chat_messages", JSON.stringify(messages));
  localStorage.setItem("desinix_chat_history", JSON.stringify(history));
  if (currentThreadId) localStorage.setItem("desinix_current_thread", currentThreadId);
}

function render() {
  messagesEl.innerHTML = "";
  for (const m of messages) {
    const item = document.createElement("div");
    item.className = `message ${m.role}`;
    const formatted = m.content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
    item.innerHTML = formatted;
    messagesEl.appendChild(item);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showLoading() { loadingIndicator.style.display = "block"; }
function hideLoading() { loadingIndicator.style.display = "none"; }

async function send() {
  const text = inputEl.value.trim();
  if (!text || isTyping) return;

  messages.push({ role: "user", content: text });
  inputEl.value = "";
  render(); save();
  showLoading();

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    if (!res.ok) {
      hideLoading();
      messages.push({ role: "assistant", content: "API error: " + (await res.text()) });
      render(); save();
      return;
    }

    const data = await res.json();
    const reply = data.text || "(No response)";
    hideLoading();
    await typeMessage(reply);
    save();
  } catch (e) {
    hideLoading();
    messages.push({ role: "assistant", content: "Network error: " + e.message });
    render(); save();
  }
}

async function typeMessage(text) {
  const div = document.createElement("div");
  div.className = "message assistant";
  messagesEl.appendChild(div);
  const bubble = div;

  isTyping = true;
  for (let i = 0; i < text.length; i++) {
    bubble.innerHTML = text
      .substring(0, i + 1)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
    messagesEl.scrollTop = messagesEl.scrollHeight;
    await new Promise((r) => setTimeout(r, 15));
  }
  messages.push({ role: "assistant", content: text });
  isTyping = false;
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function newThread() {
  currentThreadId = uid();
  history.unshift({
    id: currentThreadId,
    title: messages.find((m) => m.role === "user")?.content?.slice(0, 40) || "New chat",
    createdAt: Date.now()
  });
  messages = [];
  save();
  render();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = "";
  for (const item of history) {
    const li = document.createElement("li");
    li.textContent = item.title;
    li.onclick = () => {
      currentThreadId = item.id;
      render();
      save();
      closeSidebar();
    };
    historyList.appendChild(li);
  }
}

function exportChat() {
  const blob = new Blob([JSON.stringify({ messages }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "desinix-chat.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Sidebar open/close
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

menuBtn.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);
sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
exportBtn.addEventListener("click", exportChat);
deleteHistoryBtn.addEventListener("click", () => {
  history = [];
  save();
  renderHistory();
});
newChatBtn.addEventListener("click", newThread);

// INIT
if (!currentThreadId) newThread();
render();
renderHistory();
window.onload = () => inputEl.focus();
