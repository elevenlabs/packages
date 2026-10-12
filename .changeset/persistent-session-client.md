---
"@elevenlabs/client": minor
---

Add the experimental `persistentSession` session option for resumable text conversations over WebSocket, and the `onConversationHistory` callback for the transcript rows the server replays on resume. WebSocket sessions now also emit `onConversationMetadata`.
