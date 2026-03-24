# @elevenlabs/react-native

## 0.6.0

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

### Patch Changes

- Updated dependencies [1b84231]
  - @elevenlabs/types@0.7.0

## 0.5.12

### Patch Changes

- a85e24d: add multimodal_message WebSocket event
- Updated dependencies [a85e24d]
  - @elevenlabs/types@0.6.1

## 0.5.11

### Patch Changes

- Updated dependencies [3a2d602]
  - @elevenlabs/types@0.6.0

## 0.5.10

### Patch Changes

- 3a8cc56: Fix establishing text-only conversations. Note: This change also regresses a bug-fix where access to audio input is requested, even for text-only conversations.

## 0.5.9

### Patch Changes

- 9caf68f: Add missing top-level `textOnly` option and ensure normalization with the existing option passable via the overrides object: Providing one will propagate to the other, with the top-level taking precedence, in case of conflict.
- Updated dependencies [f364f50]
  - @elevenlabs/types@0.5.0

## 0.5.8

### Patch Changes

- e7ad363: Minor change to the README.
