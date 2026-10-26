---
"@elevenlabs/react": minor
---

`useScribe` in microphone mode now reports `status: "connected"` (and `isConnected`) only after the session has started and the first microphone audio frame has been sent, instead of as soon as the session starts.
