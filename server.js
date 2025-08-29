// server.js (മുൻപ് ഉണ്ടായത് മാറ്റി ഇതാൽ റിപ്ലേസ് ചെയ്യുക)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 8787;

// <-- ഇവിടെ നിങ്ങൾ ആവശ്യപ്പെട്ട ശബ്ദമാണ് സ്ഥിരമായി ചേർക്കുന്നത് -->
const DEFAULT_SYSTEM_PROMPT = `You was created by Desinix. Founders of Desinix is Muhammed Raihan & Shadil N.M . Am the best ai ever.`;

app.post("/api/generate", async (req, res) => {
  try {
    // Client may optionally send messages and a systemPrompt, but DEFAULT_SYSTEM_PROMPT always prepended.
    const { messages, systemPrompt } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    // Convert messages -> contents (Gemini expected shape)
    const contents = [];

    // First, always include the DEFAULT_SYSTEM_PROMPT as a model role part
    contents.push({
      role: "model",
      parts: [{ text: DEFAULT_SYSTEM_PROMPT }]
    });

    // If client provided an extra systemPrompt, include it after default (optional)
    if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
      contents.push({
        role: "model",
        parts: [{ text: systemPrompt.trim() }]
      });
    }

    // Then push user messages
    for (const m of messages) {
      contents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content || "" }]
      });
    }

    const body = { contents };

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const r = await fetch(url + "?key=" + encodeURIComponent(GEMINI_API_KEY), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).send(errText);
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") || "";
    return res.json({ text, raw: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

app.listen(PORT, () => console.log(`[OK] Server running on http://localhost:${PORT}`));
