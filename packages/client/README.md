![hero](../../assets/hero.png)

# ElevenAgents TypeScript SDK

Build multimodal agents with [ElevenAgents](https://elevenlabs.io/docs/eleven-agents/overview).

A TypeScript / JavaScript client library for using ElevenAgents, or as a base for framework-specific libraries. If you're using React, consider using [`@elevenlabs/react`](https://www.npmjs.com/package/@elevenlabs/react) instead.

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/ElevenLabs/icon?icon=twitter&label)](https://twitter.com/ElevenLabs)

## Installation

```shell
npm install @elevenlabs/client
```

## Quick Start

```js
import { Conversation } from "@elevenlabs/client";

const conversation = await Conversation.startSession({
  agentId: "agent_7101k5zvyjhmfg983brhmhkd98n6", // replace with your agent's ID
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

// End the conversation
await conversation.endSession();
```

## Documentation

For the full API reference including connection types, client tools, conversation overrides, and more, see the [JavaScript SDK documentation](https://elevenlabs.io/docs/eleven-agents/libraries/java-script).

## Development

Please refer to the README.md file in the root of this repository.

## Contributing

Please create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
