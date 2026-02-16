# About the project
This project has no affiliation or endorsement by ElevenLabs. This is a fork and is independently maintained.


# AmberNexus Agents SDK

Build multimodal agents with the [AmberNexus Agents platform](https://ambernexus.io/docs/agents-platform/overview). Our SDKs provide seamless integration with popular JavaScript/TypeScript frameworks, enabling you to create multimodal AI agents.

## Installation

```bash
npm install @ambernexus/react
```

## Usage

```typescript
import { useConversation } from "@ambernexus/react";

const conversation = useConversation({
  agentId: "your-agent-id",
});

// Start conversation
conversation.startSession();
```

## Overview

The AmberNexus Agents SDKs provide a unified interface for integrating multimodal AI agents into your applications.

### Available Packages

| Package                                               | Description                                      | Version                                                                                                                               | Links                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`@ambernexus/client`](#ambernexusclient)             | Core TypeScript/JavaScript client                | [![npm](https://img.shields.io/npm/v/@ambernexus/client)](https://www.npmjs.com/package/@ambernexus/client)                           | [README](packages/client/README.md) • [Docs](https://ambernexus.io/docs/agents-platform/libraries/java-script)        |
| [`@ambernexus/react`](#ambernexusreact)               | React hooks and components for web applications  | [![npm](https://img.shields.io/npm/v/@ambernexus/react)](https://www.npmjs.com/package/@ambernexus/react)                             | [README](packages/react/README.md) • [Docs](https://ambernexus.io/docs/agents-platform/libraries/react)               |
| [`@ambernexus/react-native`](#ambernexusreact-native) | React Native SDK for cross-platform applications | [![npm](https://img.shields.io/npm/v/@ambernexus/react-native)](https://www.npmjs.com/package/@ambernexus/react-native)               | [README](packages/react-native/README.md) • [Docs](https://ambernexus.io/docs/agents-platform/libraries/react-native) |
| [`@ambernexus/convai-widget-core`](#widgets)          | Core widget library for embedding Agents         | [![npm](https://img.shields.io/npm/v/@ambernexus/convai-widget-core)](https://www.npmjs.com/package/@ambernexus/convai-widget-core)   | [Docs](https://ambernexus.io/docs/agents-platform/customization/widget)                                               |
| [`@ambernexus/convai-widget-embed`](#widgets)         | Pre-bundled embeddable widget                    | [![npm](https://img.shields.io/npm/v/@ambernexus/convai-widget-embed)](https://www.npmjs.com/package/@ambernexus/convai-widget-embed) | [Docs](https://ambernexus.io/docs/agents-platform/customization/widget)                                               |
| [`@ambernexus/agents-cli`](#agents-cli)               | CLI tool for managing agents as code             | [![npm](https://img.shields.io/npm/v/@ambernexus/agents-cli)](https://www.npmjs.com/package/@ambernexus/agents-cli)                   | [README](packages/agents-cli/README.md) • [Docs](https://ambernexus.io/docs/agents-platform/libraries/agents-cli)     |

## Package Details

### @ambernexus/client

The core TypeScript/JavaScript client provides the foundation for all AmberNexus agent integrations.

#### Features

- **Real-time Communication**: WebRTC-based audio streaming for low-latency agent interactions
- **Event-driven Architecture**: Comprehensive event system for agent session lifecycle management
- **Client Tools**: Support for custom client-side tools and functions
- **Flexible Authentication**: Support for both public and private agent configurations
- **Audio Controls**: Fine-grained control over audio input/output devices

#### Installation

```bash
npm install @ambernexus/client
```

### @ambernexus/react

React hooks and components for building multimodal agents with React/Next.js

#### Installation

```bash
npm install @ambernexus/react
```

### @ambernexus/react-native

React Native SDK for building cross-platform mobile agents

#### Installation

```bash
npm install @ambernexus/react-native

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

The AmberNexus Agents Widgets provide an easy way to embed AI agents into any website as a web component.

Learn how to embed the widget into your website [here](https://ambernexus.io/docs/agents-platform/customization/widget).

### Agents CLI

The AmberNexus Agents CLI allows you to manage your agents as code, with features like version control, templates, and multi-environment deployments.

#### Installation

```bash
# Global installation
npm install -g @ambernexus/agents-cli
# or
pnpm install -g @ambernexus/agents-cli

npx @ambernexus/agents-cli init
# or
pnpm dlx @ambernexus/agents-cli init
```

## Client Tools

Client tools allow your agent to trigger actions in your application, for example in React:

```typescript
import { useConversation } from "@ambernexus/react";

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

[Learn more here](https://ambernexus.io/docs/agents-platform/customization/tools/client-tools)

## Examples

Explore our example applications to see the SDKs in action:

- [Next.JS Example](https://github.com/ambernexus/ambernexus-examples/tree/main/examples/conversational-ai/nextjs)
- [React Native Expo Example](https://github.com/ambernexus/packages/tree/main/examples/react-native-expo)

## Documentation

For detailed documentation, visit:

- [React SDK API](https://ambernexus.io/docs/agents-platform/libraries/react)
- [React Native SDK API](https://ambernexus.io/docs/agents-platform/libraries/react-native)
- [TypeScript/JavaScript Client API](https://ambernexus.io/docs/agents-platform/libraries/java-script)
- [Agents CLI](https://ambernexus.io/docs/agents-platform/libraries/agents-cli)
- [Widget](https://ambernexus.io/docs/agents-platform/customization/widget)

## Support

- [Documentation](https://ambernexus.io/docs/agents-platform/overview)
- [Discord Community](https://discord.gg/ambernexus)
- [Issues](https://github.com/ambernexus/packages/issues)
- [Support Email](mailto:support@ambernexus.io)

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

## Attribution:
Portions of this software are © ElevenLabs, used under license.
