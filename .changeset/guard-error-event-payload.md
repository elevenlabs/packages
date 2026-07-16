---
"@elevenlabs/client": patch
---

Guard `handleErrorEvent` against `error` messages that arrive without a populated `error_event` payload. Previously the handler read `event.error_event.error_type` directly, so a malformed error message threw an unhandled `TypeError: Cannot read properties of undefined (reading 'error_type')` from inside the message dispatcher. Because the `"error"` case is not wrapped in a try/catch, the throw escaped `onMessage` and crashed the consumer instead of surfacing through `onError`. The payload is now read defensively and always routed to `onError`.
