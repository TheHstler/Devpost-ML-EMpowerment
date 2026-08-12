const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Serve static frontend files
// In production, '.' serves index.html, app.js, style.css, favicon.svg etc.
app.use(express.static("."));

// Proxy route — keeps ANTHROPIC_API_KEY server-side only
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.startsWith("sk-ant-PASTE")) {
    console.error("GymBeat: ANTHROPIC_API_KEY is not configured");
    return res.status(503).json({ error: "API key not configured on server." });
  }

  // Only forward safe fields — never expose internal params
  const { model, max_tokens, system, messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("GymBeat: Anthropic API error", response.status, errText.slice(0, 200));
      return res.status(502).json({ error: "Upstream API error." });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("GymBeat: fetch error", err.message);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

// Catch-all: serve index.html for any unknown route (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "." });
});

app.listen(PORT, () => {
  console.log(`✅ GymBeat running at http://localhost:${PORT}`);
});
