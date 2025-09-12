# @elevenlabs/types

TypeScript type definitions for ElevenLabs Agent API communication, auto-generated from AsyncAPI specifications.

## Overview

This package provides strongly-typed interfaces for all messages exchanged between ElevenLabs clients and the agent API. Types are automatically generated from the AsyncAPI specification to ensure they stay in sync with the API contract.

## Usage

### Basic Import

```typescript
import { Incoming, Outgoing } from "@elevenlabs/types";

// Handle incoming messages from the server
const handleAudio = (message: Incoming.AudioClientEvent) => {
  console.log("Received audio:", message.audioEvent.audioBase_64);
};

// Send outgoing messages to the server
const userMessage: Outgoing.UserMessage = {
  reservedType: "user_message",
  reservedText: "Hello, agent!",
};
```

### Direct Type Imports

```typescript
// Import specific types directly
import {
  Audio,
  UserTranscript,
  AgentResponse,
  ConversationInitiation,
} from "@elevenlabs/types";

// Use types in your application
const audio: Audio = {
  reservedType: "audio",
  audioEvent: {
    audioBase_64: "base64_encoded_audio",
    eventId: 123,
  },
};
```

### Type Categories

The types are organized into two main categories:

- **`Incoming`** - Messages received from the ElevenLabs server
  - `AudioClientEvent` - Audio data from the agent
  - `AgentResponseClientEvent` - Text responses from the agent
  - `UserTranscriptionClientEvent` - Transcriptions of user speech
  - `InterruptionEvent` - Interruption notifications
  - And more...

- **`Outgoing`** - Messages sent to the ElevenLabs server
  - `UserMessage` - Text messages from the user
  - `UserFeedback` - User feedback (like/dislike)
  - `ConversationInitiation` - Session initialization
  - `ClientToolResult` - Results from client-side tool execution
  - And more...

## Development

### Generating Types

Types are automatically generated from the AsyncAPI specification:

```bash
# Generate types from AsyncAPI spec
pnpm generate

# Build the package
pnpm build

# Type check without building
pnpm check-types
```

### Project Structure

```
packages/types/
├── schemas/
│   └── agent.asyncapi.yaml    # AsyncAPI specification (source of truth)
├── scripts/
│   └── generate-all-types.ts  # Generation script
├── generated/
│   └── types/
│       ├── asyncapi-types.ts  # All generated types
│       ├── incoming.ts        # Barrel export for incoming messages
│       └── outgoing.ts        # Barrel export for outgoing messages
└── src/
    └── index.ts              # Main entry point with organized exports
```

### Adding New Types

1. Update the AsyncAPI specification in `schemas/agent.asyncapi.yaml`
2. Run `pnpm generate` to regenerate TypeScript types
3. The types will automatically be available in the appropriate namespace
