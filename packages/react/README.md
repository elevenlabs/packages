# @elevenlabs/react

React hooks and components for ElevenLabs [Conversational AI](https://elevenlabs.io/conversational-ai).

<div align="center">
  <img src="https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683" alt="ElevenLabs Logo" width="150">
  
  [![npm version](https://img.shields.io/npm/v/@elevenlabs/react.svg?style=flat-square)](https://www.npmjs.com/package/@elevenlabs/react)
  [![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
  [![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)
</div>

> **Looking for vanilla JavaScript?** Check out [@elevenlabs/client](https://www.npmjs.com/package/@elevenlabs/client) for non-React applications.

> **Looking for Node.js?** Check out the [ElevenLabs Node.js Library](https://www.npmjs.com/package/elevenlabs) for server-side speech synthesis.

## 🚀 Quick Start

```bash
npm install @elevenlabs/react
```

```jsx
import { useConversation } from '@elevenlabs/react';

function VoiceChat() {
  const conversation = useConversation();
  
  const startChat = async () => {
    await conversation.startSession({
      agentId: 'your-agent-id',
      connectionType: 'webrtc' // or 'websocket'
    });
  };
  
  return (
    <>
      <button onClick={startChat}>
        {conversation.status === 'connected' ? 'End Chat' : 'Start Chat'}
      </button>
      {conversation.isSpeaking && <p>Agent is speaking...</p>}
    </>
  );
}
```

## 📖 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Basic Usage](#-basic-usage)
- [Connection Types](#-connection-types)
- [Authentication](#-authentication)
- [React Hook API](#-react-hook-api)
- [Advanced Features](#-advanced-features)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

- 🪝 **React Hooks** - Simple, declarative API for React applications
- 🎯 **Full TypeScript Support** - Complete type safety and IntelliSense
- 🚀 **WebRTC & WebSocket** - Choose your connection type based on latency needs
- 🔐 **Secure Authentication** - Support for both public and private agents
- 🛠️ **Client Tools** - Let agents interact with your React app
- 📊 **Real-time State** - Track conversation status, speaking state, and more
- 🎮 **Full Control** - Mute, unmute, adjust volume, send text messages

## 📦 Installation

```bash
# Using npm
npm install @elevenlabs/react

# Using yarn
yarn add @elevenlabs/react

# Using pnpm
pnpm add @elevenlabs/react
```

## 🎯 Basic Usage

### Simple Voice Chat Component

```jsx
import { useConversation } from '@elevenlabs/react';

function VoiceAssistant() {
  const {
    status,
    isSpeaking,
    startSession,
    endSession,
    sendUserMessage,
  } = useConversation();

  const handleStart = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation
      await startSession({
        agentId: 'your-agent-id',
        connectionType: 'webrtc',
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  return (
    <div>
      <h2>Voice Assistant</h2>
      <p>Status: {status}</p>
      {isSpeaking && <p>🔊 Agent is speaking...</p>}
      
      {status === 'connected' ? (
        <button onClick={endSession}>End Conversation</button>
      ) : (
        <button onClick={handleStart}>Start Conversation</button>
      )}
    </div>
  );
}
```

## 🔌 Connection Types

The SDK supports two connection types, each optimized for different use cases:

### WebSocket Connection (Default)
- **Latency**: ~300-500ms round trip
- **Reliability**: Excellent, with automatic reconnection
- **Best for**: Most conversational AI applications

### WebRTC Connection
- **Latency**: ~100-200ms round trip
- **Reliability**: Good, peer-to-peer when possible
- **Best for**: Real-time applications requiring minimal delay

```jsx
// WebSocket connection
await startSession({
  agentId: 'agent-id',
  connectionType: 'websocket'
});

// WebRTC connection  
await startSession({
  agentId: 'agent-id',
  connectionType: 'webrtc'
});
```

## 🔐 Authentication

### Public Agents

For public agents, simply provide the agent ID:

```jsx
const conversation = useConversation();

await conversation.startSession({
  agentId: 'your-public-agent-id'
});
```

### Private Agents

#### WebSocket Authentication

```jsx
// Server-side: Generate signed URL
app.get('/api/signed-url', authenticate, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    }
  );
  
  const data = await response.json();
  res.json({ signedUrl: data.signed_url });
});

// React component
function PrivateVoiceChat() {
  const conversation = useConversation();
  
  const startPrivateChat = async () => {
    const { signedUrl } = await fetch('/api/signed-url').then(r => r.json());
    
    await conversation.startSession({
      signedUrl,
      connectionType: 'websocket'
    });
  };
  
  return <button onClick={startPrivateChat}>Start Private Chat</button>;
}
```

#### WebRTC Authentication

```jsx
// Server-side: Generate conversation token
app.get('/api/conversation-token', authenticate, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${AGENT_ID}`,
    {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    }
  );
  
  const data = await response.json();
  res.json({ token: data.token });
});

// React component
function SecureWebRTCChat() {
  const conversation = useConversation();
  
  const startSecureChat = async () => {
    const { token } = await fetch('/api/conversation-token').then(r => r.json());
    
    await conversation.startSession({
      conversationToken: token,
      connectionType: 'webrtc'
    });
  };
  
  return <button onClick={startSecureChat}>Start Secure Chat</button>;
}
```

## 🪝 React Hook API

### `useConversation(options?)`

The main React hook for managing conversations.

#### Options

```typescript
interface ConversationOptions {
  // Client-side functions the agent can call
  clientTools?: ClientTools;
  
  // Override agent configuration
  overrides?: {
    agent?: {
      prompt?: { prompt?: string };
      firstMessage?: string;
      language?: string;
    };
    tts?: {
      voiceId?: string;
    };
    conversation?: {
      textOnly?: boolean;
    };
  };
  
  // Text-only mode (no audio)
  textOnly?: boolean;
  
  // Platform-specific settings
  preferHeadphonesForIosDevices?: boolean;
  connectionDelay?: {
    android?: number;
    ios?: number;
    default?: number;
  };
  useWakeLock?: boolean;
  
  // Event callbacks
  onConnect?: () => void;
  onDisconnect?: (details: DisconnectionDetails) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: Error) => void;
}
```

#### Return Value

```typescript
interface ConversationReturn {
  // State
  status: 'connected' | 'connecting' | 'disconnected';
  isSpeaking: boolean;
  canSendFeedback: boolean;
  
  // Methods
  startSession: (options: SessionOptions) => Promise<string>;
  endSession: () => Promise<void>;
  sendUserMessage: (text: string) => void;
  sendFeedback: (isPositive: boolean) => void;
  sendContextualUpdate: (text: string) => void;
  sendUserActivity: () => void;
  setVolume: ({ volume: number }) => void;
  getInputVolume: () => number;
  getOutputVolume: () => number;
  getId: () => string | undefined;
}
```

## 🛠️ Advanced Features

### Client Tools

Enable your agent to interact with your React application:

```jsx
function InteractiveChat() {
  const [cartItems, setCartItems] = useState([]);
  
  const conversation = useConversation({
    clientTools: {
      addToCart: async ({ productId, quantity }) => {
        // Update React state
        setCartItems(prev => [...prev, { productId, quantity }]);
        return { success: true, cartSize: cartItems.length + 1 };
      },
      
      showProductDetails: async ({ productId }) => {
        // Navigate or update UI
        window.location.hash = `#product/${productId}`;
        return "Product details displayed";
      },
      
      searchProducts: async ({ query }) => {
        const results = await api.searchProducts(query);
        return { products: results };
      }
    }
  });
  
  // ... rest of component
}
```

### Real-time Feedback

```jsx
function FeedbackExample() {
  const { canSendFeedback, sendFeedback } = useConversation();
  
  return (
    <div>
      {canSendFeedback && (
        <div>
          <button onClick={() => sendFeedback(true)}>👍</button>
          <button onClick={() => sendFeedback(false)}>👎</button>
        </div>
      )}
    </div>
  );
}
```

### Text Input with Voice

```jsx
function HybridChat() {
  const [message, setMessage] = useState('');
  const { 
    status,
    sendUserMessage,
    sendUserActivity,
    isSpeaking 
  } = useConversation();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && status === 'connected') {
      sendUserMessage(message);
      setMessage('');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          sendUserActivity(); // Prevents agent interruption
        }}
        placeholder="Type a message..."
        disabled={status !== 'connected'}
      />
      <button type="submit" disabled={status !== 'connected' || isSpeaking}>
        Send
      </button>
    </form>
  );
}
```

### Volume Control

```jsx
function VolumeControl() {
  const [volume, setVolumeState] = useState(0.8);
  const { setVolume } = useConversation();
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolumeState(newVolume);
    setVolume({ volume: newVolume });
  };
  
  return (
    <div>
      <label>
        Volume: {Math.round(volume * 100)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
        />
      </label>
    </div>
  );
}
```

### Mute Control

```jsx
function MuteButton() {
  const [isMuted, setIsMuted] = useState(false);
  const conversation = useConversation({ micMuted: isMuted });
  
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
  };
  
  return (
    <button onClick={toggleMute}>
      {isMuted ? '🔇 Unmute' : '🎤 Mute'}
    </button>
  );
}
```

## 💡 Examples

### Complete Voice Assistant

```jsx
import { useState, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';

function VoiceAssistant() {
  const [messages, setMessages] = useState([]);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  
  const conversation = useConversation({
    onMessage: (message) => {
      setMessages(prev => [...prev, message]);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    },
    clientTools: {
      updateUI: async ({ component, data }) => {
        // Update specific UI components based on agent instructions
        console.log('Updating', component, 'with', data);
        return "UI updated successfully";
      }
    }
  });
  
  useEffect(() => {
    // Check microphone permission on mount
    navigator.permissions.query({ name: 'microphone' }).then(result => {
      setIsPermissionGranted(result.state === 'granted');
    });
  }, []);
  
  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsPermissionGranted(true);
    } catch (error) {
      alert('Microphone permission is required for voice chat');
    }
  };
  
  const handleStart = async () => {
    if (!isPermissionGranted) {
      await requestPermission();
    }
    
    await conversation.startSession({
      agentId: 'your-agent-id',
      connectionType: 'webrtc',
      overrides: {
        agent: {
          firstMessage: "Hello! How can I assist you today?"
        }
      }
    });
  };
  
  return (
    <div className="voice-assistant">
      <div className="status-bar">
        <span>Status: {conversation.status}</span>
        {conversation.isSpeaking && <span className="speaking-indicator">🔊</span>}
      </div>
      
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>
      
      <div className="controls">
        {conversation.status === 'connected' ? (
          <>
            <MuteButton />
            <VolumeControl />
            <button onClick={conversation.endSession}>End Chat</button>
          </>
        ) : (
          <button onClick={handleStart}>Start Voice Chat</button>
        )}
      </div>
      
      {conversation.canSendFeedback && <FeedbackButtons />}
    </div>
  );
}
```

### Customer Support Widget

```jsx
function CustomerSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);
  
  const conversation = useConversation({
    clientTools: {
      lookupOrder: async ({ orderId }) => {
        const order = await api.getOrder(orderId);
        setOrderInfo(order);
        return order;
      },
      
      processRefund: async ({ orderId, amount, reason }) => {
        const refund = await api.createRefund({ orderId, amount, reason });
        return { 
          success: true, 
          refundId: refund.id,
          message: `Refund of $${amount} processed successfully`
        };
      }
    },
    overrides: {
      agent: {
        prompt: {
          prompt: "You are a helpful customer support agent. Be empathetic and solution-oriented."
        }
      }
    }
  });
  
  return (
    <div className={`support-widget ${isOpen ? 'open' : 'closed'}`}>
      {isOpen ? (
        <div className="chat-window">
          <header>
            <h3>Customer Support</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </header>
          
          <div className="chat-content">
            {conversation.status === 'disconnected' ? (
              <button onClick={() => conversation.startSession({ agentId: 'support-agent' })}>
                Start Support Chat
              </button>
            ) : (
              <>
                <div className="status">
                  {conversation.isSpeaking ? 'Agent is speaking...' : 'Listening...'}
                </div>
                {orderInfo && (
                  <div className="order-info">
                    <h4>Order #{orderInfo.id}</h4>
                    <p>Status: {orderInfo.status}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <button className="widget-trigger" onClick={() => setIsOpen(true)}>
          💬 Need Help?
        </button>
      )}
    </div>
  );
}
```

## 🔧 Troubleshooting

### Common Issues

#### Hooks Must Be Called Consistently
Remember that `useConversation` is a React hook and must follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks):

```jsx
// ❌ Wrong - conditional hook call
function MyComponent({ enabled }) {
  if (enabled) {
    const conversation = useConversation(); // Error!
  }
}

// ✅ Correct - hook at top level
function MyComponent({ enabled }) {
  const conversation = useConversation();
  
  if (enabled) {
    // Use conversation here
  }
}
```

#### Microphone Permission Handling

```jsx
function MicrophonePermissionHandler() {
  const [permissionState, setPermissionState] = useState('prompt');
  
  useEffect(() => {
    // Monitor permission changes
    navigator.permissions.query({ name: 'microphone' }).then(permission => {
      setPermissionState(permission.state);
      
      permission.addEventListener('change', () => {
        setPermissionState(permission.state);
      });
    });
  }, []);
  
  if (permissionState === 'denied') {
    return (
      <div className="permission-denied">
        <p>Microphone access is blocked. Please enable it in your browser settings.</p>
      </div>
    );
  }
  
  // ... rest of component
}
```

#### Cleanup on Unmount

The hook automatically cleans up when the component unmounts, but ensure you handle any ongoing operations:

```jsx
function ChatComponent() {
  const conversation = useConversation();
  
  useEffect(() => {
    return () => {
      // Any additional cleanup if needed
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
    };
  }, [conversation.status]);
  
  // ... rest of component
}
```

## 🤝 Contributing

Please see the main [repository README](https://github.com/elevenlabs/elevenlabs-js) for contribution guidelines.

## 📄 License

MIT - see [LICENSE](LICENSE) for details.
