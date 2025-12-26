# Live AI Interview Agent Proposal (OpenAI Realtime API)

This document captures the proposed architecture, realtime configuration, interview behavior, key concerns, and a concise implementation plan.

## Architecture & stack
- **Frontend**: Keep **Next.js (web)** to reuse the existing app. For mobile, **React Native/Expo** is the most compatible with the current React stack (choose Flutter only if the team needs it).
- **Backend**: **Node.js/TypeScript** to match the existing stack and share types; Python is also viable with official SDKs.
- **Client ↔ backend ↔ Realtime API**:
  - **Recommended**: Client requests a short-lived **ephemeral token** from your backend, then connects **directly** to the OpenAI Realtime API using **WebRTC** (for audio) and the **data channel** (for events).
  - **Alternate**: Backend proxies a **WebSocket** to OpenAI for tighter logging/moderation control, at the cost of additional latency.
- **Auth & session handling**:
  - Keep API keys on the server only.
  - Use short-lived tokens (default TTL ~10 minutes) and configure session metadata (user_id, role, interview type).
  - Enforce a server-side session duration cap (Realtime sessions max at 60 minutes).

## Realtime setup
- **Model**: Use the current **Realtime model** (ex: `gpt-4o-realtime-preview` for audio).
- **Session config (baseline)**:
  - `modalities: ["audio","text"]` for full-duplex voice.
  - `input_audio_format: "pcm16"` at 24 kHz mono for low latency.
  - `turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 200 }` or `null` for push-to-talk.
  - `temperature: 0.3–0.6` (lower for consistent interview structure).
  - Set **system prompt** via `session.update` before first response.
  - Pick **voice** before first audio output (cannot change after).
- **Low latency speech**:
  - Stream audio in/out; display partial transcripts while speaking.
  - Support barge-in by stopping local playback when user starts speaking.

## Interview behavior (prompt + tools)
- **System prompt structure**:
  1) Role & level (ex: “Salesforce Admin, 2–4 yrs”).
  2) Interview format (one question at a time, wait for answer).
  3) Rubric (clarity, relevance, depth, accuracy).
  4) Output style (brief, actionable feedback in <60 seconds).
  5) Safety: avoid long monologues; ask follow-up only if missing critical detail.
- **Tools/functions**:
  - `fetch_next_question(role, difficulty, topic)`
  - `store_answer(user_id, question_id, transcript, score, tags)`
  - `store_feedback(user_id, question_id, bullets)`
- **Latency-friendly feedback**:
  - Return short feedback immediately; store extended rubric results asynchronously.

## Key concerns
- **Latency UX**: streaming output, partial transcript UI, barge-in support.
- **Security**: API keys only on server; issue ephemeral tokens to clients.
- **Logging**: store transcripts and scores server-side (Supabase ok); add user opt-in and retention policy.
- **Cost controls**:
  - Session duration limits and max response tokens.
  - Use cheaper text-only models for non-realtime steps.
  - Keep audio responses short to reduce audio token cost.

## 4-phase implementation plan
### Phase 1 — Foundations & token minting
- Confirm scope + UX: voice + text? web only or mobile too? push-to-talk vs open mic? session length & roles.
- Repo review & integration points: map `app/`, `components/`, `lib/`, `supabase/` to place realtime client, auth hooks, transcript storage.
- Backend token minting: add a secure API route to create short-lived Realtime tokens.
- Define session metadata shape (user_id, role, interview type) and add env var docs.

### Phase 2 — Web Realtime client (voice + text)
- Implement WebRTC connection + data channel.
- Audio capture/playback, streaming transcript UI.
- Basic turn-taking + barge-in behavior.
- Minimal “talk to interviewer” page.

### Phase 3 — Interview logic & persistence
- System prompt + tool schema.
- Tool wiring to Supabase: `fetch_next_question`, `store_answer`, `store_feedback`.
- Save transcripts/scores; history/admin view.

### Phase 4 — Hardening & cost controls
- Session/time/token limits, per-user rate limiting.
- Logging/retention settings and opt-in.
- Text-only fallback; model cost tuning.
- Manual QA + lint/test pass.

## Phase 1 implementation (completed)
- Added authenticated token minting endpoint: `app/api/realtime/session/route.ts`.
- Added Live Agent session types: `lib/types.ts`.
- Added OpenAI Realtime env vars: `.env.local.example`.
- Documented Live Agent endpoint and env vars: `README.md`.

## Phase 2 implementation (completed)
- Added WebRTC + data channel client with streaming transcript UI and barge-in handling: `app/live-agent/page.tsx`.

## Phase 3 implementation (completed)
- Added Live Agent storage endpoints for sessions, messages, feedback, and question fetching:
  - `app/api/live-agent/session/route.ts`
  - `app/api/live-agent/message/route.ts`
  - `app/api/live-agent/feedback/route.ts`
  - `app/api/live-agent/question/route.ts`
- Wired tool schema + system prompt and persistence hooks into the live agent UI: `app/live-agent/page.tsx`.
