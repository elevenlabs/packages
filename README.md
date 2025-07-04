# ElevenLabs JavaScript SDK

<div align="center">
  <img src="https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683" alt="ElevenLabs Logo" width="200">
  
  <h3>Build voice-enabled applications with cutting-edge AI</h3>
  
  [![npm version](https://img.shields.io/npm/v/@elevenlabs/client.svg?style=flat-square)](https://www.npmjs.com/package/@elevenlabs/client)
  [![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
  [![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)
  [![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
</div>

---

## 🎯 Overview

The ElevenLabs JavaScript SDK provides a seamless interface for integrating advanced voice AI capabilities into your web applications. Built with modern architecture patterns and optimized for both **WebSocket** and **WebRTC** connections, this SDK enables real-time conversational AI experiences with minimal setup.

### Key Features

- 🚀 **Dual Connection Modes**: Choose between WebSocket (low-latency) and WebRTC (ultra-low-latency) based on your needs
- 🎙️ **Real-time Voice Conversations**: Enable natural, flowing conversations with AI agents
- 🔧 **Client-side Tools**: Allow AI agents to trigger actions in your application
- 📦 **Framework Support**: Native React hooks and vanilla JavaScript support
- 🔒 **Enterprise-ready**: Built-in authentication, error handling, and production-grade reliability
- 🎨 **Customizable**: Override agent behavior, voice settings, and conversation parameters on-the-fly

## 📚 Documentation

### Quick Links
- [Installation](#-installation)
- [Getting Started](#-getting-started)
- [Architecture Overview](#-architecture-overview)
- [API Reference](#-api-reference)
- [Examples](#-examples)
- [Contributing](#-contributing)

## 📦 Installation

```bash
# For vanilla JavaScript projects
npm install @elevenlabs/client

# For React applications
npm install @elevenlabs/react

# Using yarn
yarn add @elevenlabs/client
# or
yarn add @elevenlabs/react

# Using pnpm
pnpm add @elevenlabs/client
# or
pnpm add @elevenlabs/react
```

## 🚀 Getting Started

### Basic Usage (Vanilla JavaScript)

```javascript
import { Conversation } from '@elevenlabs/client';

// Initialize a conversation with a public agent
const conversation = await Conversation.startSession({
  agentId: 'your-agent-id',
  connectionType: 'webrtc', // or 'websocket'
});

// Set up event handlers
conversation.on('message', (message) => {
  console.log('Received:', message);
});

conversation.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// End the conversation when done
await conversation.endSession();
```

### React Usage

```jsx
import { useConversation } from '@elevenlabs/react';

function VoiceChat() {
  const conversation = useConversation();
  
  const startChat = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id',
      connectionType: 'webrtc',
    });
  };
  
  return (
    <button onClick={startChat}>
      {conversation.status === 'connected' ? 'End Chat' : 'Start Chat'}
    </button>
  );
}
```

## 🏗️ Architecture Overview

### SDK Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Application                      │
├─────────────────────────────────────────────────────────────┤
│                    @elevenlabs/react (React)                 │
│                              OR                              │
│                  @elevenlabs/client (Vanilla JS)             │
├─────────────────────────────────────────────────────────────┤
│                      Connection Layer                        │
│  ┌─────────────────────┐    ┌────────────────────────┐     │
│  │  WebSocket Manager  │    │    WebRTC Manager      │     │
│  │  - Reliable         │    │    - Ultra-low latency │     │
│  │  - Auto-reconnect   │    │    - P2P when possible │     │
│  └─────────────────────┘    └────────────────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                     ElevenLabs Platform                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │ Conversational  │  │  Speech         │  │   Agent    │  │
│  │      AI         │  │  Synthesis      │  │   Config   │  │
│  └─────────────────┘  └─────────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Connection Types

Our SDK supports two connection types, each optimized for different use cases:

#### WebSocket Connection (Default)
- **Latency**: ~300-500ms
- **Best for**: General conversational AI, standard voice interactions
- **Protocol**: Secure WebSocket (WSS)
- **Audio Format**: PCM 16kHz or μ-law 8kHz

#### WebRTC Connection
- **Latency**: ~100-200ms  
- **Best for**: Real-time conversations, interactive voice response
- **Protocol**: WebRTC with ICE/STUN/TURN
- **Audio Format**: Opus codec, adaptive bitrate

### Choosing the Right Connection

```javascript
// WebSocket - Standard conversations
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionType: 'websocket',
});

// WebRTC - Ultra-low latency requirements  
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  connectionType: 'webrtc',
});
```

### Authentication Flows

#### Public Agents
No authentication required - perfect for demos and public-facing applications.

```javascript
const conversation = await Conversation.startSession({
  agentId: 'public-agent-id',
});
```

#### Private Agents (WebSocket)
Secure your agents with server-side authentication:

```javascript
// Server-side: Generate signed URL
app.get('/api/signed-url', authenticate, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    }
  );
  
  const { signed_url } = await response.json();
  res.json({ signed_url });
});

// Client-side: Use signed URL
const { signed_url } = await fetch('/api/signed-url').then(r => r.json());
const conversation = await Conversation.startSession({
  signedUrl: signed_url,
});
```

#### Private Agents (WebRTC)
For WebRTC connections, use conversation tokens:

```javascript
// Server-side: Generate conversation token
app.get('/api/conversation-token', authenticate, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${AGENT_ID}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    }
  );
  
  const { token } = await response.json();
  res.json({ token });
});

// Client-side: Use conversation token
const { token } = await fetch('/api/conversation-token').then(r => r.json());
const conversation = await Conversation.startSession({
  conversationToken: token,
  connectionType: 'webrtc',
});
```

## 🔧 API Reference

### Conversation Methods

#### `startSession(options)`
Initiates a new conversation session.

```typescript
interface SessionOptions {
  // Authentication (one required)
  agentId?: string;
  signedUrl?: string;          // WebSocket auth
  conversationToken?: string;   // WebRTC auth
  
  // Connection
  connectionType?: 'websocket' | 'webrtc';
  
  // Callbacks
  onConnect?: () => void;
  onDisconnect?: (reason: DisconnectionDetails) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: Status) => void;
  onModeChange?: (mode: 'listening' | 'speaking') => void;
  
  // Advanced Options
  clientTools?: ClientTools;
  overrides?: ConversationOverrides;
  textOnly?: boolean;
  useWakeLock?: boolean;
  connectionDelay?: DelayConfig;
}
```

#### `endSession()`
Gracefully terminates the current conversation.

```javascript
await conversation.endSession();
```

#### `sendUserMessage(text)`
Send a text message to the agent (alternative to voice input).

```javascript
conversation.sendUserMessage("Hello, how can you help me?");
```

#### `sendFeedback(isPositive)`
Provide feedback on the agent's last response.

```javascript
conversation.sendFeedback(true);  // Positive feedback
conversation.sendFeedback(false); // Negative feedback
```

#### `setVolume(options)`
Adjust the output volume (0.0 to 1.0).

```javascript
conversation.setVolume({ volume: 0.8 });
```

#### `setMicMuted(muted)`
Mute or unmute the microphone.

```javascript
conversation.setMicMuted(true);  // Mute
conversation.setMicMuted(false); // Unmute
```

### Client Tools

Enable your AI agent to interact with your application:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  clientTools: {
    searchDatabase: async ({ query }) => {
      const results = await myDatabase.search(query);
      return { results };
    },
    
    updateUI: async ({ component, data }) => {
      myApp.updateComponent(component, data);
      return "UI updated successfully";
    },
    
    scheduleAppointment: async ({ date, time }) => {
      const booking = await calendar.schedule({ date, time });
      return { confirmationId: booking.id };
    }
  }
});
```

### Conversation Overrides

Dynamically customize agent behavior:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  overrides: {
    agent: {
      prompt: {
        prompt: "You are a helpful medical assistant. Always maintain patient confidentiality."
      },
      firstMessage: "Hello! I'm your medical assistant. How can I help you today?",
      language: "en"
    },
    tts: {
      voiceId: "custom-voice-id"
    },
    conversation: {
      textOnly: false
    }
  }
});
```

## 📱 Platform-Specific Configurations

### iOS Optimization
```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  preferHeadphonesForIosDevices: true,
  connectionDelay: {
    ios: 0,
    android: 3000,
    default: 0
  }
});
```

### Wake Lock Management
Keep the screen active during conversations:

```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  useWakeLock: true  // Default: true
});
```

## 🎨 Examples

### Customer Service Bot
```javascript
const conversation = await Conversation.startSession({
  agentId: 'customer-service-agent',
  connectionType: 'webrtc',
  clientTools: {
    lookupOrder: async ({ orderId }) => {
      const order = await api.getOrder(orderId);
      return order;
    },
    processRefund: async ({ orderId, amount }) => {
      const refund = await api.createRefund(orderId, amount);
      return { refundId: refund.id, status: 'processed' };
    }
  }
});
```

### Interactive Voice Response (IVR)
```javascript
const conversation = await Conversation.startSession({
  agentId: 'ivr-agent',
  connectionType: 'webrtc',
  overrides: {
    agent: {
      prompt: {
        prompt: "Guide users through menu options efficiently. Speak clearly and wait for responses."
      }
    }
  }
});
```

## 🛠️ Development

### Setting Up the Monorepo

```bash
# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### Package Structure

```
packages/
├── client/          # Core JavaScript SDK
├── react/           # React hooks and components
├── convai-widget-core/    # Embeddable conversation widget
└── convai-widget-embed/   # Widget embedding utilities
```

### Creating a New Package

```bash
pnpm run create --name=my-new-package
```

## 🚀 Publishing

Packages are published automatically via GitHub Actions when creating a new release:

1. Update version in `package.json`
2. Create a GitHub release with tag format: `package-name@version`
3. GitHub Actions will handle the rest

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [ElevenLabs Platform](https://elevenlabs.io)
- [API Documentation](https://elevenlabs.io/docs)
- [Discord Community](https://discord.gg/elevenlabs)
- [Status Page](https://status.elevenlabs.io)

---

<div align="center">
  Made with ❤️ by the ElevenLabs team
</div>

