# ElevenLabs React Native SDK

A React Native SDK for ElevenLabs Conversational AI.

## Features

- Real-time voice conversations with AI agents
- WebRTC communication through LiveKit
- Expo compatible (development builds only)

## Notes

This SDK was designed and built for use with the Expo framework. Due to it requiring native code, Expo Go is not supported at this time.

## Example app

There is an example app using this SDK located in the examples/react-native-expo directory. The readme there includes instructions on how to run the example app.

## Installation

```bash
npm install @elevenlabs/react-native @livekit/react-native @livekit/react-native-webrtc livekit-client
```

**Required Dependencies:**
- `@livekit/react-native` - LiveKit React Native SDK (native modules)
- `@livekit/react-native-webrtc` - WebRTC implementation for React Native
- `livekit-client` - LiveKit JavaScript client

*Note: LiveKit dependencies are required due to React Native's native module architecture and must be installed in your app's root dependencies.*

> **Installation Note:** You may see peer dependency warnings during installation. This is normal - the warnings ensure you have the required LiveKit packages installed for native module linking.

## Quick Start

### Basic Usage

```typescript
import React from 'react';
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';

function App() {
  return (
    <ElevenLabsProvider>
      <ConversationComponent />
    </ElevenLabsProvider>
  );
}

function ConversationComponent() {
  const conversation = useConversation({
    onConnect: ({ conversationId }) => console.log(`Connected to ${conversationId}`),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const startSession = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id'
    });
  };

  const endSession = async () => {
    await conversation.endSession();
  };

  const sendFeedback = (isPositive: boolean) => {
    if (conversation.canSendFeedback) {
      conversation.sendFeedback(isPositive);
    }
  };

  const sendUserMessage = (text: string) => {
    conversation.sendUserMessage(text);
  };

  return (
    // Your UI components
    // Use conversation.status, conversation.isSpeaking, conversation.canSendFeedback
  );
}
```

## API Reference

### useConversation Hook

Returns a conversation object with the following methods and properties:

#### `startSession(config: ConversationConfig): Promise<void>`

Starts a new conversation session.

**Parameters:**
- `config.agentId`: ElevenLabs agent ID, not needed if you provide a conversationToken.
- `config.conversationToken`: Optional pre-generated token, used for private agents that require authentication via your ElevenLabs API key.
- `config.userId`: You can optionally pass a user ID to identify the user in the conversation. This can be your own customer identifier. This will be included in the conversation initiation data sent to the server.

```typescript
await conversation.startSession({
  agentId: 'your-agent-id'
});
```

#### `endSession(): Promise<void>`

Ends the current conversation session.

```typescript
await conversation.endSession();
```

#### `sendFeedback(like: boolean): void`

Sends binary feedback for the most recent agent response.

**Parameters:**
- `like`: `true` for positive feedback, `false` for negative feedback

```typescript
// Positive feedback
conversation.sendFeedback(true);

// Negative feedback
conversation.sendFeedback(false);
```

#### `sendContextualUpdate(text: string): void`

Sends contextual information to the agent that won't trigger a response.

**Parameters:**
- `text`: Contextual information for the agent

```typescript
conversation.sendContextualUpdate(
  "User navigated to the profile page. Consider this for next response."
);
```

#### `sendUserMessage(text: string): void`

Sends a text message to the agent as if the user spoke it.

**Parameters:**
- `text`: The message text to send

```typescript
conversation.sendUserMessage("Hello, how are you today?");
```

#### `sendUserActivity(): void`

Notifies the agent about user activity to prevent interruptions.

The agent will pause speaking for ~2 seconds after receiving this signal.

```typescript
// Prevent interruption while user is typing
textInput.addEventListener('input', () => {
  conversation.sendUserActivity();
});
```

#### `getId(): string`

Retrieves the conversation ID.

```typescript
const id = conversation.getId();
// conv_9001k1zph3fkeh5s8xg9z90swaqa
console.log(id);
```

#### `setMicMuted(muted: boolean): void`

Mutes/unmutes the microphone

**Parameters:**
- `muted`: Whether the mic should be muted or not

```typescript
conversation.setMicMuted(true); // mute
conversation.setMicMuted(false) // unmute
```

#### Properties

- `status: ConversationStatus` - Current conversation status ('connecting' | 'connected' | 'disconnected')
- `isSpeaking: boolean` - Whether the agent is currently speaking
- `canSendFeedback: boolean` - Whether feedback can be sent for the current response

```typescript
console.log(conversation.status);
console.log(conversation.isSpeaking);
console.log(conversation.canSendFeedback);
```

### Configuration Options

Pass to `useConversation` hook to customize SDK behavior:

#### Server URL Override

Override the WebRTC server URL (defaults to ElevenLabs' LiveKit server):

```typescript
const conversation = useConversation({
  serverUrl: 'wss://your-custom-livekit-server.com'
});
```

#### Token Fetch URL Override

Override the token fetch endpoint (defaults to ElevenLabs' token API):

```typescript
const conversation = useConversation({
  tokenFetchUrl: 'https://your-api.com/v1/conversation/token'
});
```

You can also override the token fetch URL on a per-session basis:

```typescript
await conversation.startSession({
  agentId: 'your-agent-id',
  tokenFetchUrl: 'https://your-api.com/v1/conversation/token'
});
```

#### Combined Configuration

```typescript
const conversation = useConversation({
  serverUrl: 'wss://your-custom-livekit-server.com',
  tokenFetchUrl: 'https://your-api.com/v1/conversation/token',
  onConnect: () => console.log('Connected!'),
  onError: (error) => console.error('Error:', error)
});
```

### Callback Options

Pass to `useConversation` hook:

- `onConnect: () => void` - Called when connected
- `onDisconnect: (details?: unknown) => void` - Called when disconnected
- `onMessage: (message: unknown) => void` - Called when message received
- `onError: (error: unknown) => void` - Called on error

## Requirements

This SDK requires:
- React Native with LiveKit dependencies installed and configured
- Microphone permissions

## Development

Please, refer to the README.md file in the root of this repository.

## Contributing

Please, create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.