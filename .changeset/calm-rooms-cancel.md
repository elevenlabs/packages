---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add per-start `AbortSignal` support for cancelling shared web preflight and WebRTC or WebSocket session startup. Late browser and transport resources are still cleaned up after cancellation.

React `endSession()` now returns a teardown promise and releases replacement-session gating after a 10-second cleanup bound. A synchronous `startSession()` call from a failed start's `onError` is queued until teardown finishes; retry classification, limits, credentials, and backoff remain caller-owned. Startup signals stop applying once `onConnect` fires.
