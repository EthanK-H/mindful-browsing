import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractClaims, checkClaim } from "./lib/claude.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Mint a short-lived AssemblyAI streaming token so the browser can open the
// WebSocket directly without ever seeing the real API key. Returns 501 when
// no key is configured — the UI falls back to demo (paste-a-transcript) mode.
app.get("/api/streaming-token", async (req, res) => {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return res.status(501).json({ error: "ASSEMBLYAI_API_KEY not configured — live mic mode unavailable" });
  }
  try {
    const r = await fetch(
      "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600",
      { headers: { Authorization: key } }
    );
    if (!r.ok) {
      const body = await r.text();
      return res.status(502).json({ error: `AssemblyAI token request failed (${r.status}): ${body}` });
    }
    const data = await r.json();
    res.json({ token: data.token });
  } catch (err) {
    res.status(502).json({ error: `AssemblyAI token request failed: ${err.message}` });
  }
});

// Extract checkable factual claims from a window of transcript.
// Body: { transcript: string, knownClaims: string[] }
app.post("/api/extract-claims", async (req, res) => {
  const { transcript, knownClaims = [] } = req.body || {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript (string) is required" });
  }
  try {
    const claims = await extractClaims(transcript, knownClaims);
    res.json({ claims });
  } catch (err) {
    console.error("extract-claims failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fact-check a single claim with web search. Slow (10-60s) by design;
// the client shows the claim as "checking" until this resolves.
// Body: { claim: string, speaker?: string, context?: string }
app.post("/api/check-claim", async (req, res) => {
  const { claim, speaker, context } = req.body || {};
  if (!claim || typeof claim !== "string") {
    return res.status(400).json({ error: "claim (string) is required" });
  }
  try {
    const result = await checkClaim({ claim, speaker, context });
    res.json(result);
  } catch (err) {
    console.error("check-claim failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Debate fact checker running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("WARNING: ANTHROPIC_API_KEY is not set — claim extraction and fact-checking will fail.");
  }
  if (!process.env.ASSEMBLYAI_API_KEY) {
    console.warn("Note: ASSEMBLYAI_API_KEY is not set — live mic mode disabled, demo mode still works.");
  }
});
