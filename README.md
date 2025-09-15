![hero](assets/hero.png)

# ElevenLabs Agents SDK

Build multimodal agents with the [ElevenLabs Agents platform](https://elevenlabs.io/docs/agents-platform/overview). Our SDKs provide seamless integration with popular JavaScript/TypeScript frameworks, enabling you to create multimodal AI agents.

## Installation

```bash
npm install @elevenlabs/react
```

## Usage

```typescript
import { useConversation } from "@elevenlabs/react";

const conversation = useConversation({
  agentId: "your-agent-id",
});

// Start conversation
conversation.startSession();
```

## Overview

The ElevenLabs Agents SDKs provide a unified interface for integrating multimodal AI agents into your applications.

### Available Packages

| Package                                               | Description                                      | Version                                                                                                                               | Links                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`@elevenlabs/client`](#elevenlabsclient)             | Core TypeScript/JavaScript client                | [![npm](https://img.shields.io/npm/v/@elevenlabs/client)](https://www.npmjs.com/package/@elevenlabs/client)                           | [README](packages/client/README.md) • [Docs](https://elevenlabs.io/docs/agents-platform/libraries/java-script)        |
| [`@elevenlabs/react`](#elevenlabsreact)               | React hooks and components for web applications  | [![npm](https://img.shields.io/npm/v/@elevenlabs/react)](https://www.npmjs.com/package/@elevenlabs/react)                             | [README](packages/react/README.md) • [Docs](https://elevenlabs.io/docs/agents-platform/libraries/react)               |
| [`@elevenlabs/react-native`](#elevenlabsreact-native) | React Native SDK for cross-platform applications | [![npm](https://img.shields.io/npm/v/@elevenlabs/react-native)](https://www.npmjs.com/package/@elevenlabs/react-native)               | [README](packages/react-native/README.md) • [Docs](https://elevenlabs.io/docs/agents-platform/libraries/react-native) |
| [`@elevenlabs/convai-widget-core`](#widgets)          | Core widget library for embedding Agents         | [![npm](https://img.shields.io/npm/v/@elevenlabs/convai-widget-core)](https://www.npmjs.com/package/@elevenlabs/convai-widget-core)   | [Docs](https://elevenlabs.io/docs/agents-platform/customization/widget)                                               |
| [`@elevenlabs/convai-widget-embed`](#widgets)         | Pre-bundled embeddable widget                    | [![npm](https://img.shields.io/npm/v/@elevenlabs/convai-widget-embed)](https://www.npmjs.com/package/@elevenlabs/convai-widget-embed) | [Docs](https://elevenlabs.io/docs/agents-platform/customization/widget)                                               |
| [`@elevenlabs/convai-cli`](#agents-cli)               | CLI tool for managing agents as code             | [![npm](https://img.shields.io/npm/v/@elevenlabs/convai-cli)](https://www.npmjs.com/package/@elevenlabs/convai-cli)                   | [README](packages/convai-cli/README.md) • [Docs](https://elevenlabs.io/docs/agents-platform/libraries/agents-cli)     |

## Package Details

### @elevenlabs/client

The core TypeScript/JavaScript client provides the foundation for all ElevenLabs agent integrations.

#### Features

- **Real-time Communication**: WebRTC-based audio streaming for low-latency agent interactions
- **Event-driven Architecture**: Comprehensive event system for agent session lifecycle management
- **Client Tools**: Support for custom client-side tools and functions
- **Flexible Authentication**: Support for both public and private agent configurations
- **Audio Controls**: Fine-grained control over audio input/output devices

#### Installation

```bash
npm install @elevenlabs/client
```

### @elevenlabs/react

React hooks and components for building multimodal agents with React/Next.js

#### Installation

```bash
npm install @elevenlabs/react
```

### @elevenlabs/react-native

React Native SDK for building cross-platform mobile agents

#### Installation

```bash
npm install @elevenlabs/react-native

# Install peer dependencies
npm install @livekit/react-native @livekit/react-native-webrtc livekit-client
```

#### Platform Setup

##### iOS

Add the following to your `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to your microphone for voice agent interactions.</string>
```

##### Android

Add the following permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Widgets

The ElevenLabs Agents Widgets provide an easy way to embed AI agents into any website as a web component.

Learn how to embed the widget into your website [here](https://elevenlabs.io/docs/agents-platform/customization/widget).

### Agents CLI

The ElevenLabs Agents CLI allows you to manage your agents as code, with features like version control, templates, and multi-environment deployments.

#### Installation

```bash
# Global installation
npm install -g @elevenlabs/convai-cli
# or
pnpm install -g @elevenlabs/convai-cli

npx @elevenlabs/convai-cli init
# or
pnpm dlx @elevenlabs/convai-cli init
```

## Authentication

### Public Agents

For public agents, simply use the agent ID:

```typescript
const config = {
  agentId: "your-public-agent-id",
};
```

### Private Agents

For private agents, you'll need to generate a signed URL from your backend:

```typescript
// Backend (Node.js example)
async function generateSignedUrl(agentId: string): Promise<string> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      method: "GET",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    }
  );

  const data = await response.json();
  return data.signed_url;
}

const signedUrl = await fetchSignedUrlFromBackend();
const config = {
  signedUrl: signedUrl,
};
```

## Client Tools

Client tools allow your agent to trigger actions in your application, for example in React:

```typescript
import { useConversation } from "@elevenlabs/react";

const conversation = useConversation({
  agentId: "your-agent-id",
});

// Start conversation
conversation.startSession({
  clientTools: {
    logMessage: async ({ message }) => {
      console.log(message);
    },
  },
});
```

[Learn more here](https://elevenlabs.io/docs/agents-platform/customization/tools/client-tools)

## Examples

Explore our example applications to see the SDKs in action:

- [Next.JS Example](https://github.com/elevenlabs/elevenlabs-examples/tree/main/examples/conversational-ai/nextjs)
- [React Native Expo Example](https://github.com/elevenlabs/packages/tree/main/examples/react-native-expo)

## Documentation

For detailed documentation, visit:

- [React SDK API](https://elevenlabs.io/docs/agents-platform/libraries/react)
- [React Native SDK API](https://elevenlabs.io/docs/agents-platform/libraries/react-native)
- [TypeScript/JavaScript Client API](https://elevenlabs.io/docs/agents-platform/libraries/java-script)
- [Agents CLI](https://elevenlabs.io/docs/agents-platform/libraries/agents-cli)
- [Widget](https://elevenlabs.io/docs/agents-platform/customization/widget)

## Support

- [Documentation](https://elevenlabs.io/docs/agents-platform/overview)
- [Discord Community](https://discord.gg/elevenlabs)
- [Issues](https://github.com/elevenlabs/packages/issues)
- [Support Email](mailto:support@elevenlabs.io)

### Development Setup

This project uses [Turbo](https://turborepo.com) and pnpm to manage dependencies.

```bash
# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Start development mode
pnpm run dev
```

### Creating a New Package

```bash
pnpm run create --name=my-new-package
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Engineered by [ElevenLabs](https://elevenlabs.io)
