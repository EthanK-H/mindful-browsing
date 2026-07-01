# Live Debate Fact Checker

Streams a debate (microphone or pasted transcript) through a four-stage pipeline:

```
audio ──► diarized transcript ──► claim extraction ──► web-grounded fact-check ──► verdict feed
        (AssemblyAI streaming)   (Claude Haiku 4.5)     (Claude Sonnet 5 +          (color-coded
                                                          web search tool)            claim cards)
```

- **Transcription** — the browser mints a short-lived AssemblyAI streaming token from the backend (the real key never reaches the client) and forwards 16kHz PCM over the Universal-Streaming WebSocket. Speaker labels are read from the stream when available.
- **Claim extraction** — every time speech finalizes (debounced ~2.5s), the recent transcript window goes to Claude Haiku 4.5 with a strict JSON schema: extract discrete checkable claims, resolve pronouns, skip opinion/rhetoric/predictions, and dedupe against claims already found.
- **Fact-checking** — each claim is queued (2 concurrent) to Claude Sonnet 5 with the web search tool. Verdicts are `true / false / misleading / needs_context / unverifiable` with confidence, a short explanation, and cited sources.
- **UI** — live transcript with per-speaker colors on the left, verdict cards on the right.

## Setup

```bash
cd debate-fact-checker
npm install
cp .env.example .env   # then fill in your keys
npm start              # http://localhost:3000
```

`.env`:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Claim extraction + fact-checking |
| `ASSEMBLYAI_API_KEY` | no | Live microphone mode. Without it, **demo mode** still works fully. |
| `PORT` | no | Defaults to 3000 |

## Try it without a microphone

Click **Demo debate** → **Play**. A bundled sample debate (with deliberately checkable claims — some true, some false, some misleading) is fed in line-by-line, and the whole extraction → fact-check pipeline runs for real against the Claude API. You can paste any transcript in `Name: what they said` format.

## Notes & known limitations

- Real-time speaker diarization accuracy varies by provider/plan; when the stream doesn't carry speaker labels, turns are labeled `Speaker ?`. Batch (post-hoc) diarization is more accurate if you don't need live labels.
- Fact-checks take 10–60s each by design (real web research). Cards show `checking…` until the verdict lands.
- Fixed time windows would cut claims in half, so extraction is triggered by finalized utterances with a short debounce instead.
