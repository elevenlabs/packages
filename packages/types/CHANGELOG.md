# @elevenlabs/types

## 0.13.0

### Minor Changes

- 1216ded: Merge `onAgentToolResponseFullPayload` into `onAgentToolResponse`.

  The `onAgentToolResponse` callback now accepts a union of the summary (`agent_tool_response`) and full payload (`agent_tool_response_full_payload`) event types. Both server events are dispatched through the single `onAgentToolResponse` callback. Consumers can distinguish between the two by checking for the presence of `full_tool_result` on the payload.

  ```tsx
  import { ConversationProvider } from "@elevenlabs/react-native";

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
  </ConversationProvider>;
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
