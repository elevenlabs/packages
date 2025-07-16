# ElevenLabs React Native SDK - Usage Examples

## Basic Usage (Default ServerUrl)

```typescript
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';

const ConversationScreen = () => {
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onError: (error) => console.error('Error:', error),
  });

  const handleStart = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id'
    });
  };

  // Uses default serverUrl: wss://livekit.rtc.elevenlabs.io
};
```

## Custom ServerUrl Configuration

```typescript
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';

const ConversationScreen = () => {
  const conversation = useConversation({
    serverUrl: 'wss://custom.livekit.server.com', // Custom server
    onConnect: () => console.log('Connected to custom server'),
    onDisconnect: () => console.log('Disconnected'),
    onError: (error) => console.error('Error:', error),
  });

  const handleStart = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id'
    });
  };

  // Uses custom serverUrl
};
```

## Using Conversation Token Directly

```typescript
const conversation = useConversation({
  serverUrl: 'wss://your-livekit-server.com',
  onConnect: () => console.log('Connected'),
});

const handleStart = async () => {
  await conversation.startSession({
    conversationToken: 'your-pre-generated-token'
  });
};
```

## Current Status (Milestone 1 + ServerUrl Configuration)

✅ **ElevenLabsProvider** wraps LiveKitRoom with configurable serverUrl
✅ **useConversation** hook returns conversation object with status tracking
✅ **ServerUrl Configuration** via useConversation options
✅ **Token Generation** from ElevenLabs API (agentId) or direct token
✅ **Status Management** (disconnected → connecting → connected)
✅ **Callback Support** (onConnect, onDisconnect, onError, onDebug, onMessage)

**Ready for Milestone 2**: Actual LiveKit connection when startSession is called!