# @elevenlabs/client

The official JavaScript client library for ElevenLabs [Conversational AI](https://elevenlabs.io/conversational-ai).

<div align="center">
  <img src="https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683" alt="ElevenLabs Logo" width="150">
  
  [![npm version](https://img.shields.io/npm/v/@elevenlabs/client.svg?style=flat-square)](https://www.npmjs.com/package/@elevenlabs/client)
  [![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
  [![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)
</div>

> **Looking for React?** Check out [@elevenlabs/react](https://www.npmjs.com/package/@elevenlabs/react) for React hooks and components.

> **Looking for Node.js?** Check out the [ElevenLabs Node.js Library](https://www.npmjs.com/package/elevenlabs) for server-side speech synthesis.

## 🚀 Quick Start

```bash
npm install @elevenlabs/client
```

```javascript
import { Conversation } from '@elevenlabs/client';

// Start a conversation with a public agent
const conversation = await Conversation.startSession({
  agentId: 'your-agent-id',
  connectionType: 'webrtc' // or 'websocket'
});

// The agent is now listening and will respond to your speech
```

## 📖 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Basic Usage](#-basic-usage)
- [Connection Types](#-connection-types)
- [Authentication](#-authentication)
- [Advanced Features](#-advanced-features)
- [API Reference](#-api-reference)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

- 🎯 **Simple, intuitive API** - Get started in minutes
- 🚀 **Two connection modes** - WebSocket for reliability, WebRTC for ultra-low latency
- 🔐 **Flexible authentication** - Support for both public and private agents
- 🛠️ **Client tools** - Let agents interact with your application
- 🎮 **Full conversation control** - Mute, unmute, adjust volume, send text
- 📊 **Real-time feedback** - Know when the agent is speaking or listening
- 🌐 **Cross-platform** - Works in all modern browsers

## 📦 Installation

```bash
# Using npm
npm install @elevenlabs/client

# Using yarn
yarn add @elevenlabs/client

# Using pnpm
pnpm add @elevenlabs/client
```

## 🎯 Basic Usage

### Starting a Conversation

```javascript
import { Conversation } from '@elevenlabs/client';

async function startVoiceChat() {
  // Request microphone permission first
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    console.error('Microphone access denied');
    return;
  }

  // Start the conversation
  const conversation = await Conversation.startSession({
    agentId: 'your-agent-id', // Get this from https://elevenlabs.io/app/conversational-ai
    connectionType: 'webrtc', // 'websocket' or 'webrtc' (defaults to 'websocket')
    
    // Optional callbacks
    onConnect: () => console.log('Connected!'),
    onDisconnect: (reason) => console.log('Disconnected:', reason),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
    onStatusChange: (status) => console.log('Status:', status),
    onModeChange: (mode) => console.log('Mode:', mode), // 'speaking' or 'listening'
  });

  // The conversation is now active!
  // The agent is listening and will respond when you speak
  
  // End the conversation when done
  // await conversation.endSession();
}
```

## 🔌 Connection Types

### WebSocket Connection (Default)
- **Latency**: ~300-500ms round trip
- **Reliability**: Excellent, with automatic reconnection
- **Use cases**: Most conversational AI applications
- **Audio format**: PCM 16000Hz or μ-law 8000Hz

### WebRTC Connection
- **Latency**: ~100-200ms round trip
- **Reliability**: Good, peer-to-peer when possible  
- **Use cases**: Real-time applications requiring minimal delay
- **Audio format**: Opus codec with adaptive bitrate

```javascript
// WebSocket (default)
const wsConversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionType: 'websocket'
});

// WebRTC
const rtcConversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionType: 'webrtc'
});
```

## 🔐 Authentication

### Public Agents
No authentication required - perfect for demos and public-facing applications:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'your-public-agent-id'
});
```

### Private Agents

#### WebSocket Authentication
Use signed URLs for secure WebSocket connections:

```javascript
// Server-side - Generate a signed URL
app.get('/api/signed-url', authenticate, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY // Never expose this client-side!
      }
    }
  );
  
  const data = await response.json();
  res.json({ signedUrl: data.signed_url });
});

// Client-side - Use the signed URL
const { signedUrl } = await fetch('/api/signed-url').then(r => r.json());

const conversation = await Conversation.startSession({
  signedUrl,
  connectionType: 'websocket'
});
```

#### WebRTC Authentication
Use conversation tokens for secure WebRTC connections:

```javascript
// Server-side - Generate a conversation token
app.get('/api/conversation-token', authenticate, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${AGENT_ID}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY // Never expose this client-side!
      }
    }
  );
  
  const data = await response.json();
  res.json({ token: data.token });
});

// Client-side - Use the conversation token
const { token } = await fetch('/api/conversation-token').then(r => r.json());

const conversation = await Conversation.startSession({
  conversationToken: token,
  connectionType: 'webrtc'
});
```

## 🛠️ Advanced Features

### Client Tools

Enable your agent to trigger actions in your application:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  clientTools: {
    displayMessage: async (parameters) => {
      // Show a message to the user
      alert(parameters.text);
      return "Message displayed successfully";
    },
    
    updateShoppingCart: async (parameters) => {
      // Add item to cart
      const { itemId, quantity } = parameters;
      await cart.addItem(itemId, quantity);
      return { success: true, cartTotal: cart.getTotal() };
    },
    
    searchProducts: async (parameters) => {
      // Search your database
      const results = await db.search(parameters.query);
      return { products: results };
    }
  }
});
```

> **Important**: Client tools must be configured in the [ElevenLabs UI](https://elevenlabs.io/app/conversational-ai) with matching names and parameters.

### Conversation Overrides

Dynamically customize agent behavior:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  overrides: {
    agent: {
      prompt: {
        prompt: "You are a helpful assistant for a medical practice. Be professional and empathetic."
      },
      firstMessage: "Hello! I'm here to help you schedule your appointment.",
      language: "en"
    },
    tts: {
      voiceId: "custom-voice-id" // Optional: Use a specific voice
    },
    conversation: {
      textOnly: false // Set to true for text-only mode
    }
  }
});
```

### Text-Only Mode

For chat-based interactions without voice:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  textOnly: true // No microphone required
});

// Send text messages
conversation.sendUserMessage("Hello, can you help me?");
```

### Platform-Specific Settings

#### iOS Audio Optimization
```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  preferHeadphonesForIosDevices: true // Prefer headphones over speaker on iOS
});
```

#### Connection Delay (Android Audio Fix)
```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionDelay: {
    android: 3000, // 3-second delay on Android to ensure audio is ready
    ios: 0,
    default: 0
  }
});
```

#### Wake Lock
Keep the screen on during conversations:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  useWakeLock: true // Default: true
});
```

## 📚 API Reference

### `Conversation.startSession(options)`

Starts a new conversation session.

#### Options

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentId` | string | Yes* | Your agent ID from ElevenLabs |
| `signedUrl` | string | Yes* | Signed URL for WebSocket auth |
| `conversationToken` | string | Yes* | Token for WebRTC auth |
| `connectionType` | 'websocket' \| 'webrtc' | No | Connection type (default: 'websocket') |
| `clientTools` | object | No | Client-side functions the agent can call |
| `overrides` | object | No | Override agent configuration |
| `textOnly` | boolean | No | Enable text-only mode |
| `useWakeLock` | boolean | No | Keep screen on (default: true) |
| `connectionDelay` | object | No | Platform-specific delays |
| `preferHeadphonesForIosDevices` | boolean | No | iOS audio routing preference |
| `onConnect` | function | No | Called when connected |
| `onDisconnect` | function | No | Called when disconnected |
| `onMessage` | function | No | Called for each message |
| `onError` | function | No | Called on errors |
| `onStatusChange` | function | No | Called on status changes |
| `onModeChange` | function | No | Called when switching between listening/speaking |
| `onCanSendFeedbackChange` | function | No | Called when feedback availability changes |

*One of `agentId`, `signedUrl`, or `conversationToken` is required

#### Returns

Returns a `Promise<Conversation>` instance.

### Conversation Methods

#### `endSession()`
Ends the current conversation and disconnects.

```javascript
await conversation.endSession();
```

#### `sendUserMessage(text)`
Sends a text message to the agent.

```javascript
conversation.sendUserMessage("What's the weather like?");
```

#### `sendFeedback(isPositive)`
Provides feedback on the last agent response.

```javascript
conversation.sendFeedback(true);  // 👍
conversation.sendFeedback(false); // 👎
```

#### `setVolume({ volume })`
Sets the output volume (0.0 to 1.0).

```javascript
await conversation.setVolume({ volume: 0.8 });
```

#### `setMicMuted(muted)`
Mutes or unmutes the microphone.

```javascript
conversation.setMicMuted(true);  // Mute
conversation.setMicMuted(false); // Unmute
```

#### `sendContextualUpdate(text)`
Sends contextual information without interrupting the conversation.

```javascript
conversation.sendContextualUpdate("User navigated to checkout page");
```

#### `sendUserActivity()`
Signals user activity to prevent agent interruption.

```javascript
// Call when user is typing
input.addEventListener('input', () => {
  conversation.sendUserActivity();
});
```

#### `getId()`
Gets the unique conversation ID.

```javascript
const conversationId = conversation.getId();
```

#### `getInputVolume()` / `getOutputVolume()`
Gets current volume levels (0.0 to 1.0).

```javascript
const inputVolume = await conversation.getInputVolume();
const outputVolume = await conversation.getOutputVolume();
```

#### `getInputByteFrequencyData()` / `getOutputByteFrequencyData()`
Gets frequency data for visualizations.

```javascript
const inputFrequencies = await conversation.getInputByteFrequencyData();
const outputFrequencies = await conversation.getOutputByteFrequencyData();
```

## 💡 Examples

### Customer Support Agent

```javascript
const conversation = await Conversation.startSession({
  agentId: 'support-agent-id',
  connectionType: 'webrtc',
  clientTools: {
    // Look up order status
    checkOrderStatus: async ({ orderId }) => {
      const order = await database.getOrder(orderId);
      return {
        status: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery
      };
    },
    
    // Create support ticket
    createTicket: async ({ issue, priority }) => {
      const ticket = await supportSystem.createTicket({
        issue,
        priority,
        conversationId: conversation.getId()
      });
      return { ticketId: ticket.id };
    }
  },
  overrides: {
    agent: {
      prompt: {
        prompt: "You are a helpful customer support agent. Always be polite and professional."
      },
      firstMessage: "Hello! I'm here to help with your order. How can I assist you today?"
    }
  }
});
```

### Interactive Voice Menu

```javascript
const conversation = await Conversation.startSession({
  agentId: 'ivr-agent-id',
  connectionType: 'webrtc',
  clientTools: {
    navigateMenu: async ({ option }) => {
      switch (option) {
        case 'billing':
          await showBillingInfo();
          break;
        case 'technical':
          await connectToTechSupport();
          break;
        case 'sales':
          await connectToSales();
          break;
      }
      return `Navigated to ${option}`;
    }
  }
});
```

### Multi-language Assistant

```javascript
const conversation = await Conversation.startSession({
  agentId: 'multilingual-agent-id',
  overrides: {
    agent: {
      language: navigator.language.startsWith('es') ? 'es' : 'en'
    }
  }
});
```

## 🔧 Troubleshooting

### Common Issues

#### Microphone Access Denied
Always request microphone permission before starting a conversation:

```javascript
try {
  await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (error) {
  // Handle permission denied
  alert('Microphone access is required for voice conversations');
}
```

#### WebRTC Connection Failed
WebRTC requires proper STUN/TURN server configuration. The SDK uses ElevenLabs' default servers, but you can specify custom ones:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionType: 'webrtc',
  livekitUrl: 'wss://your-custom-livekit-server.com' // Optional
});
```

#### Audio Cutting Out on Android
Use the connection delay to ensure audio is ready:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionDelay: {
    android: 3000 // 3-second delay
  }
});
```

## 🤝 Contributing

Please see the main [repository README](https://github.com/elevenlabs/elevenlabs-js) for contribution guidelines.

## 📄 License

MIT - see [LICENSE](LICENSE) for details.
