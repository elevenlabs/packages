# @elevenlabs/types

TypeScript type definitions for ElevenLabs APIs, auto-generated from AsyncAPI specifications.

## Overview

This package provides strongly-typed interfaces for all messages exchanged between ElevenLabs clients and various APIs (Agents, Scribe). Types are automatically generated from AsyncAPI specifications to ensure they stay in sync with the API contracts.

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
  - **Agent API:**
    - `AudioClientEvent` - Audio data from the agent
    - `AgentResponseClientEvent` - Text responses from the agent
    - `UserTranscriptionClientEvent` - Transcriptions of user speech
    - `InterruptionEvent` - Interruption notifications
  - **Scribe API:**
    - `SessionStartedMessage` - Transcription session started
    - `PartialTranscriptMessage` - Interim transcription results
    - `CommittedTranscriptMessage` - Committed transcription results
    - `CommittedTranscriptWithTimestampsMessage` - Committed results with word timestamps
    - `ScribeErrorMessage` - Error events
    - `ScribeAuthErrorMessage` - Authentication errors

- **`Outgoing`** - Messages sent to the ElevenLabs server
  - **Agent API:**
    - `UserMessage` - Text messages from the user
    - `UserFeedback` - User feedback (like/dislike)
    - `ConversationInitiation` - Session initialization
    - `ClientToolResult` - Results from client-side tool execution
  - **Scribe API:**
    - `InputAudioChunk` - Audio data for transcription

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
│   ├── agent.asyncapi.yaml    # Agent API AsyncAPI specification
│   └── scribe.asyncapi.yaml   # Scribe API AsyncAPI specification
├── scripts/
│   └── generate-all-types.ts  # Generation script (processes all schemas)
├── generated/
│   └── types/
│       ├── asyncapi-types.ts  # All generated types
│       ├── incoming.ts        # Barrel export for incoming messages
│       └── outgoing.ts        # Barrel export for outgoing messages
└── src/
    └── index.ts              # Main entry point with organized exports
```

### Adding New Types

1. Update the AsyncAPI specification in the appropriate file (e.g., `schemas/agent.asyncapi.yaml` or `schemas/scribe.asyncapi.yaml`)
2. Run `pnpm generate` to regenerate TypeScript types from all schemas
3. The types will automatically be available in the appropriate namespace

### Adding New API Schemas

1. Create a new AsyncAPI specification in `schemas/` with the naming pattern `*.asyncapi.yaml`
2. Run `pnpm generate` - the script will automatically discover and process all schema files
3. The generated types will be merged into the existing type exports
