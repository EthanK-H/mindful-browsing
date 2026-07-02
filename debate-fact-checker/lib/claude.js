import Anthropic from "@anthropic-ai/sdk";

// Extra retries smooth over flaky home-network connections (default is 2).
const client = new Anthropic({ maxRetries: 4 });

// Fast, cheap model for the high-frequency extraction pass; strongest model
// with web search for the (less frequent, higher-stakes) fact-check pass.
// Defaults come from .env (or the fallbacks below); the UI can override
// per-request from the models listed in MODEL_OPTIONS.
export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL || "claude-haiku-4-5";
export const FACTCHECK_MODEL = process.env.FACTCHECK_MODEL || "claude-sonnet-5";

export const MODEL_OPTIONS = [
  { id: "claude-haiku-4-5", label: "Haiku 4.5 · fastest" },
  { id: "claude-sonnet-5", label: "Sonnet 5 · balanced" },
  { id: "claude-opus-4-8", label: "Opus 4.8 · most capable" },
];

// Newer models take the dynamic-filtering web search tool and adaptive
// thinking; older tiers (Haiku 4.5) need the basic search variant and no
// adaptive-thinking param.
const MODERN_MODEL = /^claude-(opus-4-[678]|sonnet-5|sonnet-4-6)/;

const VERDICTS = ["true", "false", "misleading", "needs_context", "unverifiable"];

// ---------------------------------------------------------------------------
// Claim selection — run once over the WHOLE transcript on demand. Because the
// model sees the full debate, it can judge which claims are load-bearing (the
// debate actually turns on them) rather than surfacing every stray statistic.
// ---------------------------------------------------------------------------

const MAX_CLAIMS = 8;

const CLAIMS_SCHEMA = {
  type: "object",
  properties: {
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "The claim, rewritten as a single self-contained sentence. Resolve pronouns and vague references using the full transcript.",
          },
          speaker: {
            type: "string",
            description: "The speaker label who made the claim, exactly as it appears in the transcript.",
          },
          category: {
            type: "string",
            enum: ["statistical", "historical", "attribution", "scientific", "policy", "other"],
          },
          significance: {
            type: "string",
            enum: ["high", "medium"],
            description: "How load-bearing the claim is to the debate's central disagreements.",
          },
          why: {
            type: "string",
            description: "One short phrase: why this claim matters to the debate (what argument rests on it).",
          },
        },
        required: ["text", "speaker", "category", "significance", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["claims"],
  additionalProperties: false,
};

const SELECTION_SYSTEM = `You are the editorial lead for a live debate fact-checking desk. You are handed the FULL debate transcript and must select ONLY the claims worth checking on air.

Select a claim when it is BOTH:
1. LOAD-BEARING — it is central to a point of disagreement, a speaker builds an argument on it, it is repeated or emphasized, or knowing whether it is true would change how a viewer judges the exchange.
2. CHECKABLE — verifiable against external evidence: a specific statistic or number, a historical fact, a position/quote attributed to a person or organization, a scientific assertion, or a concrete description of a law or policy.

Deliberately SKIP:
- Throwaway or hyper-specific details no argument rests on.
- Opinions, values, predictions about the future, rhetoric, insults, applause lines.
- Vague generalities and anything too subjective to research ("my opponent doesn't care about families").

Because you can see the ENTIRE debate, judge importance in context. Prefer the handful of claims the debate genuinely turns on over an exhaustive list. Select at most ${MAX_CLAIMS} claims — fewer for a short debate. Order them most-significant first. Rewrite each as one self-contained sentence a fact-checker could research in isolation. Never select a claim that is semantically the same as one in the "already checked" list.`;

export async function selectClaims(transcript, knownClaims = [], model = EXTRACTION_MODEL) {
  const knownBlock = knownClaims.length
    ? `Already checked (do NOT reselect these or paraphrases):\n${knownClaims.map((c) => `- ${c}`).join("\n")}`
    : "Nothing has been checked yet.";

  const response = await client.messages.create({
    model,
    max_tokens: 3000,
    system: SELECTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${knownBlock}\n\nFull debate transcript:\n"""\n${transcript}\n"""\n\nSelect the load-bearing, checkable claims worth fact-checking.`,
      },
    ],
    output_config: { format: { type: "json_schema", schema: CLAIMS_SCHEMA } },
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? '{"claims":[]}';
  const parsed = JSON.parse(text);
  return Array.isArray(parsed.claims) ? parsed.claims.slice(0, MAX_CLAIMS) : [];
}

// ---------------------------------------------------------------------------
// Fact-checking with web search
// ---------------------------------------------------------------------------

const FACTCHECK_SYSTEM = `You are a rigorous, strictly neutral fact-checker working a live debate. You verify one claim at a time using web search.

Process:
- Search for primary and authoritative sources (official statistics, government records, reputable news, original transcripts). Prefer recent sources for time-sensitive claims.
- Check the strongest version of the claim AND whether it is framed misleadingly (true number, wrong implication; cherry-picked timeframe; missing denominator).
- Numbers rarely match exactly — judge whether the claimed figure is materially accurate, not whether it matches to the decimal.

Verdicts:
- "true": accurate as stated, in material respects.
- "false": contradicted by reliable evidence.
- "misleading": contains accurate elements but creates a false impression.
- "needs_context": can't be judged true/false without important missing context; supply that context.
- "unverifiable": no reliable evidence available either way.

After researching, end your reply with ONLY a JSON object (no markdown fence, no trailing prose) shaped exactly like:
{"verdict": "true|false|misleading|needs_context|unverifiable", "confidence": "high|medium|low", "explanation": "<2-3 sentence plain-language explanation citing the key evidence>"}`;

export async function checkClaim({ claim, speaker, context, model = FACTCHECK_MODEL }) {
  const parts = [`Claim to fact-check: "${claim}"`];
  if (speaker) parts.push(`Said by: ${speaker}`);
  if (context) parts.push(`Debate context (for interpretation only, not evidence):\n${context}`);

  const modern = MODERN_MODEL.test(model);
  const searchTool = {
    type: modern ? "web_search_20260209" : "web_search_20250305",
    name: "web_search",
    max_uses: 5,
  };

  const messages = [{ role: "user", content: parts.join("\n\n") }];
  let response;

  // Server-side tool loops can return pause_turn at the iteration limit;
  // re-send to let the server resume where it left off.
  for (let attempt = 0; attempt < 5; attempt++) {
    const stream = client.messages.stream({
      model,
      max_tokens: 16000,
      ...(modern ? { thinking: { type: "adaptive" } } : {}),
      system: FACTCHECK_SYSTEM,
      tools: [searchTool],
      messages,
    });
    response = await stream.finalMessage();
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (response.stop_reason === "refusal") {
    return {
      verdict: "unverifiable",
      confidence: "low",
      explanation: "The fact-checking model declined to research this claim.",
      sources: [],
    };
  }

  return parseVerdict(response);
}

function parseVerdict(response) {
  const textBlocks = response.content.filter((b) => b.type === "text");
  const finalText = textBlocks.map((b) => b.text).join("\n").trim();

  // Sources: prefer URLs the model actually cited; fall back to raw search results.
  const cited = new Map();
  for (const block of textBlocks) {
    for (const c of block.citations ?? []) {
      if (c.url) cited.set(c.url, { url: c.url, title: c.title || c.url });
    }
  }
  const searched = new Map();
  for (const block of response.content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const r of block.content) {
        if (r.type === "web_search_result" && r.url) {
          searched.set(r.url, { url: r.url, title: r.title || r.url });
        }
      }
    }
  }
  const sources = [...(cited.size ? cited : searched).values()].slice(0, 5);

  // The verdict JSON is the last {...} object in the final text.
  const match = finalText.match(/\{[\s\S]*\}(?=[^{}]*$)/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (VERDICTS.includes(parsed.verdict)) {
        return {
          verdict: parsed.verdict,
          confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium",
          explanation: String(parsed.explanation || "").trim() || finalText.replace(match[0], "").trim(),
          sources,
        };
      }
    } catch {
      // fall through to the lenient fallback below
    }
  }

  return {
    verdict: "unverifiable",
    confidence: "low",
    explanation: finalText.slice(0, 600) || "The model returned no readable verdict.",
    sources,
  };
}
