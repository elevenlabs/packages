# @elevenlabs/types

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

## 0.6.1

### Patch Changes

- a85e24d: add multimodal_message WebSocket event

## 0.6.0

### Minor Changes

- 3a2d602: Propagate event_id through transcript and streaming callbacks. Refactor tool status from Map-based tracking to inline transcript entries with display-transcript utility.

## 0.5.0

### Minor Changes

- f364f50: Added related types for supporting audio alignment data
