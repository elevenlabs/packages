# ElevenLabs React Library

An SDK library for using ElevenLabs in React based applications. If you're looking for a Node.js library, please refer to the [ElevenLabs Node.js Library](https://www.npmjs.com/package/elevenlabs).

> Note that this library is launching to primarily support Conversational AI. The support for speech synthesis and other more generic use cases is planned for the future.

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/elevenlabsio/icon?icon=twitter&label)](https://twitter.com/elevenlabsio)

## Installation

Install the package in your project through package manager.

```shell
npm install @11labs/react
# or
yarn add @11labs/react
# or
pnpm install @11labs/react
```

## Usage

### useConversation

React hook for managing websocket connection and audio usage for ElevenLabs Conversational AI.

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
- **onConnect** - handler called when the conversation websocket connection is established.
- **onDisconnect** - handler called when the conversation websocket connection is ended.
- **onMessage** - handler called when a new message is received. These can be tentative or final transcriptions of user voice, replies produced by LLM, or debug message when a debug option is enabled.
- **onError** - handler called when a error is encountered.

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
  },
});
```

#### Prefer Headphones for iOS Devices

While this SDK leaves the choice of audio input/output device to the browser/system, iOS Safari seem to prefer the built-in speaker over headphones even when bluetooth device is in use. If you want to "force" the use of headphones on iOS devices when available, you can use the following option. Please, keep in mind that this is not guaranteed, since this functionality is not provided by the browser. System audio should be the default choice.

```ts
const conversation = useConversation({
  preferHeadphonesForIosDevices: true,
});
```

#### Methods

##### startConversation

`startConversation` method kick off the websocket connection and starts using microphone to communicate with the ElevenLabs Conversational AI agent.  
The method accepts options object, with the `url` or `agentId` option being required.

Agent ID can be acquired through [ElevenLabs UI](https://elevenlabs.io/app/conversational-ai) and is always necessary.

```js
const conversation = useConversation();
const conversationId = await conversation.startSession({ url });
```

For the public agents, define `agentId` - no signed link generation necessary.

In case the conversation requires authorization, use the REST API to generate signed links. Use the signed link as a `url` parameter.

`startSession` returns promise resolving to `conversationId`. The value is a globally unique conversation ID you can use to identify separate conversations.

```js
// your server
const requestHeaders: HeadersInit = new Headers();
requestHeaders.set("xi-api-key", process.env.XI_API_KEY); // use your ElevenLabs API key

const response = await fetch(
    "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id={{agent id created through ElevenLabs UI}}",
    {
      method: "GET",
      headers: requestHeaders,
    }
);

if (!response.ok) {
    return Response.error();
}

const body = await response.json();
const url = body.signed_url; // use this URL for startConversation method.
```

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

##### setVolume

A method to set the output volume of the conversation. Accepts object with volume field between 0 and 1.

```js
await conversation.setVolume({ volume: 0.5 });
```

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

## Development

Please, refer to the README.md file in the root of this repository.

## Contributing

Please, create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
