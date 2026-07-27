---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add `onAgentReasoningResponsePart` callback to receive streaming reasoning response
events from the agent. The callback receives `{ text, type, event_id }` where type
is one of "start", "delta", or "stop".
