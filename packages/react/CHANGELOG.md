# @elevenlabs/react

## 0.15.0

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
- Updated dependencies [2e37cd9]
  - @elevenlabs/client@0.16.0

## 0.14.3

### Patch Changes

- a85e24d: add multimodal_message WebSocket event
- Updated dependencies [a85e24d]
  - @elevenlabs/client@0.15.2

## 0.14.2

### Patch Changes

- Updated dependencies [7368ccd]
  - @elevenlabs/client@0.15.1

## 0.14.1

### Patch Changes

- Updated dependencies [3a2d602]
  - @elevenlabs/client@0.15.0

## 0.14.0

### Minor Changes

- 5a9d468: Reduce audio chunk length from 250ms to 100ms for lower latency

### Patch Changes

- Updated dependencies [23ed493]
- Updated dependencies [5a9d468]
  - @elevenlabs/client@0.14.0

## 0.14.0-beta.0

### Minor Changes

- b559f42: Reduce audio chunk length from 250ms to 100ms for lower latency

### Patch Changes

- Updated dependencies [b559f42]
  - @elevenlabs/client@0.14.0-beta.0

## 0.13.1

### Patch Changes

- Updated dependencies [73cbdae]
  - @elevenlabs/client@0.13.1
