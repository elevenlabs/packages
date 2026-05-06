---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add native mute/unmute support to Scribe realtime STT integration. `RealtimeConnection` now exposes `mute()`, `unmute()`, and `isMuted`. The `useScribe` React hook surfaces these as `isMuted` state with `mute()` and `unmute()` callbacks.
