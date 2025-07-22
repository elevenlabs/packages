# ElevenLabs React Native SDK

A React Native SDK for ElevenLabs Conversational AI using WebRTC via LiveKit.

## Features

- Real-time voice conversations with AI agents
- WebRTC communication through LiveKit
- TypeScript support
- Expo compatible (development builds only)

## Installation

```bash
npm install @elevenlabs/react-native @livekit/react-native
```

## Quick Start

### Basic Usage

```typescript
import React from 'react';
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';
import * as Livekit from '@livekit/react-native';

function App() {
  return (
    <ElevenLabsProvider LiveKit={LiveKit}>
      <ConversationComponent />
    </ElevenLabsProvider>
  );
}

function ConversationComponent() {
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
    onDebug: (debug) => console.log('Debug:', debug),
  });

  const startSession = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id'
    });
  };

  const endSession = async () => {
    await conversation.endConversation();
  };

  return (
    // Your UI components
  );
}
```

## API Reference

### useConversation Hook

Returns a conversation object with the following methods:

#### `startSession(config: ConversationConfig): Promise<void>`

Starts a new conversation session.

**Parameters:**
- `config.agentId`: ElevenLabs agent ID
- `config.conversationToken`: Optional pre-generated token

```typescript
await conversation.startSession({
  agentId: 'your-agent-id'
});
```

#### `endConversation(): Promise<void>`

Ends the current conversation session.

```typescript
await conversation.endConversation();
```

#### `status: ConversationStatus`

Current conversation status ('connecting' | 'connected' | 'disconnected')

```typescript
console.log(conversation.status);
```

### Callback Options

Pass to `useConversation` hook:

- `onConnect: () => void` - Called when connected
- `onDisconnect: (details?: unknown) => void` - Called when disconnected
- `onMessage: (message: unknown) => void` - Called when message received
- `onError: (error: unknown) => void` - Called on error
- `onDebug: (debug: unknown) => void` - Called with debug info

## Requirements

This SDK requires:
- React Native with LiveKit dependencies installed and configured
- Microphone permissions

## Development

Please, refer to the README.md file in the root of this repository.

## Contributing

Please, create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.