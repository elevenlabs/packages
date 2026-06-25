# @elevenlabs/types

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
