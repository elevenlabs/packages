# ElevenLabs JavaScript Client Library

An SDK library for using ElevenLabs in browser based applications. If you're looking for a Node.js library, please refer to the [ElevenLabs Node.js Library](https://www.npmjs.com/package/elevenlabs).

> Note that this library is launching to primarily support Conversational AI. The support for speech synthesis and other more generic use cases is planned for the future.

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)

## Installation

Install the package in your project through package manager.

```shell
npm install @11labs/client
# or
yarn add @11labs/client
# or
pnpm install @11labs/client
```

## Usage

This library is primarily meant for development in vanilla JavaScript projects, or as a base for libraries tailored to specific frameworks.
It is recommended to check whether your specific framework has it's own library.
However, you can use this library in any JavaScript-based project.

### Initialize conversation

First, initialize the Conversation instance:

```js
const conversation = await Conversation.startSession(options);
```

This will kick off the websocket connection and start using microphone to communicate with the ElevenLabs Conversational AI agent. Consider explaining and allowing microphone access in your apps UI before the Conversation kicks off. The microphone may also be blocked for the current page by default, resulting in the allow prompt not showing up at all. You should handle such use case in your application and display appropriate message to the user:

```js
// call after explaning to the user why the microphone access is needed
// handle errors and show appropriate message to the user
try {
  await navigator.mediaDevices.getUserMedia();
} catch {
  // handle error
}
```

#### Session configuration

The options passed to `startSession` specifiy how the session is established. There are two ways to start a session:

##### Using Agent ID

Agent ID can be acquired through [ElevenLabs UI](https://elevenlabs.io/app/conversational-ai).
For public agents, you can use the ID directly:

```js
const conversation = await Conversation.startSession({
  agentId: "<your-agent-id>",
});
```

##### Using a signed URL

If the conversation requires authorization, you will need to add a dedicated endpoint to your server that
will request a signed url using the [ElevenLabs API](https://elevenlabs.io/docs/introduction) and pass it back to the client.

Here's an example of how it could be set up:

```js
// Node.js server

app.get("/signed-url", yourAuthMiddleware, async (req, res) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.AGENT_ID}`,
    {
      method: "GET",
      headers: {
        // Requesting a signed url requires your ElevenLabs API key
        // Do NOT expose your API key to the client!
        "xi-api-key": process.env.XI_API_KEY,
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

const conversation = await Conversation.startSession({ signedUrl });
```

#### Optional callbacks

The options passed to `startSession` can also be used to register optional callbacks:

- **onConnect** - handler called when the conversation websocket connection is established.
- **onDisconnect** - handler called when the conversation websocket connection is ended.
- **onMessage** - handler called when a new text message is received. These can be tentative or final transcriptions of user voice, replies produced by LLM. Primarily used for handling conversation transcription.
- **onError** - handler called when an error is encountered.
- **onStatusChange** - handler called whenever connection status changes. Can be `connected`, `connecting` and `disconnected` (initial).
- **onModeChange** - handler called when a status changes, eg. agent switches from `speaking` to `listening`, or the other way around.
- **onCanSendFeedbackChange** - handler called when sending feedback becomes available or unavailable.

#### Client Tools

Client tools are a way to enabled agent to invoke client-side functionality. This can be used to trigger actions in the client, such as opening a modal or doing an API call on behalf of the user.

Client tools definition is an object of functions, and needs to be identical with your configuration within the [ElevenLabs UI](https://elevenlabs.io/app/conversational-ai), where you can name and describe different tools, as well as set up the parameters passed by the agent.

```ts
const conversation = await Conversation.startSession({
  clientTools: {
    displayMessage: async (parameters: { text: string }) => {
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
const conversation = await Conversation.startSession({
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
  },
});
```

#### Prefer Headphones for iOS Devices

While this SDK leaves the choice of audio input/output device to the browser/system, iOS Safari seem to prefer the built-in speaker over headphones even when bluetooth device is in use. If you want to "force" the use of headphones on iOS devices when available, you can use the following option. Please, keep in mind that this is not guaranteed, since this functionality is not provided by the browser. System audio should be the default choice.

```ts
const conversation = await Conversation.startSession({
  preferHeadphonesForIosDevices: true,
});
```

#### Connection delay

You can configure additional delay between when the microphone is activated and when the connection is established.
On Android, the delay is set to 3 seconds by default to make sure the device has time to switch to the correct audio mode.
Without it, you may experience issues with the beginning of the first message being cut off.

```ts
const conversation = await Conversation.startSession({
  connectionDelay: {
    android: 3_000,
    ios: 0,
    default: 0,
  },
});
```

#### Return value

`startSession` returns a `Conversation` instance that can be used to control the session. The method will throw an error if the session cannot be established. This can happen if the user denies microphone access, or if the websocket connection
fails.

##### endSession

A method to manually end the conversation. The method will end the conversation and disconnect from websocket.
Afterwards the conversation instance will be unusable and can be safely discarded.

```js
await conversation.endSession();
```

##### sendFeedback

A method for sending binary feedback to the agent.
The method accepts a boolean value, where `true` represents positive feedback and `false` negative feedback.
Feedback is always correlated to the most recent agent response and can be sent only once per response.
You can listen to `onCanSendFeedbackChange` to know if feedback can be sent at the given moment.

```js
conversation.sendFeedback(true);
```

##### getId

A method returning the conversation ID.

```js
const id = conversation.geId();
```

##### setVolume

A method to set the output volume of the conversation. Accepts object with volume field between 0 and 1.

```js
await conversation.setVolume({ volume: 0.5 });
```

##### getInputVolume / getOutputVolume

Methods that return the current input/output volume on a scale from `0` to `1` where `0` is -100 dB and `1` is -30 dB.

```js
const inputVolume = await conversation.getInputVolume();
const outputVolume = await conversation.getOutputVolume();
```

##### getInputByteFrequencyData / getOutputByteFrequencyData

Methods that return `Uint8Array`s containg the current input/output frequency data. See [AnalyserNode.getByteFrequencyData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData) for more information.

## Development

Please, refer to the README.md file in the root of this repository.

## Contributing

Please, create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
