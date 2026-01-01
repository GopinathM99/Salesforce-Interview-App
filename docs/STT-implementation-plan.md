# Speech-to-Text Implementation Plan

## Status: COMPLETED

## Overview
Add speech-to-text (STT) functionality to the live-agent chat page with two provider options: **Deepgram Nova-3** (default) and **AssemblyAI Universal-2**.

**Approach**: Batch transcription - user records audio, stops, then audio is transcribed and text appears in textarea for review/editing before sending.

**Implementation Strategy**: 2 phases, one for each provider.

---

# Phase 1: Deepgram Nova-3 - COMPLETED

Complete end-to-end implementation with Deepgram as the first provider.

## Phase 1 - Files to Create

| File | Purpose |
|------|---------|
| `/app/api/stt/deepgram/route.ts` | Deepgram Nova-3 transcription endpoint |
| `/lib/hooks/useAudioRecorder.ts` | MediaRecorder API wrapper for recording audio |
| `/lib/hooks/useSpeechToText.ts` | STT API calls (initially Deepgram only) |
| `/components/VoiceRecordButton.tsx` | Mic button with recording UI |

## Phase 1 - Files to Modify

| File | Changes |
|------|---------|
| `/lib/types.ts` | Add STT type definitions |
| `/.env.local.example` | Add `DEEPGRAM_API_KEY=` |
| `/app/live-agent/chat/page.tsx` | Add mic button to input area (lines 988-1011) |

## Phase 1 - Implementation Steps

### Step 1.1: Environment Setup
- Add `DEEPGRAM_API_KEY` to `.env.local.example`
- Add actual key to `.env.local`

### Step 1.2: Type Definitions (`/lib/types.ts`)
```typescript
export type STTProvider = 'deepgram' | 'assemblyai';
export interface STTTranscriptResponse {
  transcript: string;
  confidence: number;
}
```

### Step 1.3: Deepgram API Route (`/app/api/stt/deepgram/route.ts`)
- Bearer token auth with Supabase validation
- `export const runtime = "nodejs"`
- Accept FormData with audio file (WebM/Opus)
- Call Deepgram API:
  ```
  POST https://api.deepgram.com/v1/listen
  Headers: Authorization: Token ${DEEPGRAM_API_KEY}
  Query: model=nova-3&language=en&smart_format=true&punctuate=true
  Body: Raw audio binary
  ```
- Return `{ transcript: string, confidence: number }`

### Step 1.4: Audio Recorder Hook (`/lib/hooks/useAudioRecorder.ts`)
```typescript
interface UseAudioRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  cancelRecording: () => void;
  audioLevel: number;  // 0-1 for visual feedback
  duration: number;    // seconds
  error: string | null;
}
```
- Format: `audio/webm;codecs=opus`
- Max duration: 60 seconds
- Audio constraints: echoCancellation, noiseSuppression, autoGainControl

### Step 1.5: STT Hook (`/lib/hooks/useSpeechToText.ts`)
```typescript
interface UseSpeechToTextReturn {
  transcribe: (audioBlob: Blob) => Promise<string>;
  isTranscribing: boolean;
  error: string | null;
  provider: STTProvider;
  setProvider: (provider: STTProvider) => void;
}
```
- Initially only supports Deepgram
- Store provider preference in localStorage

### Step 1.6: Voice Record Button (`/components/VoiceRecordButton.tsx`)
States:
1. **Idle**: Show mic icon
2. **Recording**: Pulsing red indicator, duration counter, stop button
3. **Transcribing**: Loading spinner
4. **Error**: Error message with retry option

### Step 1.7: Chat Page Integration (`/app/live-agent/chat/page.tsx`)
**Location**: Lines 988-1011

Changes:
- Import `VoiceRecordButton` component
- Add mic button between textarea and send button
- Handle transcript callback to append to `inputValue`

**New layout**:
```
[Textarea                    ] [🎤] [Send]
```

## Phase 1 - Deliverables
- Working Deepgram STT integration
- Mic button in chat UI
- Audio recording and transcription flow complete
- Error handling for mic permissions, API errors

---

# Phase 2: AssemblyAI Universal-2 - COMPLETED

Add AssemblyAI as second provider with provider selection UI.

## Phase 2 - Files to Create

| File | Purpose |
|------|---------|
| `/app/api/stt/assemblyai/route.ts` | AssemblyAI Universal-2 transcription endpoint |

## Phase 2 - Files to Modify

| File | Changes |
|------|---------|
| `/.env.local.example` | Add `ASSEMBLYAI_API_KEY=` |
| `/lib/hooks/useSpeechToText.ts` | Add AssemblyAI support |
| `/components/VoiceRecordButton.tsx` | Add provider selector dropdown |
| `/app/live-agent/chat/page.tsx` | Add provider selector UI inline with input |

## Phase 2 - Implementation Steps

### Step 2.1: Environment Setup
- Add `ASSEMBLYAI_API_KEY` to `.env.local.example`
- Add actual key to `.env.local`

### Step 2.2: AssemblyAI API Route (`/app/api/stt/assemblyai/route.ts`)
- Bearer token auth with Supabase validation
- `export const runtime = "nodejs"`
- Two-step process:
  ```
  1. POST https://api.assemblyai.com/v2/upload (upload audio)
  2. POST https://api.assemblyai.com/v2/transcript (start transcription)
  3. GET https://api.assemblyai.com/v2/transcript/{id} (poll for result)
  ```
- Use polling with exponential backoff (max 30 seconds)
- Return `{ transcript: string, confidence: number }`

### Step 2.3: Update STT Hook (`/lib/hooks/useSpeechToText.ts`)
- Add AssemblyAI endpoint support
- Route to correct API based on `provider` state

### Step 2.4: Add Provider Selector UI
Update `VoiceRecordButton.tsx` and chat page to include:
```
[Provider: Deepgram Nova-3 ▼]
[Textarea                    ] [🎤] [Send]
```

Options:
- Deepgram Nova-3 (default)
- AssemblyAI Universal-2

### Step 2.5: Provider Persistence
- Store in `localStorage` key: `stt_provider`
- Default: `deepgram`
- Load preference on mount

## Phase 2 - Deliverables
- Working AssemblyAI STT integration
- Provider selector dropdown
- Seamless switching between providers
- Preference persistence

---

## Error Handling (Both Phases)

| Error | Handling |
|-------|----------|
| Mic permission denied | Show instructions to enable |
| Browser not supported | Suggest Chrome/Firefox |
| No audio detected | Prompt to speak louder |
| API rate limit | Show retry timer |
| Transcription failed | Show error, suggest trying other provider (Phase 2) |

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `/app/live-agent/chat/page.tsx` | Main chat page to modify (lines 988-1011) |
| `/app/api/gemini/route.ts` | Pattern to follow for API routes |
| `/lib/types.ts` | Add new type definitions |
| `/styles/globals.css` | Reference for button styling |

---

# Implementation Summary

**Completed:** December 30, 2025

## Files Created

| File | Description |
|------|-------------|
| `/app/api/stt/deepgram/route.ts` | Deepgram Nova-3 API endpoint with auth |
| `/app/api/stt/assemblyai/route.ts` | AssemblyAI Universal-2 API endpoint with polling |
| `/lib/hooks/useAudioRecorder.ts` | MediaRecorder hook with audio level visualization |
| `/lib/hooks/useSpeechToText.ts` | STT hook with provider switching |
| `/components/VoiceRecordButton.tsx` | Mic button with recording UI and provider selector |

## Files Modified

| File | Changes |
|------|---------|
| `/lib/types.ts` | Added `STTProvider` type and `STTTranscriptResponse` interface |
| `/.env.local.example` | Added `DEEPGRAM_API_KEY=` and `ASSEMBLYAI_API_KEY=` |
| `/app/live-agent/chat/page.tsx` | Integrated VoiceRecordButton with provider selector |

## Features Implemented

- **Recording**: Mic button with pulsing red animation during recording
- **Audio Visualization**: 5-bar audio level indicator
- **Duration**: Counter with auto-stop at 60 seconds max
- **Cancel**: Button to cancel recording mid-stream
- **Provider Selection**: Dropdown to switch between Deepgram and AssemblyAI
- **Persistence**: Provider preference saved to localStorage (`stt_provider` key)
- **Error Handling**: User-friendly messages for permissions, API errors, no audio detected
- **Transcription**: Text appends to textarea for review before sending

## UI Layout

```
[STT: Deepgram Nova-3 ▼]
[Textarea                              ] [🎤] [Send]
                                         ↑
                                    Recording states:
                                    - Idle: Mic icon
                                    - Recording: Stop icon + duration + audio bars
                                    - Transcribing: Spinner
```

---

# Testing Checklist

## Environment Setup
- [ ] Add `DEEPGRAM_API_KEY` to `.env.local` (get from https://console.deepgram.com)
- [ ] Add `ASSEMBLYAI_API_KEY` to `.env.local` (get from https://www.assemblyai.com/dashboard)
- [ ] Restart dev server after adding keys

## Functional Tests
- [ ] Navigate to `/live-agent/chat`
- [ ] Start an interview session
- [ ] Click mic button - should request microphone permission
- [ ] Allow permission - should start recording (red pulsing button)
- [ ] Speak into microphone - audio bars should respond
- [ ] Click stop - should show "Transcribing..." spinner
- [ ] Transcribed text should appear in textarea
- [ ] Text should be editable before sending
- [ ] Multiple recordings should append to existing text

## Provider Switching
- [ ] Change provider dropdown to AssemblyAI
- [ ] Record and transcribe - should use AssemblyAI
- [ ] Refresh page - provider selection should persist
- [ ] Change back to Deepgram - should work

## Error Handling
- [ ] Deny microphone permission - should show helpful error
- [ ] Record silence - should show "No speech detected" error
- [ ] Test with invalid API key - should show API error

## Browser Compatibility
- [ ] Chrome (recommended)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

# API Keys

## Deepgram
- Sign up: https://console.deepgram.com
- Create API key with "Member" permissions
- Model used: `nova-3` (latest, most accurate)

## AssemblyAI
- Sign up: https://www.assemblyai.com/dashboard
- API key available on dashboard
- Model used: `universal` (speech_model parameter)

---

# Troubleshooting

| Issue | Solution |
|-------|----------|
| "Voice recording not supported" | Use Chrome/Firefox/Edge. Safari has limited support. |
| "Microphone access denied" | Check browser settings, allow microphone for localhost |
| "No speech detected" | Speak louder, check microphone is working |
| "Missing environment variables" | Ensure API keys are in `.env.local` and server restarted |
| "Unauthorized" error | User must be logged in to use STT |
| AssemblyAI timeout | Recording may be too long. Try shorter recordings. |

---

# Future Enhancements (Optional)

- [ ] Real-time streaming transcription (show text as user speaks)
- [ ] Language selection (currently English only)
- [ ] Audio playback before sending
- [ ] Keyboard shortcut to start/stop recording
- [ ] Usage tracking/logging to Supabase

---

# Quick Start for Next Session

## 1. Add API Keys to `.env.local`

```bash
# Add these lines to your .env.local file
DEEPGRAM_API_KEY=your_deepgram_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
```

**Get your keys:**
- Deepgram: https://console.deepgram.com → Create API Key
- AssemblyAI: https://www.assemblyai.com/dashboard → Copy API Key

## 2. Restart Dev Server

```bash
npm run dev
```

## 3. Test the Feature

1. Open http://localhost:3000/live-agent/chat
2. Log in (required for STT)
3. Start an interview session (select role, type, level, topics)
4. Look for the **mic button** next to the Send button
5. Select STT provider from dropdown (Deepgram Nova-3 or AssemblyAI Universal-2)
6. Click mic → Speak → Click stop → Review transcript → Send

## 4. Expected Behavior

| Action | Result |
|--------|--------|
| Click mic (idle) | Red pulsing button, audio bars appear |
| Speak | Audio level bars respond |
| Click stop | "Transcribing..." spinner |
| Complete | Text appears in textarea |
| Click send | Message sent to AI interviewer |

## 5. If Something Goes Wrong

| Problem | Fix |
|---------|-----|
| Mic button not showing | Make sure interview session is active |
| "Unauthorized" error | Log in first |
| "Missing environment variables" | Add API keys to `.env.local`, restart server |
| No transcription | Check browser console for errors, verify API key is valid |
