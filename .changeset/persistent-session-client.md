---
"@elevenlabs/client": minor
---

Add the experimental `persistentSession` option for resumable text conversations over WebSocket. Pass `true` to start a persistent conversation or `{ token }` to resume one; the current token arrives through `onConversationMetadata`. Add the `onConversationHistory` callback for the transcript rows the server replays on resume. WebSocket sessions now also emit `onConversationMetadata`, matching WebRTC.
