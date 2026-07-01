/* Live Debate Fact Checker — client pipeline
 *
 * transcript utterances -> (debounced) claim extraction -> fact-check queue -> verdict cards
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  utterances: [],          // { speaker, text }
  claims: new Map(),       // id -> { id, text, speaker, category, status, verdict, ... }
  extractedThrough: 0,     // count of utterances already sent through extraction
  extracting: false,
  checkQueue: [],
  activeChecks: 0,
  mode: "idle",            // idle | live | demo
};

const MAX_CONCURRENT_CHECKS = 2;
const EXTRACTION_DEBOUNCE_MS = 2500;
const EXTRACTION_WINDOW = 14; // utterances of context per extraction call

let extractionTimer = null;
let transcriber = null;
let demoTimer = null;
let demoLines = [];
let demoIndex = 0;

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const transcriptEl = $("transcript");
const claimsEl = $("claims");
const partialEl = $("partial-line");
const statusPill = $("status-pill");
const micBtn = $("mic-btn");
const demoBtn = $("demo-btn");
const resetBtn = $("reset-btn");
const demoPanel = $("demo-panel");
const demoText = $("demo-text");

const SPEAKER_COLORS = ["#6fc2ff", "#ffb26f", "#8de08d", "#e79cf0", "#f2e06f", "#9fb6ff"];
const speakerColor = (() => {
  const assigned = new Map();
  return (name) => {
    if (!assigned.has(name)) assigned.set(name, SPEAKER_COLORS[assigned.size % SPEAKER_COLORS.length]);
    return assigned.get(name);
  };
})();

// ---------------------------------------------------------------------------
// Transcript handling
// ---------------------------------------------------------------------------
function addUtterance({ speaker, text }) {
  state.utterances.push({ speaker, text });

  transcriptEl.querySelector(".empty-note")?.remove();
  const p = document.createElement("p");
  p.className = "utterance";
  const chip = document.createElement("span");
  chip.className = "speaker-chip";
  chip.textContent = speaker;
  chip.style.background = speakerColor(speaker);
  p.appendChild(chip);
  p.appendChild(document.createTextNode(text));
  transcriptEl.insertBefore(p, partialEl);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;

  $("utterance-count").textContent = `${state.utterances.length} turns`;
  scheduleExtraction();
}

function showPartial(text) {
  partialEl.textContent = text;
  partialEl.classList.toggle("hidden", !text);
  if (text) transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

// ---------------------------------------------------------------------------
// Claim extraction (debounced after each finalized utterance)
// ---------------------------------------------------------------------------
function scheduleExtraction() {
  clearTimeout(extractionTimer);
  extractionTimer = setTimeout(runExtraction, EXTRACTION_DEBOUNCE_MS);
}

async function runExtraction() {
  if (state.extracting) {
    scheduleExtraction();
    return;
  }
  if (state.extractedThrough >= state.utterances.length) return;

  state.extracting = true;
  const upTo = state.utterances.length;
  const windowStart = Math.max(0, upTo - EXTRACTION_WINDOW);
  const transcript = state.utterances
    .slice(windowStart, upTo)
    .map((u) => `${u.speaker}: ${u.text}`)
    .join("\n");
  const knownClaims = [...state.claims.values()].map((c) => c.text);

  try {
    const res = await fetch("/api/extract-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, knownClaims }),
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const { claims } = await res.json();
    state.extractedThrough = upTo;
    for (const claim of claims) {
      if (claim.checkworthiness === "low") continue;
      enqueueClaim(claim, transcript);
    }
  } catch (err) {
    console.error("extraction failed:", err);
    // leave extractedThrough as-is so the next utterance retries this window
  } finally {
    state.extracting = false;
  }
}

// Client-side dedupe backstop on top of the model-side dedupe.
function normalizeClaim(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function enqueueClaim(claim, context) {
  const norm = normalizeClaim(claim.text);
  for (const existing of state.claims.values()) {
    if (normalizeClaim(existing.text) === norm) return;
  }
  const id = `claim-${state.claims.size + 1}-${Date.now()}`;
  const record = { id, ...claim, context, status: "checking", verdict: null };
  state.claims.set(id, record);
  renderClaim(record);
  state.checkQueue.push(id);
  pumpCheckQueue();
}

// ---------------------------------------------------------------------------
// Fact-check queue (bounded concurrency; each check is a slow web-search call)
// ---------------------------------------------------------------------------
async function pumpCheckQueue() {
  while (state.activeChecks < MAX_CONCURRENT_CHECKS && state.checkQueue.length) {
    const id = state.checkQueue.shift();
    state.activeChecks++;
    checkOne(id).finally(() => {
      state.activeChecks--;
      pumpCheckQueue();
    });
  }
}

async function checkOne(id) {
  const claim = state.claims.get(id);
  try {
    const res = await fetch("/api/check-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim: claim.text, speaker: claim.speaker, context: claim.context }),
    });
    if (!res.ok) throw new Error((await res.json()).error || res.statusText);
    const result = await res.json();
    Object.assign(claim, result, { status: "done" });
  } catch (err) {
    Object.assign(claim, {
      status: "done",
      verdict: "error",
      confidence: "low",
      explanation: `Fact-check failed: ${err.message}`,
      sources: [],
    });
  }
  renderClaim(claim);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const VERDICT_LABELS = {
  true: "True",
  false: "False",
  misleading: "Misleading",
  needs_context: "Needs context",
  unverifiable: "Unverifiable",
  error: "Error",
};

function renderClaim(claim) {
  claimsEl.querySelector(".empty-note")?.remove();

  let card = document.getElementById(claim.id);
  const isNew = !card;
  if (isNew) {
    card = document.createElement("article");
    card.className = "claim-card";
    card.id = claim.id;
    claimsEl.prepend(card);
  }

  const checking = claim.status === "checking";
  card.dataset.verdict = checking ? "checking" : claim.verdict;

  card.innerHTML = "";
  const top = document.createElement("div");
  top.className = "claim-top";
  const text = document.createElement("p");
  text.className = "claim-text";
  text.textContent = `“${claim.text}”`;
  const badge = document.createElement("span");
  badge.className = `verdict-badge v-${checking ? "checking" : claim.verdict}`;
  badge.textContent = checking ? "checking" : VERDICT_LABELS[claim.verdict] || claim.verdict;
  top.append(text, badge);
  card.appendChild(top);

  const meta = document.createElement("div");
  meta.className = "claim-meta";
  const speakerSpan = document.createElement("span");
  speakerSpan.textContent = claim.speaker || "Unknown speaker";
  speakerSpan.style.color = speakerColor(claim.speaker || "Unknown speaker");
  meta.appendChild(speakerSpan);
  if (claim.category) meta.appendChild(Object.assign(document.createElement("span"), { textContent: claim.category }));
  if (!checking && claim.confidence) {
    meta.appendChild(Object.assign(document.createElement("span"), { textContent: `${claim.confidence} confidence` }));
  }
  card.appendChild(meta);

  if (!checking && claim.explanation) {
    const exp = document.createElement("p");
    exp.className = "claim-explanation";
    exp.textContent = claim.explanation;
    card.appendChild(exp);
  }

  if (!checking && claim.sources?.length) {
    const list = document.createElement("ul");
    list.className = "claim-sources";
    for (const s of claim.sources) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = s.title || s.url;
      li.appendChild(a);
      list.appendChild(li);
    }
    card.appendChild(list);
  }

  const done = [...state.claims.values()].filter((c) => c.status === "done").length;
  $("claim-count").textContent = `${done}/${state.claims.size} checked`;
}

function setStatus(mode) {
  state.mode = mode;
  statusPill.textContent = mode;
  statusPill.className = `pill ${mode === "live" ? "pill-live" : mode === "demo" ? "pill-demo" : "pill-idle"}`;
}

// ---------------------------------------------------------------------------
// Mic mode
// ---------------------------------------------------------------------------
micBtn.addEventListener("click", async () => {
  if (transcriber?.running) {
    transcriber.stop();
    transcriber = null;
    micBtn.textContent = "Start mic";
    micBtn.classList.remove("recording");
    setStatus("idle");
    return;
  }
  micBtn.disabled = true;
  try {
    transcriber = new LiveTranscriber({
      onUtterance: addUtterance,
      onPartial: showPartial,
      onStatus: (s) => s === "disconnected" && setStatus("idle"),
      onError: (e) => console.error(e),
    });
    await transcriber.start();
    micBtn.textContent = "Stop mic";
    micBtn.classList.add("recording");
    setStatus("live");
  } catch (err) {
    alert(`Could not start live transcription: ${err.message}\n\nTip: demo mode works without an AssemblyAI key.`);
    transcriber = null;
  } finally {
    micBtn.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Demo mode
// ---------------------------------------------------------------------------
const DEMO_TRANSCRIPT = `Moderator: Welcome to tonight's debate on economic policy. Opening statements, two minutes each.
Candidate A: Thank you. Under the current administration, inflation hit 9.1 percent in June 2022, the highest in over forty years. Families are hurting, and my opponent simply does not care about working people.
Candidate B: That's a distortion. Inflation was a global phenomenon driven by the pandemic and the war in Ukraine. And I'd remind everyone that the United States created over 13 million jobs in the last three years, more than any comparable period in history.
Candidate A: Jobs that were mostly just people returning to work after lockdowns. Meanwhile, the national debt has exploded past 34 trillion dollars. My plan cuts taxes for every family making under 400 thousand dollars a year.
Candidate B: Your plan was scored by independent analysts as adding 5 trillion dollars to the deficit over ten years. And you voted against the infrastructure bill that is fixing 65 thousand miles of roads across this country.
Candidate A: The infrastructure bill was loaded with waste. Besides, crime is the real issue — violent crime has doubled in our major cities since 2020.
Candidate B: That's simply false. FBI data shows violent crime declined in 2023, with murder down more than 10 percent, one of the largest drops on record.
Moderator: Let's move to healthcare. Candidate B, your administration promised to lower drug prices.
Candidate B: And we delivered. We capped insulin at 35 dollars a month for seniors on Medicare, and Medicare is now negotiating prices for the ten most expensive drugs for the first time in history.
Candidate A: Those negotiations affect a tiny fraction of drugs. Premiums for the average family have still gone up 22 percent since he took office.`;

demoBtn.addEventListener("click", () => {
  demoPanel.classList.toggle("hidden");
  if (!demoText.value) demoText.value = DEMO_TRANSCRIPT;
});

function parseDemoLines() {
  return demoText.value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      return m ? { speaker: m[1].trim(), text: m[2].trim() } : { speaker: "Speaker ?", text: line };
    });
}

function feedNextDemoLine() {
  if (demoIndex >= demoLines.length) {
    stopDemo();
    return false;
  }
  addUtterance(demoLines[demoIndex++]);
  return true;
}

function stopDemo() {
  clearInterval(demoTimer);
  demoTimer = null;
  $("demo-play-btn").textContent = "Play";
  if (state.mode === "demo") setStatus("idle");
}

$("demo-play-btn").addEventListener("click", () => {
  if (demoTimer) {
    stopDemo();
    return;
  }
  if (demoIndex === 0 || demoIndex >= demoLines.length) {
    demoLines = parseDemoLines();
    demoIndex = 0;
  }
  setStatus("demo");
  $("demo-play-btn").textContent = "Pause";
  feedNextDemoLine();
  demoTimer = setInterval(feedNextDemoLine, Number($("demo-interval").value));
});

$("demo-step-btn").addEventListener("click", () => {
  if (demoIndex === 0 || demoIndex >= demoLines.length) {
    demoLines = parseDemoLines();
    demoIndex = 0;
  }
  setStatus("demo");
  feedNextDemoLine();
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
resetBtn.addEventListener("click", () => {
  stopDemo();
  demoIndex = 0;
  clearTimeout(extractionTimer);
  state.utterances = [];
  state.claims.clear();
  state.extractedThrough = 0;
  state.checkQueue = [];
  transcriptEl.innerHTML = '<p class="empty-note">Start the mic or run the demo debate. Finalized speech appears here with speaker labels.</p>';
  transcriptEl.appendChild(partialEl);
  partialEl.classList.add("hidden");
  claimsEl.innerHTML = '<p class="empty-note">Checkable claims are pulled from the transcript automatically and researched with web search. Verdicts land here as they finish.</p>';
  $("utterance-count").textContent = "";
  $("claim-count").textContent = "";
});
