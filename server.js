import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
if (!OPENAI_API_KEY) {
  console.warn("[WARN] OPENAI_API_KEY is missing. Set it in .env");
}
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use("/api/", limiter);
app.use(express.static(path.join(__dirname, "public")));
// Simple /health
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string." });
    }
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Server missing OpenAI API key." });
    }
    const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
    const messages = [
      { role: "system", content: "You are Asr.ai, a helpful, friendly school project assistant. Keep responses concise and kind." },
      ...recentHistory.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: String(h.content || "") })),
      { role: "user", content: message }
    ];
    // Use native fetch (Node 18+)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: OPENAI_MODEL, messages, temperature: 0.7 })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a response.";
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected server error." });
  }
});
app.listen(PORT, () => console.log(`Asr.ai running on http://localhost:${PORT}`));
