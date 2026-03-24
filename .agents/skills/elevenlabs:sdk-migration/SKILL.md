---
name: elevenlabs:sdk-migration
description: Migrate to the next major version of @elevenlabs/client, @elevenlabs/react, and @elevenlabs/react-native. Use when updating code that uses Conversation, Input, Output, useConversation, ElevenLabsProvider, ConversationProvider, or related APIs from these packages. Also trigger when users mention upgrading ElevenLabs packages, fixing breaking changes after an npm update, moving to the latest ElevenLabs SDK, or encountering type errors or runtime errors after updating @elevenlabs/* dependencies.
license: MIT
---

# SDK Migration Guide (Next Major Version)

Migration guide for `@elevenlabs/client`, `@elevenlabs/react`, and `@elevenlabs/react-native` breaking changes in the next major release.

## Migration order

Follow these steps in sequence — each builds on the previous one.

1. **Install** the new packages.
2. **Fix imports** — remove deleted exports (`Input`, `Output`, `DeviceFormatConfig`, `DeviceInputConfig`, `ElevenLabsProvider`) and replace with their successors.
3. **Wrap with `ConversationProvider`** — every `useConversation` call now requires a provider ancestor.
4. **Update API calls** — adapt to changed signatures (`startSession` is now sync in React, `Conversation` is no longer a class, etc.).
5. **Optimize with granular hooks** *(optional)* — replace local state with `useConversationStatus`, `useConversationMode`, etc. for better render performance.

## Installation

```bash
npm install @elevenlabs/client@next @elevenlabs/react@next @elevenlabs/react-native@next
```

## `@elevenlabs/client`

### Replace `instanceof Conversation` checks

`Conversation` is now a plain namespace object and a type alias for `TextConversation | VoiceConversation`. This enables tree-shaking and simplifies the internal architecture. `instanceof Conversation` no longer compiles and subclassing is not possible.

Use duck-typing to narrow the type instead:

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

// startSession call is unchanged
const session: Conversation = await Conversation.startSession(options);

// Narrow using duck-typing instead of instanceof
if ("changeInputDevice" in session) {
  // session is VoiceConversation
}
```

### Replace `Input` and `Output` usage with conversation methods

The `Input` and `Output` classes are no longer exported because direct access to internal audio nodes created tight coupling to implementation details. The `input` and `output` fields on `VoiceConversation` are now private. All audio operations are methods on the conversation instance itself.

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
conversation.getInputByteFrequencyData(); // replaces input.analyser.getByteFrequencyData
conversation.setMicMuted(true); // replaces input.setMuted
conversation.setVolume({ volume: 0.5 }); // replaces output.gain.gain.value
conversation.getOutputByteFrequencyData(); // replaces output.analyser.getByteFrequencyData

await conversation.changeInputDevice(config); // return value dropped
await conversation.changeOutputDevice(config); // return value dropped
```

### Remove direct `wakeLock` access

The `wakeLock` field is now private because wake lock lifecycle is managed automatically to prevent accidental interference. Opt out with `useWakeLock: false`:

```ts
const conversation = await Conversation.startSession({
  // ...
  useWakeLock: false,
});
```

## `@elevenlabs/react`

### Wrap `useConversation` with `ConversationProvider`

`useConversation` now requires a `ConversationProvider` ancestor. The provider holds shared session state that multiple hooks can subscribe to independently — this is what enables the new granular hooks system and better render performance.

The hook accepts the same options as before and returns the same shape, plus new fields: `isMuted`, `setMuted`, `isListening`, `mode`, and `message`.

When migrating a codebase with **multiple components using `useConversation`**, ask the user whether they want:

1. **A single shared `ConversationProvider`** wrapping all conversation components higher in the tree (all components share one session), or
2. **Individual `ConversationProvider` wrappers** for each component (each component manages its own independent session).

This choice affects session sharing, state isolation, and component architecture — do not assume, ask before proceeding.

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

### Remove `await` from `startSession`

When using `useConversation` (React), `startSession` is now synchronous and returns `void`. Session lifecycle is managed by the provider, and errors flow through callbacks rather than thrown promises.

When migrating:
- Remove `await` from `startSession()` calls.
- If `startSession()` was the only awaited call in the function, remove the `async` keyword from the containing function.
- If there was a `try`/`catch` around `startSession()` to handle connection errors, move error handling to the `onError` callback or `useConversationStatus` hook — the synchronous call no longer throws on session failures.

**Before:**

```ts
const startConversation = async () => {
  try {
    await conversation.startSession({ agentId: "..." });
  } catch (error) {
    console.error("Failed to start:", error);
    setStatus("disconnected");
  }
};
```

**After:**

```ts
// onError handles failures instead of try/catch
const conversation = useConversation({
  onError: (error) => {
    console.error("Failed to start:", error);
    setStatus("disconnected");
  },
});

const startConversation = () => {
  conversation.startSession({ agentId: "..." });
};
```

### Update removed type imports

- Replace `DeviceFormatConfig` with `FormatConfig` from `@elevenlabs/client`.
- Replace `DeviceInputConfig` with `InputDeviceConfig` from `@elevenlabs/client`.

### Re-export change

`@elevenlabs/react` now re-exports all of `@elevenlabs/client` via `export *`, replacing the previous selective re-exports.

### Adopt granular conversation hooks (optional)

New hooks subscribe to independent slices of conversation state, so a status change won't re-render a component that only reads mode. This is the main benefit of the `ConversationProvider` architecture — shared state enables fine-grained subscriptions.

After the initial migration compiles, check whether components maintain **local connection state** (e.g., `useState` for `agentState`, `isMuted`, `isSpeaking`) that duplicates what these hooks provide. If so, ask the user whether they want to **replace local state with granular hooks**:

- `useConversationStatus()` replaces local `agentState` / `status` state managed via `onStatusChange` callbacks.
- `useConversationInput()` replaces local `isMuted` state managed via manual toggles.
- `useConversationMode()` replaces local `isSpeaking` / `isListening` state.
- `useConversationControls()` provides stable action refs (`startSession`, `endSession`, `sendUserMessage`, `getInputVolume`, `getOutputVolume`, etc.) that never cause re-renders.

When refactoring to granular hooks:
- Move event callbacks (`onConnect`, `onDisconnect`, `onError`, `onMessage`) to `ConversationProvider` props when they don't need access to component-local state.
- Keep `useConversation` for callbacks that reference component-local state (e.g., updating a local `messages` array) — but use granular hooks for reading status/mode/input state.
- Remove `onStatusChange` from `startSession` options — status is now reactive via `useConversationStatus()`.

| Hook                        | Returns                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useConversationControls()` | Stable action methods: `startSession`, `endSession`, `sendUserMessage`, `setVolume`, `changeInputDevice`, `changeOutputDevice`, etc. Never cause re-renders. |
| `useConversationStatus()`   | `status` (`"disconnected"` / `"connecting"` / `"connected"` / `"error"`) and optional `message`.                                                             |
| `useConversationInput()`    | `isMuted` state and `setMuted` action.                                                                                                                       |
| `useConversationMode()`     | `mode` (`"speaking"` / `"listening"`), `isSpeaking`, `isListening`.                                                                                          |
| `useConversationFeedback()` | `canSendFeedback` state and `sendFeedback(like: boolean)` action.                                                                                            |
| `useRawConversation()`      | Raw `Conversation` instance or `null` (escape hatch).                                                                                                        |

All hooks require a `ConversationProvider` ancestor.

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

### Register client tools with `useConversationClientTool`

New hook for dynamically registering client tools from React components. Tools added or removed after session start are immediately visible. Duplicate tool names throw an error.

```tsx
import { useConversationClientTool } from "@elevenlabs/react";

// Untyped — parameters are Record<string, unknown>
useConversationClientTool("get_weather", params => {
  const city = params["city"];
  return `Weather in ${city} is sunny.`;
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

## `@elevenlabs/react-native`

### Replace `ElevenLabsProvider` with `ConversationProvider`

The custom LiveKit-based implementation (`ElevenLabsProvider`, `useConversation`) has been entirely removed. The package now re-exports from `@elevenlabs/react`, unifying the API across web and mobile with `ConversationProvider` and the same granular hooks.

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
