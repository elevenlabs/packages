---
"@elevenlabs/react": major
---

**Breaking:** `useConversation` now requires a `ConversationProvider` ancestor. The hook accepts the same options as before and returns the same shape, but must be rendered inside a provider.

**New fields** on the return value: `isMuted`, `setMuted`, `isListening`, `mode`, and `message`.

**Removed exports:**
- `DeviceFormatConfig` — use `FormatConfig` from `@elevenlabs/client` instead.
- `DeviceInputConfig` — use `InputDeviceConfig` from `@elevenlabs/client` instead.
- `parseLocation`, `getOriginForLocation`, `getLivekitUrlForLocation`, `Location` — these were internal utilities not intended for public use and have been removed.

**Re-export change:** `@elevenlabs/react` now re-exports all of `@elevenlabs/client` via `export *`, replacing the previous selective re-exports.

## Migration

Wrap your app (or the relevant subtree) in a `ConversationProvider`. Options can live on the provider, on the hook, or both — the provider merges them.

**Before:**
```tsx
import { useConversation } from "@elevenlabs/react";

function App() {
  const { status, isSpeaking, startSession, endSession } = useConversation({
    agentId: "your-agent-id",
    onMessage: (message) => console.log(message),
    onError: (error) => console.error(error),
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
    onMessage: (message) => console.log(message),
    onError: (error) => console.error(error),
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
