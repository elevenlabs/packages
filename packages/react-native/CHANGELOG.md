# @elevenlabs/react-native

## 1.0.0-rc.0

### Major Changes

- 77798c7: **Breaking:** Complete API rewrite. The custom LiveKit-based implementation (`ElevenLabsProvider`, `useConversation`) has been removed and replaced with re-exports from `@elevenlabs/react`.

  The package now provides `ConversationProvider` and granular hooks (`useConversationControls`, `useConversationStatus`, `useConversationInput`, `useConversationMode`, `useConversationFeedback`) instead of the previous monolithic `useConversation` hook.

  On React Native, the package performs side-effects on import: polyfilling WebRTC globals, configuring native AudioSession, and registering a platform-specific voice session strategy. On web, it re-exports without side-effects.

  ## Migration

  **Before:**

  ```tsx
  import {
    ElevenLabsProvider,
    useConversation,
  } from "@elevenlabs/react-native";

  function App() {
    return (
      <ElevenLabsProvider>
        <Conversation />
      </ElevenLabsProvider>
    );
  }

  function Conversation() {
    const conversation = useConversation({
      onConnect: ({ conversationId }) =>
        console.log("Connected", conversationId),
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

    return (
      <Button onPress={() => startSession({ agentId: "your-agent-id" })} />
    );
  }
  ```

### Patch Changes

- ea66b5e: Replace microbundle with rolldown for IIFE builds (client, react) and tsc-only builds (react-native). No public API changes — the CDN bundle format changes from UMD to IIFE.
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [81013c0]
- Updated dependencies [cea40aa]
- Updated dependencies [81013c0]
- Updated dependencies [77798c7]
- Updated dependencies [cea40aa]
- Updated dependencies [cfea047]
- Updated dependencies [ea66b5e]
- Updated dependencies [81013c0]
  - @elevenlabs/client@1.0.0-rc.0
  - @elevenlabs/react@1.0.0-rc.0

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
