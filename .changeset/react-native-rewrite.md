---
"@elevenlabs/react-native": major
---

**Breaking:** Complete API rewrite. The custom LiveKit-based implementation (`ElevenLabsProvider`, `useConversation`) has been removed and replaced with re-exports from `@elevenlabs/react`.

The package now provides `ConversationProvider` and granular hooks (`useConversationControls`, `useConversationStatus`, `useConversationInput`, `useConversationMode`, `useConversationFeedback`) instead of the previous monolithic `useConversation` hook.

On React Native, the package performs side-effects on import: polyfilling WebRTC globals, configuring native AudioSession, and registering a platform-specific voice session strategy. On web, it re-exports without side-effects.

## Migration

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
