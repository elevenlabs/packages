---
"@elevenlabs/client": patch
---

Forward rejections from async LiveKit room event handlers to `onError` instead of letting them become unhandled promise rejections. `TrackSubscribed` awaits the audio adapter and audio capture setup, so a failure there meant the agent's audio silently never attached and the caller was told nothing.
