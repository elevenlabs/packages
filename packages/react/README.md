![hero](../../assets/hero.png)

# ElevenLabs Agents React SDK

Build multimodal agents with the [ElevenLabs Agents platform](https://elevenlabs.io/docs/agents-platform/overview).

An SDK library for using ElevenLabs Agents. If you're looking for a Node.js library for other audio APIs, please refer to the [ElevenLabs Node.js Library](https://www.npmjs.com/package/@elevenlabs/elevenlabs-js).

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)

## Installation

Install the package in your project through package manager.

```shell
npm install @elevenlabs/react
# or
yarn add @elevenlabs/react
# or
pnpm install @elevenlabs/react
```

## Usage

### useConversation

React hook for managing WebSocket and WebRTC connections and audio usage for ElevenLabs Conversational AI.

#### Initialize conversation

First, initialize the Conversation instance.

```tsx
const conversation = useConversation();
```

Note that Conversational AI requires microphone access.
Consider explaining and allowing microphone access in your apps UI before the Conversation kicks off. The microphone may also be blocked for the current page by default, resulting in the allow prompt not showing up at all. You should handle such use case in your application and display appropriate message to the user:

```js
// call after explaning to the user why the microphone access is needed
// handle errors and show appropriate message to the user
try {
  await navigator.mediaDevices.getUserMedia();
} catch {
  // handle error
}
```

#### Options

The Conversation can be initialized with certain options. Those are all optional.

```tsx
const conversation = useConversation({
  /* options object */
});
```

- **clientTools** - object definition for client tools that can be invoked by agent. [See below](#client-tools) for details.
- **overrides** - object definition conversations settings overrides. [See below](#conversation-overrides) for details.
- **textOnly** - whether the conversation should run in text-only mode. [See below](#text-only) for details.
- **onConnect** - handler called when the conversation connection is established.
- **onDisconnect** - handler called when the conversation connection has ended.
- **onMessage** - handler called when a new message is received. These can be tentative or final transcriptions of user voice, replies produced by LLM, or debug message when a debug option is enabled.
- **onError** - handler called when a error is encountered.
- **onStatusChange** - handler called whenever connection status changes. Can be `connected`, `connecting` and `disconnected` (initial).
- **onModeChange** - handler called when a status changes, eg. agent switches from `speaking` to `listening`, or the other way around.
- **onCanSendFeedbackChange** - handler called when sending feedback becomes available or unavailable.
- **onUnhandledClientToolCall** - handler called when a client tool is invoked but no corresponding client tool was defined.
- **onDebug** - handler called for debugging events, including tentative agent responses and internal events. Useful for development and troubleshooting.
- **onAudio** - handler called when audio data is received from the agent. Provides access to raw audio events for custom processing.
- **onInterruption** - handler called when the conversation is interrupted, typically when the user starts speaking while the agent is talking.
- **onVadScore** - handler called with voice activity detection scores, indicating the likelihood of speech in the audio input.
- **onMCPToolCall** - handler called when an MCP (Model Context Protocol) tool is invoked by the agent.
- **onMCPConnectionStatus** - handler called when the MCP connection status changes, useful for monitoring MCP server connectivity.
- **onAgentToolRequest** - handler called when the agent begins tool execution.
- **onAgentToolResponse** - handler called when the agent receives a response from a tool execution.
- **onConversationMetadata** - handler called with conversation initiation metadata, providing information about the conversation setup.
- **onAsrInitiationMetadata** - handler called with ASR (Automatic Speech Recognition) initiation metadata, containing configuration details for speech recognition.

##### Client Tools

Client tools are a way to enabled agent to invoke client-side functionality. This can be used to trigger actions in the client, such as opening a modal or doing an API call on behalf of the user.

Client tools definition is an object of functions, and needs to be identical with your configuration within the [ElevenLabs UI](https://elevenlabs.io/app/conversational-ai), where you can name and describe different tools, as well as set up the parameters passed by the agent.

```ts
const conversation = useConversation({
  clientTools: {
    displayMessage: (parameters: { text: string }) => {
      alert(text);

      return "Message displayed";
    },
  },
});
```

In case function returns a value, it will be passed back to the agent as a response.
Note that the tool needs to be explicitly set to be blocking conversation in ElevenLabs UI for the agent to await and react to the response, otherwise agent assumes success and continues the conversation.

#### Conversation overrides

You may choose to override various settings of the conversation and set them dynamically based other user interactions.
We support overriding various settings.
These settings are optional and can be used to customize the conversation experience.
The following settings are available:

```ts
const conversation = useConversation({
  overrides: {
    agent: {
      prompt: {
        prompt: "My custom prompt",
      },
      firstMessage: "My custom first message",
      language: "en",
    },
    tts: {
      voiceId: "custom voice id",
    },
    conversation: {
      textOnly: true,
    },
  },
});
```

#### User identification

You can optionally pass a user ID to identify the user in the conversation. This can be your own customer identifier. This will be included in the conversation initiation data sent to the server:

Tracking this ID can be helpful for filtering conversations, tracking analytics on a user level, etc.

```ts
// Or pass it when starting the session
const conversationId = await conversation.startSession({
  agentId: "<your-agent-id>",
  userId: "user-123",
  connectionType: "webrtc",
});
```

#### Text only

If your agent is configured to run in text-only mode, i.e. it does not send or receive audio messages,
you can use this flag to use a lighter version of the conversation. In that case, the
user will not be asked for microphone permissions and no audio context will be created.

```ts
const conversation = useConversation({
  textOnly: true,
});
```

#### Prefer Headphones for iOS Devices

While this SDK leaves the choice of audio input/output device to the browser/system, iOS Safari seem to prefer the built-in speaker over headphones even when bluetooth device is in use. If you want to "force" the use of headphones on iOS devices when available, you can use the following option. Please, keep in mind that this is not guaranteed, since this functionality is not provided by the browser. System audio should be the default choice.

```ts
const conversation = useConversation({
  preferHeadphonesForIosDevices: true,
});
```

#### Connection delay

You can configure additional delay between when the microphone is activated and when the connection is established.
On Android, the delay is set to 3 seconds by default to make sure the device has time to switch to the correct audio mode.
Without it, you may experience issues with the beginning of the first message being cut off.

```ts
const conversation = useConversation({
  connectionDelay: {
    android: 3_000,
    ios: 0,
    default: 0,
  },
});
```

#### Acquiring a Wake Lock

By default, the conversation will attempt to acquire a [wake lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) to prevent the device from going to sleep during the conversation.
This can be disabled by setting the `useWakeLock` option to `false`:

```ts
const conversation = useConversation({
  useWakeLock: false,
});
```

#### Data Residency

The React SDK supports data residency for compliance with regional regulations. You can specify the server location when initializing the conversation:

```ts
const conversation = useConversation({
  serverLocation: "eu-residency", // "us", "global", "eu-residency", or "in-residency"
});
```

Available locations:

- `"us"` (default) - United States servers
- `"global"` - Global servers (same as US)
- `"eu-residency"` - European Union residency servers
- `"in-residency"` - India residency servers

The SDK automatically routes both WebSocket and WebRTC connections to the appropriate regional servers based on your selection. This ensures that all conversation data, including audio streams, remain within the specified geographic region.

#### Methods

##### startConversation

`startConversation` method kicks off the WebSocket or WebRTC connection and starts using the microphone to communicate with the ElevenLabs Conversational AI agent. The method accepts an options object, with the `signedUrl`, `conversationToken` or `agentId` option being required.

Agent ID can be acquired through [ElevenLabs UI](https://elevenlabs.io/app/conversational-ai) and is always necessary.

```js
const conversation = useConversation();

// For public agents, pass in the agent ID and the connection type
const conversationId = await conversation.startSession({
  agentId: "<your-agent-id>",
  connectionType: "webrtc", // either 'webrtc' or 'websocket'
});
```

For public agents (i.e. agents that don't have authentication enabled), define `agentId` - no signed link generation necessary.

In case the conversation requires authorization, use the REST API to generate signed links for a WebSocket connection or a conversation token for a WebRTC connection.

`startSession` returns promise resolving to `conversationId`. The value is a globally unique conversation ID you can use to identify separate conversations.

For WebSocket connections:

```js
// Node.js server

app.get("/signed-url", yourAuthMiddleware, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.AGENT_ID}`,
    {
      headers: {
        // Requesting a signed url requires your ElevenLabs API key
        // Do NOT expose your API key to the client!
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    }
  );

  if (!response.ok) {
    return res.status(500).send("Failed to get signed URL");
  }

  const body = await response.json();
  res.send(body.signed_url);
});
```

```js
// Client

const response = await fetch("/signed-url", yourAuthHeaders);
const signedUrl = await response.text();

const { conversation } = useConversation();

const conversationId = await conversation.startSession({
  signedUrl,
  connectionType: "websocket",
});
```

For WebRTC connections:

```js
// Node.js server

app.get("/conversation-token", yourAuthMiddleware, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${process.env.AGENT_ID}`,
    {
      headers: {
        // Requesting a conversation token requires your ElevenLabs API key
        // Do NOT expose your API key to the client!
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      }
    }
  );

  if (!response.ok) {
    return res.status(500).send("Failed to get conversation token");
  }

  const body = await response.json();
  res.send(body.token);
);
```

```js
// Client

const response = await fetch("/conversation-token", yourAuthHeaders);
const conversationToken = await response.text();

const { conversation } = useConversation();

const conversationId = await conversation.startSession({
  conversationToken,
  connectionType: "webrtc",
});
```

You can provide a device ID to start the conversation using the input/output device of your choice. If the device ID is invalid, the default input and output devices will be used.

```js
const { conversation } = useConversation();

const conversationId = await conversation.startSession({
  conversationToken,
  connectionType: "webrtc",
  inputDeviceId: "<new-input-device-id>",
  outputDeviceId: "<new-input-device-id>",
});
```

**Note:** Device switching only works for voice conversations. You can enumerate available devices using the [MediaDevices.enumerateDevices()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) API.

##### endSession

A method to manually end the conversation. The method will end the conversation and disconnect from websocket.

```js
await conversation.endSession();
```

##### sendFeedback

A method for sending binary feedback to the agent.
The method accepts a boolean value, where `true` represents positive feedback and `false` negative feedback.
Feedback is always correlated to the most recent agent response and can be sent only once per response.
Check `canSendFeedback` state to see if feedback can be sent in the given moment.

```js
const { sendFeedback } = useConversation();

sendFeedback(true); // positive feedback
sendFeedback(false); // negative feedback
```

##### sendContextualUpdate

A method to send contextual updates to the agent.
This can be used to inform the agent about user actions that are not directly related to the conversation, but may influence the agent's responses.

```js
const { sendContextualUpdate } = useConversation();

sendContextualUpdate(
  "User navigated to another page. Consider it for next response, but don't react to this contextual update."
);
```

##### sendUserMessage

Sends a text messages to the agent.

Can be used to let the user type in the message instead of using the microphone.
Unlike `sendContextualUpdate`, this will be treated as a user message and will prompt the agent to take its turn in the conversation.

```js
const { sendUserMessage, sendUserActivity } = useConversation();
const [value, setValue] = useState("");

return (
  <>
    <input
      value={value}
      onChange={e => {
        setValue(e.target.value);
        sendUserActivity();
      }}
    />
    <button
      onClick={() => {
        sendUserMessage(value);
        setValue(value);
      }}
    >
      SEND
    </button>
  </>
);
```

##### sendUserActivity

Notifies the agent about user activity.

The agent will not attempt to speak for at least 2 seconds after the user activity is detected.
This can be used to prevent the agent from interrupting the user when they are typing.

```js
const { sendUserMessage, sendUserActivity } = useConversation();
const [value, setValue] = useState("");

return (
  <>
    <input
      value={value}
      onChange={e => {
        setValue(e.target.value);
        sendUserActivity();
      }}
    />
    <button
      onClick={() => {
        sendUserMessage(value);
        setValue(value);
      }}
    >
      SEND
    </button>
  </>
);
```

##### setVolume

A method to set the output volume of the conversation. Accepts object with volume field between 0 and 1.

```js
const [volume, setVolume] = useState(0.5);
const conversation = useConversation({ volume });

// Set the volume
setVolume(0.5);
```

##### muteMic

A method to mute/unmute the microphone.

```js
const [micMuted, setMicMuted] = useState(false);
const conversation = useConversation({ micMuted });

// Mute the microphone
setMicMuted(true);

// Unmute the microphone
setMicMuted(false);
```

##### changeInputDevice

Switch the audio input device during an active voice conversation. This method is only available for voice conversations.

**Note:** In WebRTC mode the input format and sample rate are hardcoded to `pcm` and `48000` respectively. Changing those values when changing the input device is a no-op.

```js
// Change to a specific input device
await conversation.changeInputDevice({
  sampleRate: 16000,
  format: "pcm",
  preferHeadphonesForIosDevices: true,
  inputDeviceId: "your-device-id", // Optional: specific device ID
});
```

##### changeOutputDevice

Switch the audio output device during an active voice conversation. This method is only available for voice conversations.

**Note:** In WebRTC mode the output format and sample rate are hardcoded to `pcm` and `48000` respectively. Changing those values when changing the output device is a no-op.

```js
// Change to a specific output device
await conversation.changeOutputDevice({
  sampleRate: 16000,
  format: "pcm",
  outputDeviceId: "your-device-id", // Optional: specific device ID
});
```

**Note:** Device switching only works for voice conversations. If no specific `deviceId` is provided, the browser will use its default device selection. You can enumerate available devices using the [MediaDevices.enumerateDevices()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) API.

##### getInputByteFrequencyData / getOutputByteFrequencyData

Methods that return `Uint8Array`s containing the current input/output frequency data. See [AnalyserNode.getByteFrequencyData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData) for more information.

**Note:** These methods are only available for voice conversations. In WebRTC mode the audio is hardcoded to use `pcm_48000`, meaning any visualization using the returned data might show different patterns to WebSocket connections.

##### status

A React state containing the current status of the conversation.

```js
const { status } = useConversation();
console.log(status); // "connected" or "disconnected"
```

##### isSpeaking

A React state containing the information of whether the agent is currently speaking.
This is helpful for indicating the mode in your UI.

```js
const { isSpeaking } = useConversation();
console.log(isSpeaking); // boolean
```

##### canSendFeedback

A React state representing whether the user can send feedback to the agent.
When false, calls to `sendFeedback` will be ignored.
This is helpful to conditionally show the feedback button in your UI.

```js
const { canSendFeedback } = useConversation();
console.log(canSendFeedback); // boolean
```

### useScribe

React hook for managing real-time speech-to-text transcription with ElevenLabs Scribe Realtime v2.

#### Quick Start

```tsx
import { useScribe } from "@elevenlabs/react";

function MyComponent() {
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      console.log("Partial:", data.text);
    },
    onCommittedTranscript: (data) => {
      console.log("Committed:", data.text);
    },
  });

  const handleStart = async () => {
    const token = await fetchTokenFromServer();
    await scribe.connect({
      token,
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  };

  return (
    <div>
      <button onClick={handleStart} disabled={scribe.isConnected}>
        Start Recording
      </button>
      <button onClick={scribe.disconnect} disabled={!scribe.isConnected}>
        Stop
      </button>

      {scribe.partialTranscript && <p>Live: {scribe.partialTranscript}</p>}

      <div>
        {scribe.committedTranscripts.map((t) => (
          <p key={t.id}>{t.text}</p>
        ))}
      </div>
    </div>
  );
}
```

#### Getting a Token

Scribe requires a single-use token for authentication. Create an API endpoint on your server:

```js
// Node.js server
app.get("/scribe-token", yourAuthMiddleware, async (req, res) => {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    }
  );

  const data = await response.json();
  res.json({ token: data.token });
});
```

**Warning:** Your ElevenLabs API key is sensitive, do not leak it to the client. Always generate the token on the server.

```tsx
// Client
const fetchToken = async () => {
  const response = await fetch("/scribe-token");
  const { token } = await response.json();
  return token;
};
```

#### Hook Options

Configure the hook with default options and callbacks:

```tsx
const scribe = useScribe({
  // Connection options (can be overridden in connect())
  token: "optional-default-token",
  modelId: "scribe_v2_realtime",
  baseUri: "wss://api.elevenlabs.io",

  // VAD options
  commitStrategy: CommitStrategy.AUTOMATIC,
  vadSilenceThresholdSecs: 0.5,
  vadThreshold: 0.5,
  minSpeechDurationMs: 100,
  minSilenceDurationMs: 500,
  languageCode: "en",

  // Microphone options (for automatic mode)
  microphone: {
    deviceId: "optional-device-id",
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },

  // Manual audio options (for file transcription)
  audioFormat: AudioFormat.PCM_16000,
  sampleRate: 16000,

  // Auto-connect on mount
  autoConnect: false,

  // Event callbacks
  onSessionStarted: () => console.log("Session started"),
  onPartialTranscript: (data) => console.log("Partial:", data.text),
  onCommittedTranscript: (data) => console.log("Committed:", data.text),
  onCommittedTranscriptWithTimestamps: (data) => console.log("With timestamps:", data),
  onError: (error) => console.error("Error:", error),
  onAuthError: (data) => console.error("Auth error:", data.error),
  onQuotaExceededError: (data) => console.error("Quota exceeded:", data.error),
  onConnect: () => console.log("Connected"),
  onDisconnect: () => console.log("Disconnected"),
});
```

#### Microphone Mode

Stream audio directly from the user's microphone:

```tsx
function MicrophoneTranscription() {
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
  });

  const startRecording = async () => {
    const token = await fetchToken();
    await scribe.connect({
      token,
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  };

  return (
    <div>
      <button onClick={startRecording} disabled={scribe.isConnected}>
        {scribe.status === "connecting" ? "Connecting..." : "Start"}
      </button>
      <button onClick={scribe.disconnect} disabled={!scribe.isConnected}>
        Stop
      </button>

      {scribe.partialTranscript && (
        <div>
          <strong>Speaking:</strong> {scribe.partialTranscript}
        </div>
      )}

      {scribe.committedTranscripts.map((transcript) => (
        <div key={transcript.id}>{transcript.text}</div>
      ))}
    </div>
  );
}
```

#### Manual Audio Mode (File Transcription)

Transcribe pre-recorded audio files:

```tsx
import { useScribe, AudioFormat } from "@elevenlabs/react";

function FileTranscription() {
  const [file, setFile] = useState<File | null>(null);
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: 16000,
  });

  const transcribeFile = async () => {
    if (!file) return;

    const token = await fetchToken();
    await scribe.connect({ token });

    // Decode audio file
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to PCM16
    const channelData = audioBuffer.getChannelData(0);
    const pcmData = new Int16Array(channelData.length);

    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i] = sample < 0 ? sample * 32768 : sample * 32767;
    }

    // Send in chunks
    const chunkSize = 4096;
    for (let offset = 0; offset < pcmData.length; offset += chunkSize) {
      const chunk = pcmData.slice(offset, offset + chunkSize);
      const bytes = new Uint8Array(chunk.buffer);
      const base64 = btoa(String.fromCharCode(...bytes));

      scribe.sendAudio(base64);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Commit transcription
    scribe.commit();
  };

  return (
    <div>
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={transcribeFile} disabled={!file || scribe.isConnected}>
        Transcribe
      </button>

      {scribe.committedTranscripts.map((transcript) => (
        <div key={transcript.id}>{transcript.text}</div>
      ))}
    </div>
  );
}
```

#### Hook Return Values

##### State

- **status** - Current connection status: `"disconnected"`, `"connecting"`, `"connected"`, `"transcribing"`, or `"error"`
- **isConnected** - Boolean indicating if connected
- **isTranscribing** - Boolean indicating if actively transcribing
- **partialTranscript** - Current partial (interim) transcript
- **committedTranscripts** - Array of completed transcript segments
- **error** - Current error message, or null

```tsx
const scribe = useScribe(/* options */);

console.log(scribe.status); // "connected"
console.log(scribe.isConnected); // true
console.log(scribe.partialTranscript); // "hello world"
console.log(scribe.committedTranscripts); // [{ id: "...", text: "...", words: ..., isFinal: true }]
console.log(scribe.error); // null or error string
```

##### Methods

###### connect(options?)

Connect to Scribe. Options provided here override hook defaults:

```tsx
await scribe.connect({
  token: "your-token", // Required
  microphone: { /* ... */ }, // For microphone mode
  // OR
  audioFormat: AudioFormat.PCM_16000, // For manual mode
  sampleRate: 16000,
});
```

###### disconnect()

Disconnect and clean up resources:

```tsx
scribe.disconnect();
```

###### sendAudio(audioBase64, options?)

Send audio data (manual mode only):

```tsx
scribe.sendAudio(base64AudioChunk, {
  commit: false, // Optional: commit immediately
  sampleRate: 16000, // Optional: override sample rate
  previousText: "Previous transcription text", // Optional: include text from a previous transcription or base64 encoded audio data. Will be used to provide context to the model. Can only be sent in the first audio chunk.
});
```

**Warning:** The `previousText` field can only be sent in the first audio chunk of a session. If sent in any other chunk an error will be returned.

###### commit()

Manually commit the current transcription:

```tsx
scribe.commit();
```

###### clearTranscripts()

Clear all transcripts from state:

```tsx
scribe.clearTranscripts();
```

###### getConnection()

Get the underlying connection instance:

```tsx
const connection = scribe.getConnection();
// Returns RealtimeConnection | null
```

#### Transcript Segment Type

Each committed transcript segment has the following structure:

```typescript
interface TranscriptSegment {
  id: string; // Unique identifier
  text: string; // Transcript text
  timestamp: number; // Unix timestamp
  isFinal: boolean; // Always true for committed transcripts
}
```

#### Event Callbacks

All event callbacks are optional and can be provided as hook options:

```tsx
const scribe = useScribe({
  onSessionStarted: () => {
    console.log("Session started");
  },
  onPartialTranscript: (data: { text: string }) => {
    console.log("Partial:", data.text);
  },
  onCommittedTranscript: (data: { text: string }) => {
    console.log("Committed:", data.text);
  },
  onCommittedTranscriptWithTimestamps: (data: {
    text: string;
    words?: { start: number; end: number }[];
  }) => {
    console.log("Text:", data.text);
    console.log("Word timestamps:", data.words);
  },
  // Generic error handler for all errors
  onError: (error: Error | Event) => {
    console.error("Scribe error:", error);
  },
  // Specific errors can also be tracked
  onAuthError: (data: { error: string }) => {
    console.error("Auth error:", data.error);
  },
  onConnect: () => {
    console.log("WebSocket opened");
  },
  onDisconnect: () => {
    console.log("WebSocket closed");
  },
});
```

#### Commit Strategies

Control when transcriptions are committed:

```tsx
import { CommitStrategy } from "@elevenlabs/react";

// Manual (default) - you control when to commit
const scribe = useScribe({
  commitStrategy: CommitStrategy.MANUAL,
});

// Later...
scribe.commit(); // Commit transcription

// Voice Activity Detection - model detects silences and automatically commits
const scribe = useScribe({
  commitStrategy: CommitStrategy.VAD,
});
```

#### Complete Example

```tsx
import { useScribe, AudioFormat, CommitStrategy } from "@elevenlabs/react";
import { useState } from "react";

function ScribeDemo() {
  const [mode, setMode] = useState<"microphone" | "file">("microphone");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.AUTOMATIC,
    onSessionStarted: () => console.log("Started"),
    onCommittedTranscript: (data) => console.log("Committed:", data.text),
    onError: (error) => console.error("Error:", error),
  });

  const startMicrophone = async () => {
    const token = await fetchToken();
    await scribe.connect({
      token,
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
  };

  return (
    <div>
      <h1>Scribe Demo</h1>

      {/* Status */}
      <div>
        Status: {scribe.status}
        {scribe.error && <span>Error: {scribe.error}</span>}
      </div>

      {/* Controls */}
      <div>
        {!scribe.isConnected ? (
          <button onClick={startMicrophone}>Start Recording</button>
        ) : (
          <button onClick={scribe.disconnect}>Stop</button>
        )}
        <button onClick={scribe.clearTranscripts}>Clear</button>
      </div>

      {/* Live Transcript */}
      {scribe.partialTranscript && (
        <div>
          <strong>Live:</strong> {scribe.partialTranscript}
        </div>
      )}

      {/* Committed Transcripts */}
      <div>
        <h2>Transcripts ({scribe.committedTranscripts.length})</h2>
        {scribe.committedTranscripts.map((t) => (
          <div key={t.id}>
            <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
            <p>{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### TypeScript Support

Full TypeScript types are included:

```typescript
import {
  useScribe,
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
  type UseScribeReturn,
  type ScribeHookOptions,
  type ScribeStatus,
  type TranscriptSegment,
  type RealtimeConnection,
} from "@elevenlabs/react";

const scribe: UseScribeReturn = useScribe({
  modelId: "scribe_v2_realtime",
  microphone: {
    echoCancellation: true,
  },
});
```

## CSP compliance

If your application has a tight Content Security Policy and does not allow data: or blob: in the `script-src` (w3.org/TR/CSP2#source-list-guid-matching), you self-host the needed files in the public folder.

Whitelisting these values is not recommended w3.org/TR/CSP2#source-list-guid-matching.

Add the worklet files to your public folder eg `public/elevenlabs`.

```
@elevenlabs/client/scripts/
```

Then call start with

```ts
      await conversation.startSession({
...
        workletPaths: {
          'rawAudioProcessor': '/elevenlabs/rawAudioProcessor.worklet.js',
          'audioConcatProcessor':
            '/elevenlabs/audioConcatProcessor.worklet.js',
        },
      });
```

It is recommended to update the scripts with a build script like

```js
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { createRequire } from 'node:module';
import path from 'path';

const require = createRequire(import.meta.url);

export default {
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: require.resolve('@elevenlabs/client')/dist/worklets/audioConcatProcessor.js',
          dest: 'dist',
        },
        {
          src: require.resolve('@elevenlabs/client')/dist/worklets/rawAudioProcessor.js',
          dest: 'dist',
        },
      ],
    }),
  ],
}
```

## Development

Please, refer to the README.md file in the root of this repository.

## Contributing

Please, create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
