---
"@elevenlabs/convai-widget-core": patch
---

Ignore streamed `agent_chat_response_part` events outside text-only
conversations. Voice conversations render the spoken `agent_response`
transcript, so a chat stream that is never spoken no longer leaves a message
behind in the transcript.
