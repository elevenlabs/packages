---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
---

Forward the optional `attachments` field (url, name, mime_type) from the `agent_response` client event into the `onMessage` payload, so consumers can render files attached to agent messages, e.g. relayed from a human agent reply.
