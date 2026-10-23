---
"@elevenlabs/client": patch
---

Align `changeInputDevice`/`changeOutputDevice` across connection types: both the WebSocket and WebRTC paths now reject a `sampleRate` or `format` that differs from the one the connection was created with, instead of the WebSocket path silently ignoring it and the WebRTC path throwing on any value including the one already active. Re-passing the connection's current `sampleRate`/`format` alongside a device id, which callers routinely do, stays a no-op on both paths.
