---
name: elevenlabs:sdk-migration
description: Migrate to the next major version of @elevenlabs/client, @elevenlabs/react, and @elevenlabs/react-native. Use when updating code that uses Conversation, Input, Output, useConversation, ElevenLabsProvider, or related APIs from these packages.
license: MIT
---

# SDK Migration Guide (Next Major Version)

Migration guide for `@elevenlabs/client`, `@elevenlabs/react`, and `@elevenlabs/react-native` breaking changes in the next major release.

## Migration instructions

When migrating a codebase that contains **multiple components using `useConversation`** (or other hooks requiring `ConversationProvider`), ask the user whether they want:

1. **A single shared `ConversationProvider`** wrapping all conversation components higher in the tree (all components share one session), or
2. **Individual `ConversationProvider` wrappers** for each component (each component manages its own independent session).

This choice affects session sharing, state isolation, and component architecture. Do not assume — ask before proceeding.

## Installation

```bash
npm install @elevenlabs/client@next @elevenlabs/react@next @elevenlabs/react-native@next
```

## `@elevenlabs/client`

### `Conversation` is no longer a class

`Conversation` is now a plain namespace object and a type alias for `TextConversation | VoiceConversation`. `instanceof Conversation` no longer compiles and subclassing is not possible.

**Before:**

```ts
import { Conversation } from "@elevenlabs/client";

if (session instanceof Conversation) {
  /* ... */
}
class MyConversation extends Conversation {
  /* ... */
}
```

**After:**

```ts
import { Conversation } from "@elevenlabs/client";

// Narrow using duck-typing instead of instanceof
if ("changeInputDevice" in session) {
  // session is VoiceConversation
}

// startSession call is unchanged
const session: Conversation = await Conversation.startSession(options);
```

### `Input` and `Output` classes removed

The `Input` and `Output` classes are no longer exported. The `input` and `output` fields on `VoiceConversation` are now private. `changeInputDevice()` and `changeOutputDevice()` return `Promise<void>`.

Use `InputController` and `OutputController` interfaces if you need the types.

**Before:**

```ts
import { Input, Output } from "@elevenlabs/client";

const input: Input = conversation.input;
input.analyser.getByteFrequencyData(data);
input.setMuted(true);

const output: Output = conversation.output;
output.gain.gain.value = 0.5;
output.analyser.getByteFrequencyData(data);

const newInput: Input = await conversation.changeInputDevice(config);
```

**After:**

```ts
import type { InputController, OutputController } from "@elevenlabs/client";

conversation.getInputByteFrequencyData(); // replaces input.analyser.getByteFrequencyData
conversation.setMicMuted(true); // replaces input.setMuted
conversation.setVolume({ volume: 0.5 }); // replaces output.gain.gain.value
conversation.getOutputByteFrequencyData(); // replaces output.analyser.getByteFrequencyData

await conversation.changeInputDevice(config); // return value dropped
await conversation.changeOutputDevice(config); // return value dropped
```

### `VoiceConversation.wakeLock` is now private

The `wakeLock` field is no longer accessible. Wake lock lifecycle is managed automatically. Opt out with `useWakeLock: false`:

```ts
const conversation = await Conversation.startSession({
  // ...
  useWakeLock: false,
});
```

## `@elevenlabs/react`

### `useConversation` requires `ConversationProvider`

`useConversation` now requires a `ConversationProvider` ancestor. The hook accepts the same options as before and returns the same shape, but must be rendered inside a provider.

New fields on the return value: `isMuted`, `setMuted`, `isListening`, `mode`, and `message`.

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

### Removed type exports

- `DeviceFormatConfig` — use `FormatConfig` from `@elevenlabs/client` instead.
- `DeviceInputConfig` — use `InputDeviceConfig` from `@elevenlabs/client` instead.

### Re-export change

`@elevenlabs/react` now re-exports all of `@elevenlabs/client` via `export *`, replacing the previous selective re-exports.

### Granular conversation hooks

New hooks for better render performance. Each subscribes to an independent slice of conversation state, so a status change won't re-render a component that only uses mode.

| Hook                        | Returns                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useConversationControls()` | Stable action methods: `startSession`, `endSession`, `sendUserMessage`, `setVolume`, `changeInputDevice`, `changeOutputDevice`, etc. Never cause re-renders. |
| `useConversationStatus()`   | `status` (`"disconnected"` / `"connecting"` / `"connected"` / `"error"`) and optional `message`.                                                             |
| `useConversationInput()`    | `isMuted` state and `setMuted` action.                                                                                                                       |
| `useConversationMode()`     | `mode` (`"speaking"` / `"listening"`), `isSpeaking`, `isListening`.                                                                                          |
| `useConversationFeedback()` | `canSendFeedback` state and `sendFeedback(like: boolean)` action.                                                                                            |
| `useRawConversation()`      | Raw `Conversation` instance or `null` (escape hatch).                                                                                                        |

All hooks must be used within a `ConversationProvider`.

### `useConversationClientTool` hook

New hook for dynamically registering client tools from React components. Tools added or removed after session start are immediately visible. Duplicate tool names throw an error.

```tsx
import { useConversationClientTool } from "@elevenlabs/react";

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
  return `Weather in ${params.city} is sunny.`;
});
```

**Mapping from `useConversation`:**

| `useConversation` return value                 | Granular hook               |
| ---------------------------------------------- | --------------------------- |
| `status`, `message`                            | `useConversationStatus()`   |
| `isSpeaking`, `isListening`, `mode`            | `useConversationMode()`     |
| `canSendFeedback`, `sendFeedback`              | `useConversationFeedback()` |
| `isMuted`, `setMuted`                          | `useConversationInput()`    |
| `startSession`, `endSession`, `setVolume`, ... | `useConversationControls()` |

**Example — each component only re-renders when its specific state changes:**

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
      {isSpeaking ? "Agent is speaking..." : isListening ? "Listening..." : ""}
    </p>
  );
}
```

## `@elevenlabs/react-native`

### Complete API rewrite

The custom LiveKit-based implementation (`ElevenLabsProvider`, `useConversation`) has been removed and replaced with re-exports from `@elevenlabs/react`. The package now provides `ConversationProvider` and granular hooks instead of the previous monolithic API.

On React Native, the package performs side-effects on import: polyfilling WebRTC globals, configuring native AudioSession, and registering a platform-specific voice session strategy. On web, it re-exports without side-effects.

**Before:**

```tsx
import { ElevenLabsProvider, useConversation } from "@elevenlabs/react-native";

function App() {
  return (
    <ElevenLabsProvider>
      <Conversation />
    </ElevenLabsProvider>
  );
}

function Conversation() {
  const conversation = useConversation({
    onConnect: ({ conversationId }) => console.log("Connected", conversationId),
    onError: message => console.error(message),
  });

  return (
    <Button
      onPress={() => conversation.startSession({ agentId: "your-agent-id" })}
    />
  );
}
```

**After:**

```tsx
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react-native";

function App() {
  return (
    <ConversationProvider
      onConnect={({ conversationId }) =>
        console.log("Connected", conversationId)
      }
      onError={message => console.error(message)}
    >
      <Conversation />
    </ConversationProvider>
  );
}

function Conversation() {
  const { startSession } = useConversationControls();
  const { status } = useConversationStatus();

  return <Button onPress={() => startSession({ agentId: "your-agent-id" })} />;
}
```
