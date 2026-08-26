# @elevenlabs/types

## 0.22.1

### Patch Changes

- f94ef6d: Add `fileIds` to `sendMultimodalMessage` and dual-send `file` + `files` on the wire.

## 0.22.0

### Minor Changes

- b60d460: Draw rich content alongside the first message, and echo button taps back to the
  server.

  A `first_message_rich_content` entry on the widget config is painted with the
  first message before any connection exists, so a text-only widget shows its
  buttons on a cold start. Tapping one starts the conversation with that button's
  message, the same way typing into the input does — previously a button was
  disabled until connected, which left a first-message button waiting for the
  session it would itself begin.

  A row the customer has already answered is retired rather than left sitting in
  the transcript. Whether a component does this is per-component, so display
  components can later stay and merely de-emphasise instead of disappearing.

  `sendUserMessage` accepts an optional attribution (`richContentId`) that rides
  the `user_message` event as `rich_content_id`; the widget sends it automatically
  when a button is tapped, on both the mid-conversation and conversation-starting
  paths. It names the row the button belonged to rather than the button itself —
  given the row, the message text says which button was pressed. Purely additive:
  servers that predate the field ignore it, and the message text alone remains
  what the agent acts on.

- be9cb0c: Add support for the `external_agent_disconnected` client event. The client SDK exposes a new `onExternalAgentDisconnected` callback, and the widget leaves external-agent mode (and clears the typing indicator) when the external human agent disconnects and the AI agent resumes control.

## 0.21.1

### Patch Changes

- eea19d2: Add support for the `context_usage` server event via a new `onContextUsage` callback. The event is emitted after each completed agent turn and reports `{ event_id, model, context_tokens, context_limit_tokens }`, where `context_tokens` is the prompt size of the turn's last LLM generation and `context_limit_tokens` is that model's maximum context window — useful for surfacing how close a long conversation is to the context limit.

## 0.21.0

### Minor Changes

- 880edd2: Expose missing realtime speech-to-text options on `Scribe.connect()`, matching [elevenlabs-js#436](https://github.com/elevenlabs/elevenlabs-js/pull/436):
  - `secondaryLanguages`: additional language codes that may be present in the audio, sent as repeated `secondary_languages` query params.
  - `entityDetection`: detect entities (PII, PHI, PCI, offensive language, or specific types) on committed transcripts. Accepts a single value or a list.
  - `filterBackgroundAudio`: enable background speech filtering to reduce false activations from nearby conversations and ambient noise.

  New server messages are now dispatched instead of being dropped:
  - `final_transcript` and `final_transcript_with_timestamps` (`RealtimeEvents.FINAL_TRANSCRIPT` / `FINAL_TRANSCRIPT_WITH_TIMESTAMPS`)
  - `committed_transcript_entities`, carrying `DetectedEntity[]` (`RealtimeEvents.COMMITTED_TRANSCRIPT_ENTITIES`)
  - `invalid_request`, sent when the server rejects the connection parameters (`RealtimeEvents.INVALID_REQUEST`), emitted alongside the generic `ERROR` event

  Also fixes `vadSilenceThresholdSecs`, `minSpeechDurationMs`, and `minSilenceDurationMs` lower-bound validation to treat the bound as inclusive, matching the API (e.g. `vadSilenceThresholdSecs: 0.3` is now accepted instead of being rejected client-side).

  The `scribe.asyncapi.yaml` schema (and the generated `Word`/`CommittedTranscriptWithTimestampsMessage`/`FinalTranscriptWithTimestampsMessage` types) was cross-checked against the live contract at `https://api.elevenlabs.io/speech-to-text-asyncapi.yml`. The `words[]` shape is identical between `committed_transcript_with_timestamps` and `final_transcript_with_timestamps` on that contract (both support `"audio_event"`, per-character timings, and `channel_index`), so both messages now share a single `Word` type instead of the narrower shape `committed_transcript_with_timestamps` previously used. `Config` also gained `timestamps_granularity` and `max_tokens_to_recompute` to match the session config the server echoes back.

  `@elevenlabs/react`'s `useScribe().committedTranscripts[].words` (`WordTimestamp`) is updated to match: `type` now includes `"audio_event"`, `characters` is now `WordTimestampCharacter[]` (each with its own `start`/`end`) instead of `string[]`, and a `channel_index` field was added.

## 0.20.0

### Minor Changes

- 93cf08c: Add the experimental `rich_content` event types and an `onRichContent` callback,
  called when the agent sends a component for the client to display, such as an
  item card. The callback receives `{ rich_content_id, component, props, event_id }`
  and nothing is sent back, so the agent's turn does not wait on the client.

  This backs the embedded widget, which is the only client the server offers
  components to today, so the callback does not fire for other consumers. Treat
  `props` as agent-authored and untrusted when rendering it into a document.

## 0.19.0

### Minor Changes

- a96f220: Rename `disable_logging` to `enable_logging` in the Scribe `session_started` config to match the field the server actually reports. `disable_logging` was never sent on the wire.

## 0.18.0

### Minor Changes

- 139ed79: Add `onAgentReasoningResponsePart` callback to receive streaming reasoning response
  events from the agent. The callback receives `{ text, type, event_id }` where type
  is one of "start", "delta", or "stop".

## 0.17.1

### Patch Changes

- f149d9d: Add a dedicated `onPing` callback that surfaces `ping` events (including the estimated `ping_ms`) to consumers. The SDK still replies to pings with a `pong` automatically; the callback is informational, useful for e.g. reporting connection latency. Also clarifies the documentation for `ping_ms`: "Estimated ping in milliseconds, based on previous ping/pong timing."

## 0.17.0

### Minor Changes

- d52d5f6: Allow null values for PingEvent

## 0.16.0

### Minor Changes

- 2277139: Allow `sendFeedback` to clear feedback by passing `null`. `sendFeedback(like, eventId?)` now accepts `null` as the first parameter; when passed it sends `score: null` to clear the feedback on that event, allowing users to remove their like/dislike rating.

## 0.15.0

### Minor Changes

- c086dad: Add `overrides.asr.keywords` support to the browser client so per-conversation ASR keyword biasing can be sent via `conversation_initiation_client_data`.

## 0.14.1

### Patch Changes

- 2cc82d2: Add `"license": "MIT"` field to package.json so license-checker tools no longer see an undefined license (#838).

## 0.14.0

### Minor Changes

- fa64593: Remove manually maintained types (`Role`, `Mode`, `Status`, `Callbacks`, `CALLBACK_KEYS`, `DisconnectionDetails`, `MessagePayload`, `AudioAlignmentEvent`) from `@elevenlabs/types`. These types now live in `@elevenlabs/client` — import them from there instead. The types package now contains only generated code.

## 0.13.0

### Minor Changes

- 1216ded: Add full tool result payload support to `onAgentToolResponse`.

  The `onAgentToolResponse` callback now also receives `agent_tool_response_full_payload` server events, delivering the raw `full_tool_result` string (capped at 64 KB) alongside the existing summary events. Consumers can distinguish between the two by checking for the presence of `full_tool_result` on the payload. To receive full payloads, enable the `agent_tool_response_full_payload` client event in the agent's configuration UI.

  ```tsx
  <ConversationProvider
    agentId="…"
    onAgentToolResponse={payload => {
      if ("full_tool_result" in payload) {
        if (payload.truncated) {
          console.warn("full payload truncated to 64 KB");
        }
        console.log(payload.tool_name, payload.full_tool_result);
      } else {
        console.log(payload.tool_call_id, payload.is_error);
      }
    }}
  >
    …
  </ConversationProvider>
  ```

  The same callback is available on `useConversation`, `startSession`, and the lower-level `Conversation.startSession` in `@elevenlabs/client`.

## 0.12.0

### Minor Changes

- 3b40bda: Add an `onAgentResponseCorrection` callback for agent response correction events.

## 0.11.0

### Minor Changes

- 8c6213f: Add optional `contextId` to `sendContextualUpdate` for deduplicating contextual updates

### Patch Changes

- 1153428: Add `llm` to the typed agent prompt override for conversation sessions.

## 0.10.0

### Minor Changes

- a8c2d5d: Add `keyterms` option (`string[]`) to the Scribe realtime API. Biases the model towards specific terms (max 50 keyterms, each up to 20 chars), passed as repeated query params on the WebSocket URL.
- a8c2d5d: Add `noVerbatim` option (`boolean`) to the Scribe realtime API. When enabled, removes filler words, false starts, and disfluencies from transcripts.

## 0.9.1

### Patch Changes

- 50ea6ef: fix: use explicit .js extensions in ESM imports for Node.js compatibility

  Switch `moduleResolution` from `bundler` to `nodenext` and add `.js` extensions to all relative imports. The published packages use `"type": "module"` but the compiled output had extensionless imports, which breaks Node.js ESM resolution. Also add `"type": "module"` to `@elevenlabs/types`.

## 0.9.0

### Minor Changes

- 0b24a1a: Add client support for mocking tool responses in agent conversations.

## 0.8.0

### Minor Changes

- f743ffc: Export `CALLBACK_KEYS` runtime array of all `Callbacks` keys, used by the React SDK for callback composition

## 0.7.0

### Minor Changes

- 1b84231: Add `guardrail_triggered` server-to-client WebSocket event, emitted when a guardrail is triggered during the conversation.

  **New callback:** `onGuardrailTriggered` on `Callbacks` — fires when the server detects a guardrail violation.

  ```js
  const conversation = await Conversation.startSession({
    agentId: "your-agent-id",
    onGuardrailTriggered: () => {
      console.log("A guardrail was triggered");
    },
  });
  ```

## 0.7.0-rc.0

### Minor Changes

- 1838c82: Export `CALLBACK_KEYS` runtime array of all `Callbacks` keys, used by the React SDK for callback composition

## 0.6.1

### Patch Changes

- a85e24d: add multimodal_message WebSocket event

## 0.6.0

### Minor Changes

- 3a2d602: Propagate event_id through transcript and streaming callbacks. Refactor tool status from Map-based tracking to inline transcript entries with display-transcript utility.

## 0.5.0

### Minor Changes

- f364f50: Added related types for supporting audio alignment data
