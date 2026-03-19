![hero](../../assets/hero.png)

# ElevenAgents React SDK

Build multimodal agents with the [ElevenAgents platform](https://elevenlabs.io/docs/eleven-agents/overview).

A React library for building voice and text conversations with ElevenAgents. For React Native, use [`@elevenlabs/react-native`](https://www.npmjs.com/package/@elevenlabs/react-native).

[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)

## Installation

```shell
npm install @elevenlabs/react
```

## Quick Start

```tsx
import { useConversation } from "@elevenlabs/react";

function Conversation() {
  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      console.log("Connected:", conversationId);
    },
    onDisconnect: () => {
      console.log("Disconnected");
    },
    onMessage: (message) => {
      console.log("Message:", message);
    },
    onError: (message) => {
      console.error("Error:", message);
    },
  });

  const handleStart = async () => {
    await conversation.startSession({
      agentId: "<your-agent-id>",
    });
  };

  return (
    <div>
      <p>Status: {conversation.status}</p>
      <button onClick={handleStart}>Start</button>
      <button onClick={() => conversation.endSession()}>End</button>
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
