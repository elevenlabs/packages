---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Add cancellable WebRTC session startup through an optional `signal`, and make React `endSession()` return a teardown promise that aborts an in-flight start immediately. In React, `onConnect` marks the end of startup-signal cancellation; use `endSession()` to close a connected conversation. A synchronous `startSession()` call from `onError` waits for failed-start cleanup, while retry limits and backoff remain caller-owned.
