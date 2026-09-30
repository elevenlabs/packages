---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/types": patch
---

Add an opt-in `keepaliveIntervalMs` option (500-10000 ms) to `Scribe.connect()` and `useScribe()`, sent as `keepalive_interval_ms`. While the streamed audio has no speech, the server sends a `partial_transcript` about this often so clients with a read timeout stay connected during long pauses. Audio must keep streaming (silence is fine). The value is echoed as `keepalive_interval_ms` in the `session_started` config.
