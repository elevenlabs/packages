# ElevenLabs JavaScript Client SDK

An ergonomic, **browser-first** SDK for building voice-enabled, Conversational-AI experiences with [ElevenLabs](https://elevenlabs.io/).  
Designed to feel as familiar as `navigator.getUserMedia` while giving you production-grade primitives that scale from a weekend hack to a Fortune-500 app.

> Looking for React hooks? – See [`@elevenlabs/react`](https://www.npmjs.com/package/@elevenlabs/react).  
> Need server-side TTS or speech-to-speech? – Checkout the [ElevenLabs Node.js SDK](https://www.npmjs.com/package/elevenlabs).

---

## Table of contents

1. [Installation](#installation)  
2. [Quick start](#quick-start)  
3. [Connection types](#connection-types) – WebSocket vs WebRTC  
4. [Starting a session](#starting-a-session)  
5. [Runtime APIs](#runtime-apis)  
6. [Advanced configuration](#advanced-configuration)  
7. [Best practices & gotchas](#best-practices--gotchas)  
8. [FAQ](#faq)  
9. [Contributing](#contributing)

---

## Installation

```bash
# with npm
yarn add @elevenlabs/client
# or
npm install @elevenlabs/client
# or
pnpm add @elevenlabs/client
```

The package ships as ESM (with accompanying type declarations) and works in every modern evergreen browser.

---

## Quick start

```js
import { Conversation } from "@elevenlabs/client";

(async () => {
  /* 1. Politely ask for microphone access */
  await navigator.mediaDevices.getUserMedia({ audio: true });

  /* 2. Spin-up a session with a **public** Conversational-AI agent */
  const convo = await Conversation.startSession({
    agentId: "your-agent-id",      // grab from the ElevenLabs UI
    connectionType: "webrtc",     // or "websocket" – WebRTC is recommended
  });

  /* 3. Listen for messages */
  convo.sendUserMessage("Hello there! How's it going?");

  convo.sendFeedback(true); // 👍

  // close gracefully when you are done
  await convo.endSession();
})();
```

See [Starting a session](#starting-a-session) for private / authenticated agents.

---

## Connection types

|                    | WebRTC *(recommended)* | WebSocket |
|--------------------|------------------------|-----------|
| Audio transport    | Real-time media track  | Binary chunks |
| Latency            | ≈ 200–300 ms           | ≈ 400–800 ms |
| NAT traversal      | ✅ (via TURN/STUN)     | ❌ |
| Browser support    | All modern browsers    | All modern browsers |
| When to choose     | Natural, full-duplex conversations | Simpler integration, serverless demos |

Switching is trivial – set `connectionType` to `"webrtc"` or `"websocket"`.

```ts
const session = await Conversation.startSession({
  agentId: "...",
  connectionType: "webrtc", // or "websocket"
});
```

> Behind the scenes WebRTC uses the [LiveKit](https://livekit.io/) SFU. Use `livekitUrl` to point to a self-hosted deployment.

---

## Starting a session

### 1. Public agents (no auth)

```ts
const convo = await Conversation.startSession({
  agentId: "your-agent-id",
  connectionType: "webrtc", // "websocket" also works
});
```

### 2. Private agents (auth required)

**WebSocket – signed URL**

```ts
// server (Node.js / Cloud-Function)
app.get("/signed-url", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY; // NEVER expose on the client

  const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.AGENT_ID}`;
  const response = await fetch(url, { headers: { "xi-api-key": apiKey } });

  if (!response.ok) return res.status(500).send("Could not fetch signed URL");
  const { signed_url } = await response.json();
  res.send(signed_url);
});
```

```ts
// client
const signedUrl = await (await fetch("/signed-url")).text();
const convo = await Conversation.startSession({
  signedUrl,
  connectionType: "websocket",
});
```

**WebRTC – conversation token**

```ts
// server
app.get("/conversation-token", async (req, res) => {
  const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${process.env.AGENT_ID}`;
  const resp = await fetch(url, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY } });
  if (!resp.ok) return res.status(500).send("Could not fetch token");
  const { token } = await resp.json();
  res.send(token);
});
```

```ts
// client
const token = await (await fetch("/conversation-token")).text();
const convo = await Conversation.startSession({
  conversationToken: token,
  connectionType: "webrtc",
});
```

### Callbacks & lifecycle hooks

```ts
await Conversation.startSession({
  agentId: "...",
  onConnect: ({ conversationId }) => console.log("️🎙️ connected", conversationId),
  onMessage: ({ source, message }) => console.log(source, message),
  onDisconnect: ({ reason }) => console.log("🔌 disconnected", reason),
  onError: (msg) => console.error("🚨", msg),
});
```

See [Runtime APIs](#runtime-apis) for **every** callback.

---

## Runtime APIs

Below is the complete surface area of a `Conversation` instance.  Methods are **stable** and backwards-compatible within the same major version.

### Session control

| Method | Description |
|--------|-------------|
| `endSession()` | Gracefully shuts down the transport and releases media resources. |
| `getId()` | Returns the unique conversation ID (string). |
| `isOpen()` | `true` if the session is currently connected. |

### Messaging & feedback

| Method | Description |
|--------|-------------|
| `sendUserMessage(text)` | Send a text message that is treated as normal user input by the agent. |
| `sendContextualUpdate(text)` | Provide out-of-band context (does **not** trigger a response). |
| `sendUserActivity()` | Notify the agent that the user is active (e.g. typing) – prevents interruptions for 2 s. |
| `sendFeedback(like)` | Binary feedback (`true` = 👍) for the **last** agent response. |
| `sendMCPToolApprovalResult(toolCallId, isApproved)` | Resolve a Moderated Content Policy (MCP) tool call. |

### Audio & device control

| Method | Description |
|--------|-------------|
| `setMicMuted(isMuted)` | Mute / un-mute the user microphone. |
| `setVolume({ volume })` | Control **output** gain (0–1). |
| `getInputVolume()`/`getOutputVolume()` | Smoothed RMS volume in the 0–1 range. |
| `getInputByteFrequencyData()`/`getOutputByteFrequencyData()` | Raw FFT data from an `AnalyserNode`. |

### WebRTC extras

| Method | Description |
|--------|-------------|
| `getRoom()` *(on WebRTC connections)* | Returns the underlying [LiveKit Room](https://docs.livekit.io/client-sdk-js/) for advanced scenarios. |

---

## Advanced configuration

All fields are optional unless stated otherwise.

```ts
await Conversation.startSession({
  /*  Required  */
  agentId: "...",              // or signedUrl / conversationToken
  connectionType: "webrtc",    // "websocket" by default

  /*  Transport  */
  authorization: "jwt-or-bearer-token",
  origin: "wss://my-proxy.example.com",
  livekitUrl: "wss://rtc.example.com", // self-hosted LiveKit

  /*  UX tweaks  */
  textOnly: false,
  preferHeadphonesForIosDevices: true,
  connectionDelay: { android: 3000, default: 0 },
  useWakeLock: true,

  /*  Dynamic overrides (per-session)  */
  overrides: {
    agent: {
      prompt: { prompt: "You are a helpful assistant." },
      firstMessage: "Hi! Ask me anything",
      language: "en",
    },
    tts: { voiceId: "my-brand-voice" },
    conversation: { textOnly: true },
  },

  /*  Inject variables usable from the LLM */
  dynamicVariables: {
    user_name: "Ada",
    plan: "pro",
  },
});
```

---

## Best practices & gotchas

1. **Request mic permissions proactively** – browsers will queue audio **only** after the user grants access which might clip the first words otherwise.
2. **Keep the tab awake** – the SDK automatically acquires a [Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) (when supported). Disable via `useWakeLock: false`.
3. **Handle network changes** – resume or restart a session when `navigator.onLine` flips or the user changes Wi-Fi.
4. **Prefer WebRTC** on mobile – significantly better echo cancellation and full-duplex performance.
5. **Throttle UI updates** – the `onMessage` stream can fire rapidly for tentative transcripts. Debounce expensive re-renders.

---

## FAQ

<details>
<summary>Does the SDK work on Node.js?</summary>

No – this package is optimised for the browser. For server-side use-cases (TTS, speech-to-speech, etc.) use the [official Node.js SDK](https://www.npmjs.com/package/elevenlabs).
</details>

<details>
<summary>Can I bring my own WebSocket server?</summary>

Yes. Point `origin` to your proxy that eventually forwards to `wss://api.elevenlabs.io`. Make sure to preserve the **sub-protocols** sent by the SDK.
</details>

<details>
<summary>Is the audio encrypted?</summary>

Absolutely – both WebSocket (WSS) and WebRTC (DTLS-SRTP) are fully encrypted in transit.
</details>

---

## Contributing

Pull-requests are welcome! Please open an issue first to discuss your change.  
By submitting a PR you agree that your contributions are licensed under the MIT license included in this repo.

---

Built with 💜 by the ElevenLabs team.
