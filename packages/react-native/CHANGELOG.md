# @elevenlabs/react-native

## 1.1.5

### Patch Changes

- Updated dependencies [8c6213f]
- Updated dependencies [1153428]
- Updated dependencies [33c38e4]
  - @elevenlabs/client@1.5.0
  - @elevenlabs/react@1.4.0

## 1.1.4

### Patch Changes

- Updated dependencies [a8c2d5d]
- Updated dependencies [a8c2d5d]
- Updated dependencies [3a9d14a]
  - @elevenlabs/client@1.4.0
  - @elevenlabs/react@1.3.0

## 1.1.3

### Patch Changes

- Updated dependencies [748cbe0]
  - @elevenlabs/client@1.3.1
  - @elevenlabs/react@1.2.1

## 1.1.2

### Patch Changes

- Updated dependencies [606d018]
  - @elevenlabs/client@1.3.0
  - @elevenlabs/react@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies [4237f72]
  - @elevenlabs/client@1.2.1
  - @elevenlabs/react@1.1.1

## 1.1.0

### Minor Changes

- 0d5c368: Fix getInputVolume/getOutputVolume returning 0 in React Native by adding native volume providers using LiveKit's RMS and multiband FFT processors.

  **Breaking:** `getByteFrequencyData()` now returns data focused on the human voice range (100-8000 Hz) instead of the full spectrum (0 to sampleRate/2). On web, `getVolume()` is also computed from this range. The deprecated `getAnalyser()` method still provides direct access to the raw `AnalyserNode` for consumers needing full-spectrum data.

### Patch Changes

- Updated dependencies [806edd0]
- Updated dependencies [0d5c368]
  - @elevenlabs/react@1.1.0
  - @elevenlabs/client@1.2.0

## 1.0.3

### Patch Changes

- 50ea6ef: fix: use explicit .js extensions in ESM imports for Node.js compatibility

  Switch `moduleResolution` from `bundler` to `nodenext` and add `.js` extensions to all relative imports. The published packages use `"type": "module"` but the compiled output had extensionless imports, which breaks Node.js ESM resolution. Also add `"type": "module"` to `@elevenlabs/types`.

- Updated dependencies [50ea6ef]
  - @elevenlabs/client@1.1.2
  - @elevenlabs/react@1.0.3

## 1.0.2

### Patch Changes

- Updated dependencies [f29c44b]
  - @elevenlabs/client@1.1.1
  - @elevenlabs/react@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [0b24a1a]
  - @elevenlabs/client@1.1.0
  - @elevenlabs/react@1.0.1

## 1.0.0

### Major Changes

- a72ca40: **Breaking:** Complete API rewrite. The custom LiveKit-based implementation (`ElevenLabsProvider`, `useConversation`) has been removed and replaced with re-exports from `@elevenlabs/react`.

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

- a8883a1: Replace microbundle with rolldown for IIFE builds (client, react) and tsc-only builds (react-native). No public API changes — the CDN bundle format changes from UMD to IIFE.
- Updated dependencies [f174972]
- Updated dependencies [f174972]
- Updated dependencies [f174972]
- Updated dependencies [1dbda93]
- Updated dependencies [1dc66aa]
- Updated dependencies [f174972]
- Updated dependencies [1fd59f9]
- Updated dependencies [93a247e]
- Updated dependencies [f174972]
- Updated dependencies [a72ca40]
- Updated dependencies [93a247e]
- Updated dependencies [245ce5c]
- Updated dependencies [a8883a1]
- Updated dependencies [f174972]
  - @elevenlabs/client@1.0.0
  - @elevenlabs/react@1.0.0

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
