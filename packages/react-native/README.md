![hero](../../assets/hero.png)

# ElevenAgents React Native SDK

Build multimodal agents with [ElevenAgents](https://elevenlabs.io/docs/eleven-agents/overview) in React Native.

This package is a React Native companion to [`@elevenlabs/react`](https://www.npmjs.com/package/@elevenlabs/react). It re-exports the full conversation API and automatically configures the platform for voice conversations on React Native (WebRTC polyfills and native AudioSession setup).

## Installation

```shell
npm install @elevenlabs/react-native @livekit/react-native @livekit/react-native-webrtc
```

The LiveKit peer dependencies provide the native WebRTC modules required for voice conversations in React Native.

> **Note:** This SDK requires Expo development builds. Expo Go is not supported due to native module requirements.

## Quick Start

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
        console.log("Connected:", conversationId)
      }
      onError={(message) => console.error("Error:", message)}
    >
      <Conversation />
    </ConversationProvider>
  );
}

function Conversation() {
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();

  return (
    <>
      <Text>Status: {status}</Text>
      <Button
        title="Start"
        onPress={() => startSession({ agentId: "<your-agent-id>" })}
      />
      <Button title="End" onPress={() => endSession()} />
    </>
  );
}
```

## Example App

See the [Expo example app](../../examples/react-native-expo) for a complete working example.

## Documentation

For the full API reference, see the [React Native SDK documentation](https://elevenlabs.io/docs/eleven-agents/libraries/react-native).

## Development

Please refer to the README.md file in the root of this repository.

## Contributing

Please create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
