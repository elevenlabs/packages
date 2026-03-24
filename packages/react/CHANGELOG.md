# @elevenlabs/react

## 1.0.0-rc.2

### Minor Changes

- 364105b: Add controlled mute state support to `ConversationProvider`. Pass `isMuted` and `onMutedChange` props to own the microphone mute lifecycle externally (e.g. persist in localStorage across sessions). When omitted, mute state is managed internally as before.

### Patch Changes

- 8bf6652: Return 0 from `getInputVolume()`/`getOutputVolume()` and empty `Uint8Array` from `getInputByteFrequencyData()`/`getOutputByteFrequencyData()` instead of throwing when no active conversation or analyser is available. This avoids forcing consumers (e.g., animation loops) to wrap every call in try-catch.
- Updated dependencies [8bf6652]
- Updated dependencies [bb59062]
  - @elevenlabs/client@1.0.0-rc.2

## 1.0.0-rc.1

### Patch Changes

- @elevenlabs/client@1.0.0-rc.1

## 1.0.0-rc.0

### Major Changes

- cea40aa: **Breaking:** `useConversation` now requires a `ConversationProvider` ancestor. The hook accepts the same options as before and returns the same shape, but must be rendered inside a provider.

  **New fields** on the return value: `isMuted`, `setMuted`, `isListening`, `mode`, and `message`.

  **Removed exports:**
  - `DeviceFormatConfig` — use `FormatConfig` from `@elevenlabs/client` instead.
  - `DeviceInputConfig` — use `InputDeviceConfig` from `@elevenlabs/client` instead.

  **Re-export change:** `@elevenlabs/react` now re-exports all of `@elevenlabs/client` via `export *`, replacing the previous selective re-exports.

  ## Migration

  Wrap your app (or the relevant subtree) in a `ConversationProvider`. Options can live on the provider, on the hook, or both — the provider merges them.

  **Before:**

  ```tsx
  import { useConversation } from "@elevenlabs/react";

  function App() {
    const { status, isSpeaking, startSession, endSession } = useConversation({
      agentId: "your-agent-id",
      onMessage: message => console.log(message),
      onError: error => console.error(error),
    });

    return (
      <div>
        <p>Status: {status}</p>
        <p>{isSpeaking ? "Agent is speaking" : "Agent is listening"}</p>
        <button onClick={() => startSession()}>Start</button>
        <button onClick={() => endSession()}>Stop</button>
      </div>
    );
  }
  ```

  **After:**

  ```tsx
  import { ConversationProvider, useConversation } from "@elevenlabs/react";

  function App() {
    return (
      <ConversationProvider>
        <Conversation />
      </ConversationProvider>
    );
  }

  function Conversation() {
    const { status, isSpeaking, startSession, endSession } = useConversation({
      agentId: "your-agent-id",
      onMessage: message => console.log(message),
      onError: error => console.error(error),
    });

    return (
      <div>
        <p>Status: {status}</p>
        <p>{isSpeaking ? "Agent is speaking" : "Agent is listening"}</p>
        <button onClick={() => startSession()}>Start</button>
        <button onClick={() => endSession()}>Stop</button>
      </div>
    );
  }
  ```

- 81013c0: **Breaking:** `DeviceFormatConfig` and `DeviceInputConfig` have been removed. Use `FormatConfig` and `InputDeviceConfig` from `@elevenlabs/client` instead.

  These were duplicates of types already exported by `@elevenlabs/client`. `changeOutputDevice()` now accepts `FormatConfig & OutputConfig` (previously `DeviceFormatConfig & OutputConfig`).

  **Before:**

  ```ts
  import type {
    DeviceFormatConfig,
    DeviceInputConfig,
  } from "@elevenlabs/react";

  await conversation.changeInputDevice({
    format: "pcm",
    sampleRate: 16000,
    inputDeviceId: "my-device",
  });
  await conversation.changeOutputDevice({
    format: "pcm",
    sampleRate: 16000,
    outputDeviceId: "my-device",
  });
  ```

  **After:**

  ```ts
  import type {
    FormatConfig,
    InputDeviceConfig,
    OutputConfig,
  } from "@elevenlabs/client";

  await conversation.changeInputDevice({
    format: "pcm",
    sampleRate: 16000,
    inputDeviceId: "my-device",
  });
  await conversation.changeOutputDevice({
    format: "pcm",
    sampleRate: 16000,
    outputDeviceId: "my-device",
  });
  ```

  **Migration:** Replace `DeviceFormatConfig` with `FormatConfig` and `DeviceInputConfig` with `InputDeviceConfig`, both imported from `@elevenlabs/client`. The runtime values are unchanged — only the type imports need updating.

### Minor Changes

- cea40aa: Add granular conversation hooks for better render performance. Each hook subscribes to an independent slice of conversation state, so a status change won't re-render a component that only uses mode, and vice versa.

  **New hooks:**
  - `useConversationControls()` — stable action methods: `startSession`, `endSession`, `sendUserMessage`, `setVolume`, `changeInputDevice`, `changeOutputDevice`, `sendContextualUpdate`, `sendFeedback`, `sendUserActivity`, `sendMCPToolApprovalResult`, `getId`, `getInputByteFrequencyData`, `getOutputByteFrequencyData`, `getInputVolume`, `getOutputVolume`. References are stable across renders and never cause re-renders.
  - `useConversationStatus()` — reactive `status` (`"disconnected" | "connecting" | "connected" | "error"`) and optional `message`.
  - `useConversationInput()` — reactive `isMuted` state and `setMuted` action.
  - `useConversationMode()` — reactive `mode` (`"speaking" | "listening"`) with `isSpeaking` / `isListening` convenience booleans.
  - `useConversationFeedback()` — `canSendFeedback` state and `sendFeedback(like: boolean)` action.
  - `useRawConversation()` — escape hatch returning the raw `Conversation` instance or `null`.

  **New types:** `ConversationControlsValue`, `ConversationStatusValue`, `ConversationInputValue`, `ConversationModeValue`, `ConversationFeedbackValue`.

  All hooks must be used within a `ConversationProvider`.

  ## Migrating from `useConversation` to granular hooks

  With `useConversation`, every state change re-renders the consuming component. The granular hooks let you split your UI so each component subscribes only to what it needs:

  | `useConversation` return value               | Granular hook               |
  | -------------------------------------------- | --------------------------- |
  | `status`, `message`                          | `useConversationStatus()`   |
  | `isSpeaking`, `isListening`, `mode`          | `useConversationMode()`     |
  | `canSendFeedback`, `sendFeedback`            | `useConversationFeedback()` |
  | `isMuted`, `setMuted`                        | `useConversationInput()`    |
  | `startSession`, `endSession`, `setVolume`, … | `useConversationControls()` |

  ```tsx
  import {
    ConversationProvider,
    useConversationStatus,
    useConversationMode,
    useConversationControls,
    useConversationInput,
    useConversationFeedback,
  } from "@elevenlabs/react";

  function App() {
    return (
      <ConversationProvider agentId="your-agent-id">
        <StatusBadge />
        <Controls />
        <MuteButton />
        <FeedbackButtons />
        <ModeIndicator />
      </ConversationProvider>
    );
  }

  /** Only re-renders when status changes. */
  function StatusBadge() {
    const { status } = useConversationStatus();
    return <span className={`badge badge-${status}`}>{status}</span>;
  }

  /** Never re-renders — controls are stable references. */
  function Controls() {
    const { startSession, endSession } = useConversationControls();
    return (
      <div>
        <button onClick={() => startSession()}>Start</button>
        <button onClick={() => endSession()}>Stop</button>
      </div>
    );
  }

  /** Only re-renders when mute state changes. */
  function MuteButton() {
    const { isMuted, setMuted } = useConversationInput();
    return (
      <button onClick={() => setMuted(!isMuted)}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
    );
  }

  /** Only re-renders when feedback availability changes. */
  function FeedbackButtons() {
    const { canSendFeedback, sendFeedback } = useConversationFeedback();
    if (!canSendFeedback) return null;
    return (
      <div>
        <button onClick={() => sendFeedback(true)}>👍</button>
        <button onClick={() => sendFeedback(false)}>👎</button>
      </div>
    );
  }

  /** Only re-renders when mode changes. */
  function ModeIndicator() {
    const { isSpeaking, isListening } = useConversationMode();
    return (
      <p>
        {isSpeaking
          ? "Agent is speaking..."
          : isListening
            ? "Listening..."
            : ""}
      </p>
    );
  }
  ```

- cfea047: Add `useConversationClientTool` hook for dynamically registering client tools from React components.

  Tools added or removed after session start are immediately visible to `BaseConversation` at call time, since it performs dynamic property lookup on the same object reference. A fresh `clientTools` object is created per `startSession` call, merging option-provided tools with hook-registered tools. Duplicate tool names (hook-vs-hook or hook-vs-option) are detected and throw an error.

  The hook accepts an optional `ClientTools` type parameter — an interface mapping tool names to function signatures — enabling type-safe tool name constraints and handler param/return inference.

  **New hook:**
  - `useConversationClientTool(name, handler)` — registers a client tool that the agent can invoke, automatically cleaning up on unmount.

  **New types:** `ClientTool`, `ClientTools`, `ClientToolResult`.

  ```tsx
  // Untyped — parameters are Record<string, unknown>
  useConversationClientTool("get_weather", params => {
    return `Weather in ${params.city} is sunny.`;
  });

  // Type-safe — tool names are constrained, params and return types are inferred
  type Tools = {
    get_weather: (params: { city: string }) => string;
    set_volume: (params: { level: number }) => void;
  };

  useConversationClientTool<Tools>("get_weather", params => {
    // params: { city: string }, must return string
    return `Weather in ${params.city} is sunny.`;
  });
  ```

### Patch Changes

- 77798c7: Export `ConversationStatus` type alias.
- ea66b5e: Replace microbundle with rolldown for IIFE builds (client, react) and tsc-only builds (react-native). No public API changes — the CDN bundle format changes from UMD to IIFE.
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [ea66b5e]
- Updated dependencies [81013c0]
  - @elevenlabs/client@1.0.0-rc.0

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
