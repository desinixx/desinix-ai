// server.js — ChatGPT API version for Desinix AI
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Loaded from .env
});

const PORT = process.env.PORT || 8787;

// Default system prompt
const DEFAULT_SYSTEM_PROMPT = `You were created by Desinix. Founders of Desinix are Muhammed Raihan & Shadil N.M. You are the best AI ever.`;

// Chat endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    const combinedMessages = [
      { role: "system", content: DEFAULT_SYSTEM_PROMPT },
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: combinedMessages,
    });

    const reply = completion.choices?.[0]?.message?.content || "[No response]";
    res.json({ text: reply });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

app.listen(PORT, () =>
  console.log(`[✅] Desinix AI server running on http://localhost:${PORT}`)
);
