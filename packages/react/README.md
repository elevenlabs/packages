![hero](../../assets/hero.png)

# ElevenAgents React SDK

Build multimodal agents with the [ElevenAgents platform](https://elevenlabs.io/docs/eleven-agents/overview).

A React library for building voice and text conversations with ElevenAgents. For React Native, use [`@elevenlabs/react-native`](https://www.npmjs.com/package/@elevenlabs/react-native).

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/ElevenLabs/icon?icon=twitter&label)](https://twitter.com/ElevenLabs)

## Installation

```shell
npm install @elevenlabs/react
```

## Quick Start

```tsx
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";

function App() {
  return (
    {/* replace with your agent's ID */}
    <ConversationProvider agentId="agent_7101k5zvyjhmfg983brhmhkd98n6">
      <Conversation />
    </ConversationProvider>
  );
}

function Conversation() {
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();

  return (
    <div>
      <p>Status: {status}</p>
      <button
        onClick={() =>
          startSession({
            onConnect: ({ conversationId }) =>
              console.log("Connected:", conversationId),
            onError: (message) => console.error("Error:", message),
          })
        }
      >
        Start
      </button>
      <button onClick={() => endSession()}>End</button>
    </div>
  );
}
```

## Documentation

For the full API reference including connection types, client tools, conversation overrides, and more, see the [React SDK documentation](https://elevenlabs.io/docs/eleven-agents/libraries/react).

For real-time speech-to-text with the `useScribe` hook, see the [Scribe documentation](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming).

## Development

Please refer to the README.md file in the root of this repository.

## Contributing

Please create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
