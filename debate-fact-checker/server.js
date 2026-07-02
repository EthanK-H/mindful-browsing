import express from "express";
import dns from "node:dns";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Node's "happy eyeballs" races connection attempts with a 250ms timeout per
// attempt — far too aggressive for WSL2/home networks with latency spikes,
// and the usual cause of intermittent `fetch failed ... ETIMEDOUT` bursts.
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

// Optional escape hatch if one IP family is broken on your network:
// set DNS_ORDER=ipv4first or DNS_ORDER=ipv6first in .env.
if (process.env.DNS_ORDER) dns.setDefaultResultOrder(process.env.DNS_ORDER);
import {
  selectClaims,
  checkClaim,
  EXTRACTION_MODEL,
  FACTCHECK_MODEL,
  MODEL_OPTIONS,
} from "./lib/claude.js";

// Only models from the catalog may be selected by the client; anything else
// silently falls back to the server-configured default.
const VALID_MODELS = new Set(MODEL_OPTIONS.map((m) => m.id));
const pickModel = (requested, fallback) => (VALID_MODELS.has(requested) ? requested : fallback);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Model catalog + server defaults, so the UI dropdowns reflect .env config.
app.get("/api/config", (req, res) => {
  res.json({
    models: MODEL_OPTIONS,
    defaults: { extraction: EXTRACTION_MODEL, factcheck: FACTCHECK_MODEL },
  });
});

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

// Select the load-bearing, checkable claims from the FULL transcript.
// Run on demand (the "Fact-check" button), not live.
// Body: { transcript: string, knownClaims: string[], model?: string }
app.post("/api/analyze", async (req, res) => {
  const { transcript, knownClaims = [], model } = req.body || {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript (string) is required" });
  }
  try {
    const claims = await selectClaims(transcript, knownClaims, pickModel(model, EXTRACTION_MODEL));
    res.json({ claims });
  } catch (err) {
    console.error("analyze failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fact-check a single claim with web search. Slow (10-60s) by design;
// the client shows the claim as "checking" until this resolves.
// Body: { claim: string, speaker?: string, context?: string }
app.post("/api/check-claim", async (req, res) => {
  const { claim, speaker, context, model } = req.body || {};
  if (!claim || typeof claim !== "string") {
    return res.status(400).json({ error: "claim (string) is required" });
  }
  try {
    const result = await checkClaim({ claim, speaker, context, model: pickModel(model, FACTCHECK_MODEL) });
    res.json(result);
  } catch (err) {
    console.error("check-claim failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Debate fact checker running at http://localhost:${PORT}`);
  console.log(`Models: extraction=${EXTRACTION_MODEL}, fact-check=${FACTCHECK_MODEL}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("WARNING: ANTHROPIC_API_KEY is not set — claim extraction and fact-checking will fail.");
  }
  if (!process.env.ASSEMBLYAI_API_KEY) {
    console.warn("Note: ASSEMBLYAI_API_KEY is not set — live mic mode disabled, demo mode still works.");
  }
});
