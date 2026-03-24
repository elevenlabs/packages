# @elevenlabs/client

## 0.16.0

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

- 2e37cd9: Add type discriminant property to `TextConversation` and `VoiceConversation`, enabling discriminated union narrowing. Add `startSession` overloads that narrow return type based on `textOnly` option.

### Patch Changes

- Updated dependencies [1b84231]
  - @elevenlabs/types@0.7.0

## 0.15.2

### Patch Changes

- a85e24d: add multimodal_message WebSocket event
- Updated dependencies [a85e24d]
  - @elevenlabs/types@0.6.1

## 0.15.1

### Patch Changes

- 7368ccd: Adds resampling to the output audio when the required sampling rate cannot be acquired

## 0.15.0

### Minor Changes

- 3a2d602: Propagate event_id through transcript and streaming callbacks. Refactor tool status from Map-based tracking to inline transcript entries with display-transcript utility.

### Patch Changes

- Updated dependencies [3a2d602]
  - @elevenlabs/types@0.6.0

## 0.14.0

### Minor Changes

- 5a9d468: Reduce audio chunk length from 250ms to 100ms for lower latency

### Patch Changes

- 23ed493: Normalize the `textOnly` option (passable both on the top-level and via the overrides object): Providing one will propagate to the other, with the top-level taking precedence, in case of conflict.
- Updated dependencies [f364f50]
  - @elevenlabs/types@0.5.0

## 0.14.0-beta.0

### Minor Changes

- b559f42: Reduce audio chunk length from 250ms to 100ms for lower latency

## 0.13.1

### Patch Changes

- 73cbdae: Fixed an issue where input audio would not get re-established after permission revocation. Now input audio is re-established and the agent can hear the user, when permissions are granted or when permissions are ready to be prompted while a conversation is active.
