---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

In Scribe microphone mode, `RealtimeEvents.SESSION_STARTED` now fires only once the microphone is capturing and its first audio chunk has been sent, instead of as soon as the server accepts the session. A page can now tell the user they are being listened to on `SESSION_STARTED` (and on `useScribe`'s `onSessionStarted` / `status: "connected"`) without the session sitting open while the permission prompt, `AudioContext` and worklet are still starting. If microphone setup fails, `SESSION_STARTED` is not emitted; `ERROR` and `CLOSE` are. Use `RealtimeEvents.OPEN` (or `onConnect`) to react to the socket opening. Manual audio mode is unchanged.
