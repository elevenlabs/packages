# @elevenlabs/client

## 1.1.1

### Patch Changes

- f29c44b: Expose `sendMultimodalMessage` in `useConversationControls` hook. Export `MultimodalMessageInput` type from `@elevenlabs/client`.

## 1.1.0

### Minor Changes

- 0b24a1a: Add client support for mocking tool responses in agent conversations.

### Patch Changes

- Updated dependencies [0b24a1a]
  - @elevenlabs/types@0.9.0

## 1.0.0

### Major Changes

- f174972: **Breaking:** `Input` class removed from exports; `VoiceConversation.input` is now private; `changeInputDevice()` returns `void`.

  The `Input` class is no longer exported. The `input` field on `VoiceConversation` is now private. `changeInputDevice()` returns `Promise<void>` instead of `Promise<Input>`.

  **Before:**

  ```ts
  import { Input } from "@elevenlabs/client";

  const input: Input = conversation.input;
  input.analyser.getByteFrequencyData(data);
  input.setMuted(true);

  const newInput: Input = await conversation.changeInputDevice(config);
  newInput.worklet.port.postMessage(…);
  ```

  **After:**

  ```ts
  import type { InputController } from "@elevenlabs/client";

  conversation.getInputByteFrequencyData(); // replaces input.analyser.getByteFrequencyData
  conversation.setMicMuted(true); // replaces input.setMuted

  await conversation.changeInputDevice(config); // return value dropped
  ```

  **Migration:**
  1. Replace `import { Input }` with `import type { InputController }` if you need the type.
  2. Replace `conversation.input.analyser.getByteFrequencyData(data)` with `conversation.getInputByteFrequencyData()`.
  3. Replace `conversation.input.setMuted(v)` with `conversation.setMicMuted(v)`.
  4. Drop the return value of `changeInputDevice()`.

- f174972: **Breaking:** `InputController` and `OutputController` interfaces are now exported; `Input` and `Output` class exports are replaced by these interfaces.

  **Before:**

  ```ts
  import { Input, Output } from "@elevenlabs/client";
  ```

  **After:**

  ```ts
  import type { InputController, OutputController } from "@elevenlabs/client";
  ```

- f174972: **Breaking:** `Conversation` is no longer a class — it is now a plain namespace object and a type alias for `TextConversation | VoiceConversation`.

  `instanceof Conversation` no longer compiles. Subclassing `Conversation` is no longer possible. The `startSession()` call is unchanged.

  **Before:**

  ```ts
  import { Conversation } from "@elevenlabs/client";

  // instanceof check compiled fine
  if (session instanceof Conversation) { … }

  // subclassing was possible
  class MyConversation extends Conversation { … }

  // startSession returned the class type
  const session: Conversation = await Conversation.startSession(options);
  ```

  **After:**

  ```ts
  import { Conversation } from "@elevenlabs/client";
  import type {
    Conversation,
    TextConversation,
    VoiceConversation,
  } from "@elevenlabs/client";

  // startSession call is unchanged
  const session: Conversation = await Conversation.startSession(options);

  // Narrow using the concrete types or duck-typing instead of instanceof
  if ("changeInputDevice" in session) {
    // session is VoiceConversation
  }
  ```

  **Migration:**
  1. Remove `instanceof Conversation` checks. Narrow on `TextConversation` or `VoiceConversation` using `"changeInputDevice" in session` (voice) or duck-typing on the methods you need.
  2. Remove any subclasses of `Conversation` — implement the `BaseConversation` interface directly or compose instead.
  3. The `startSession()` call is unchanged and requires no migration.

- 1dc66aa: **Breaking:** The default `connectionType` is now inferred from the conversation mode instead of always defaulting to `"websocket"`.
  - **Voice conversations** (default) now use `"webrtc"` by default
  - **Text-only conversations** (`textOnly: true`) use `"websocket"` by default

  Users who previously relied on the implicit `"websocket"` default for voice conversations and need to keep using WebSocket must now explicitly set `connectionType: "websocket"`.

  `connectionType` is now optional on `PublicSessionConfig` (when using `agentId`).

- f174972: **Breaking:** `Output` class removed from exports; `VoiceConversation.output` is now private; `changeOutputDevice()` returns `void`.

  The `Output` class is no longer exported. The `output` field on `VoiceConversation` is now private. `changeOutputDevice()` returns `Promise<void>` instead of `Promise<Output>`.

  **Before:**

  ```ts
  import { Output } from "@elevenlabs/client";

  const output: Output = conversation.output;
  output.gain.gain.value = 0.5;
  output.analyser.getByteFrequencyData(data);
  output.worklet.port.postMessage({ type: "interrupt" });

  const newOutput: Output = await conversation.changeOutputDevice(config);
  ```

  **After:**

  ```ts
  import type { OutputController } from "@elevenlabs/client";

  conversation.setVolume({ volume: 0.5 }); // replaces output.gain.gain.value
  conversation.getOutputByteFrequencyData(); // replaces output.analyser.getByteFrequencyData
  // interruption is handled internally by VoiceConversation

  await conversation.changeOutputDevice(config); // return value dropped
  ```

  **Migration:**
  1. Replace `import { Output }` with `import type { OutputController }` if you need the type.
  2. Replace `conversation.output.gain.gain.value = v` with `conversation.setVolume({ volume: v })`.
  3. Replace `conversation.output.analyser.getByteFrequencyData(data)` with `conversation.getOutputByteFrequencyData()`.
  4. Drop the return value of `changeOutputDevice()`.

- f174972: **Breaking:** `VoiceConversation.wakeLock` is now private.

  The `wakeLock` field is no longer accessible on `VoiceConversation`. It was always an internal detail for preventing screen sleep during a session and was never intended as stable public API.

  **Before:**

  ```ts
  const lock: WakeLockSentinel | null = conversation.wakeLock;
  if (lock) {
    await lock.release();
  }
  ```

  **After:** Wake lock lifecycle is managed entirely by `VoiceConversation`. There is no replacement — the lock is released automatically when the session ends. If you need to suppress wake locking entirely, pass `useWakeLock: false` in the session options.

  ```ts
  const conversation = await Conversation.startSession({
    // …
    useWakeLock: false, // opt out of wake lock management
  });
  ```

### Patch Changes

- 1dbda93: Return 0 from `getInputVolume()`/`getOutputVolume()` and empty `Uint8Array` from `getInputByteFrequencyData()`/`getOutputByteFrequencyData()` instead of throwing when no active conversation or analyser is available. This avoids forcing consumers (e.g., animation loops) to wrap every call in try-catch.
- a8883a1: Replace microbundle with rolldown for IIFE builds (client, react) and tsc-only builds (react-native). No public API changes — the CDN bundle format changes from UMD to IIFE.
- Updated dependencies [f743ffc]
  - @elevenlabs/types@0.8.0

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

  For the client to receive events, it must be enabled on the "Advanced" tab of the agent's settings.

- 2e37cd9: Add type discriminant property to `TextConversation` and `VoiceConversation`, enabling discriminated union narrowing. Add `startSession` overloads that narrow return type based on `textOnly` option.

### Patch Changes

- Updated dependencies [1b84231]
  - @elevenlabs/types@0.7.0

## 1.0.0-rc.1

### Patch Changes

- Updated dependencies [1838c82]
  - @elevenlabs/types@0.7.0-rc.0

## 1.0.0-rc.0

### Major Changes

- 81013c0: **Breaking:** `Input` class removed from exports; `VoiceConversation.input` is now private; `changeInputDevice()` returns `void`.

  The `Input` class is no longer exported. The `input` field on `VoiceConversation` is now private. `changeInputDevice()` returns `Promise<void>` instead of `Promise<Input>`.

  **Before:**

  ```ts
  import { Input } from "@elevenlabs/client";

  const input: Input = conversation.input;
  input.analyser.getByteFrequencyData(data);
  input.setMuted(true);

  const newInput: Input = await conversation.changeInputDevice(config);
  newInput.worklet.port.postMessage(…);
  ```

  **After:**

  ```ts
  import type { InputController } from "@elevenlabs/client";

  conversation.getInputByteFrequencyData(); // replaces input.analyser.getByteFrequencyData
  conversation.setMicMuted(true); // replaces input.setMuted

  await conversation.changeInputDevice(config); // return value dropped
  ```

  **Migration:**
  1. Replace `import { Input }` with `import type { InputController }` if you need the type.
  2. Replace `conversation.input.analyser.getByteFrequencyData(data)` with `conversation.getInputByteFrequencyData()`.
  3. Replace `conversation.input.setMuted(v)` with `conversation.setMicMuted(v)`.
  4. Drop the return value of `changeInputDevice()`.

- 81013c0: **Breaking:** `InputController` and `OutputController` interfaces are now exported; `Input` and `Output` class exports are replaced by these interfaces.

  **Before:**

  ```ts
  import { Input, Output } from "@elevenlabs/client";
  ```

  **After:**

  ```ts
  import type { InputController, OutputController } from "@elevenlabs/client";
  ```

- 81013c0: **Breaking:** `Conversation` is no longer a class — it is now a plain namespace object and a type alias for `TextConversation | VoiceConversation`.

  `instanceof Conversation` no longer compiles. Subclassing `Conversation` is no longer possible. The `startSession()` call is unchanged.

  **Before:**

  ```ts
  import { Conversation } from "@elevenlabs/client";

  // instanceof check compiled fine
  if (session instanceof Conversation) { … }

  // subclassing was possible
  class MyConversation extends Conversation { … }

  // startSession returned the class type
  const session: Conversation = await Conversation.startSession(options);
  ```

  **After:**

  ```ts
  import { Conversation } from "@elevenlabs/client";
  import type {
    Conversation,
    TextConversation,
    VoiceConversation,
  } from "@elevenlabs/client";

  // startSession call is unchanged
  const session: Conversation = await Conversation.startSession(options);

  // Narrow using the concrete types or duck-typing instead of instanceof
  if ("changeInputDevice" in session) {
    // session is VoiceConversation
  }
  ```

  **Migration:**
  1. Remove `instanceof Conversation` checks. Narrow on `TextConversation` or `VoiceConversation` using `"changeInputDevice" in session` (voice) or duck-typing on the methods you need.
  2. Remove any subclasses of `Conversation` — implement the `BaseConversation` interface directly or compose instead.
  3. The `startSession()` call is unchanged and requires no migration.

- 81013c0: **Breaking:** `Output` class removed from exports; `VoiceConversation.output` is now private; `changeOutputDevice()` returns `void`.

  The `Output` class is no longer exported. The `output` field on `VoiceConversation` is now private. `changeOutputDevice()` returns `Promise<void>` instead of `Promise<Output>`.

  **Before:**

  ```ts
  import { Output } from "@elevenlabs/client";

  const output: Output = conversation.output;
  output.gain.gain.value = 0.5;
  output.analyser.getByteFrequencyData(data);
  output.worklet.port.postMessage({ type: "interrupt" });

  const newOutput: Output = await conversation.changeOutputDevice(config);
  ```

  **After:**

  ```ts
  import type { OutputController } from "@elevenlabs/client";

  conversation.setVolume({ volume: 0.5 }); // replaces output.gain.gain.value
  conversation.getOutputByteFrequencyData(); // replaces output.analyser.getByteFrequencyData
  // interruption is handled internally by VoiceConversation

  await conversation.changeOutputDevice(config); // return value dropped
  ```

  **Migration:**
  1. Replace `import { Output }` with `import type { OutputController }` if you need the type.
  2. Replace `conversation.output.gain.gain.value = v` with `conversation.setVolume({ volume: v })`.
  3. Replace `conversation.output.analyser.getByteFrequencyData(data)` with `conversation.getOutputByteFrequencyData()`.
  4. Drop the return value of `changeOutputDevice()`.

- 81013c0: **Breaking:** `VoiceConversation.wakeLock` is now private.

  The `wakeLock` field is no longer accessible on `VoiceConversation`. It was always an internal detail for preventing screen sleep during a session and was never intended as stable public API.

  **Before:**

  ```ts
  const lock: WakeLockSentinel | null = conversation.wakeLock;
  if (lock) {
    await lock.release();
  }
  ```

  **After:** Wake lock lifecycle is managed entirely by `VoiceConversation`. There is no replacement — the lock is released automatically when the session ends. If you need to suppress wake locking entirely, pass `useWakeLock: false` in the session options.

  ```ts
  const conversation = await Conversation.startSession({
    // …
    useWakeLock: false, // opt out of wake lock management
  });
  ```

### Patch Changes

- ea66b5e: Replace microbundle with rolldown for IIFE builds (client, react) and tsc-only builds (react-native). No public API changes — the CDN bundle format changes from UMD to IIFE.

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
