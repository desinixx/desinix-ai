const $ = (sel) => document.querySelector(sel);
const messagesEl = $("#messages");
const inputEl = $("#userInput");
const sendBtn = $("#sendBtn");
const clearBtn = $("#clearBtn");
const systemPromptEl = $("#systemPrompt");
const exportBtn = $("#exportBtn");
const deleteHistoryBtn = $("#deleteHistory");
const historyList = $("#historyList");

let messages = JSON.parse(localStorage.getItem("gemini_chat_messages") || "[]");
let history = JSON.parse(localStorage.getItem("gemini_chat_history") || "[]");
let currentThreadId = localStorage.getItem("gemini_current_thread") || null;

function uid(){ return Math.random().toString(36).slice(2, 10); }

function save(){
  localStorage.setItem("gemini_chat_messages", JSON.stringify(messages));
  localStorage.setItem("gemini_chat_history", JSON.stringify(history));
  if (currentThreadId) localStorage.setItem("gemini_current_thread", currentThreadId);
}

function render(){
  messagesEl.innerHTML = "";
  for (const m of messages){
    const item = document.createElement("div");
    item.className = "message";
    item.innerHTML = `
      <div class="role">${m.role === "user" ? "You" : "AI"}</div>
      <div class="bubble">${escapeHtml(m.content)}</div>
    `;
    messagesEl.appendChild(item);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function escapeHtml(str){
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function send(){
  const text = inputEl.value.trim();
  if (!text) return;

  messages.push({ role: "user", content: text });
  inputEl.value = "";
  render(); save();

  const systemPrompt = systemPromptEl.value || "";
  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, systemPrompt })
    });
    if (!r.ok){
      const err = await r.text();
      messages.push({ role: "assistant", content: "API error: " + err });
      render(); save();
      return;
    }
    const data = await r.json();
    const reply = data.text || "(empty)";
    messages.push({ role: "assistant", content: reply });
    render(); save();
  } catch (e){
    messages.push({ role: "assistant", content: "Network error: " + String(e) });
    render(); save();
  }
}

function newThread(){
  currentThreadId = uid();
  history.unshift({
    id: currentThreadId,
    title: messages.find(m => m.role === "user")?.content?.slice(0, 40) || "New chat",
    createdAt: Date.now()
  });
  messages = [];
  save();
  render();
  renderHistory();
}

function renderHistory(){
  historyList.innerHTML = "";
  for (const item of history){
    const li = document.createElement("li");
    li.textContent = item.title;
    li.onclick = () => {
      currentThreadId = item.id;
      render();
      save();
    };
    historyList.appendChild(li);
  }
}

function clearMessages(){
  messages = [];
  render(); save();
}

function exportChat(){
  const blob = new Blob([JSON.stringify({ messages }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    send();
  }
});
clearBtn.addEventListener("click", clearMessages);
exportBtn.addEventListener("click", exportChat);
deleteHistoryBtn.addEventListener("click", () => {
  history = [];
  save();
  renderHistory();
});

// Start
if (!currentThreadId) newThread();
render();
renderHistory();

// Auto focus on load
window.onload = () => inputEl.focus();
