---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add an `onConversationEnded` callback that receives `{ reason }` when the server announces why it is ending the conversation, so you can detect a timeout without matching the close reason text. The server only sends the event when `conversation_ended` is in the agent's enabled client events, and currently reports `max_duration_exceeded`.
