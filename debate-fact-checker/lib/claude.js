import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Fast, cheap model for the high-frequency extraction pass; strongest model
// with web search for the (less frequent, higher-stakes) fact-check pass.
// Override either via .env; the defaults are used when the var is unset.
export const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL || "claude-haiku-4-5";
export const FACTCHECK_MODEL = process.env.FACTCHECK_MODEL || "claude-opus-4-8";

const VERDICTS = ["true", "false", "misleading", "needs_context", "unverifiable"];

// ---------------------------------------------------------------------------
// Claim extraction
// ---------------------------------------------------------------------------

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
              "The claim, rewritten as a single self-contained sentence. Resolve pronouns and vague references using the transcript context.",
          },
          speaker: {
            type: "string",
            description: "The speaker label who made the claim, exactly as it appears in the transcript.",
          },
          category: {
            type: "string",
            enum: ["statistical", "historical", "attribution", "scientific", "policy", "other"],
          },
          checkworthiness: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "How valuable and feasible it is to fact-check this claim.",
          },
        },
        required: ["text", "speaker", "category", "checkworthiness"],
        additionalProperties: false,
      },
    },
  },
  required: ["claims"],
  additionalProperties: false,
};

const EXTRACTION_SYSTEM = `You extract discrete, checkable factual claims from live debate transcripts.

Rules:
- Extract only claims that are verifiable against external evidence: statistics and numbers, historical events, quotes or positions attributed to people or organizations, scientific assertions, and concrete descriptions of laws or policies.
- Skip opinions, values, predictions about the future, rhetorical questions, insults, applause lines, and vague generalities ("my opponent doesn't care about families").
- Rewrite each claim as one self-contained sentence a fact-checker could research in isolation: resolve pronouns, fill in who/what/when from the surrounding transcript.
- Do NOT re-extract claims that are semantically the same as any claim in the "already extracted" list, even if worded differently. Debaters repeat themselves constantly.
- Prefer precision over volume. If a turn contains no checkable claims, return an empty list.`;

export async function extractClaims(transcript, knownClaims = []) {
  const knownBlock = knownClaims.length
    ? `Already extracted (do NOT repeat these or paraphrases of them):\n${knownClaims.map((c) => `- ${c}`).join("\n")}`
    : "No claims have been extracted yet.";

  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 2000,
    system: EXTRACTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: `${knownBlock}\n\nTranscript window (most recent speech last):\n"""\n${transcript}\n"""\n\nExtract the new checkable claims.`,
      },
    ],
    output_config: { format: { type: "json_schema", schema: CLAIMS_SCHEMA } },
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? '{"claims":[]}';
  const parsed = JSON.parse(text);
  return Array.isArray(parsed.claims) ? parsed.claims : [];
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

export async function checkClaim({ claim, speaker, context }) {
  const parts = [`Claim to fact-check: "${claim}"`];
  if (speaker) parts.push(`Said by: ${speaker}`);
  if (context) parts.push(`Debate context (for interpretation only, not evidence):\n${context}`);

  const messages = [{ role: "user", content: parts.join("\n\n") }];
  let response;

  // Server-side tool loops can return pause_turn at the iteration limit;
  // re-send to let the server resume where it left off.
  for (let attempt = 0; attempt < 5; attempt++) {
    const stream = client.messages.stream({
      model: FACTCHECK_MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: FACTCHECK_SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
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
