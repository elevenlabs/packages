---
"@elevenlabs/client": patch
---

Scribe realtime (microphone mode): release the microphone reliably on teardown.

- Closing the connection while the async microphone setup is still resolving no longer leaks the `MediaStreamTrack`/`AudioContext`; the pipeline is torn down as soon as setup finishes.
- A microphone frame that arrives after the socket is gone is now dropped instead of throwing `WebSocket is not connected`.
- A server-initiated close now releases the microphone too, so consumers reacting to the `CLOSE` event without calling `close()` are not left with a live microphone.
- An app-initiated `close()` that aborts a still-connecting socket no longer logs a spurious `WebSocket closed unexpectedly: 1006` / emits `ERROR`.
