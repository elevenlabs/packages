---
"@elevenlabs/client": minor
---

Add typed event emitter (`on`/`off`) to conversation instances. Listeners registered via `on()` receive the same payloads as the existing constructor callbacks. `on()` returns an unsubscribe function; `off()` removes a specific listener. Multiple listeners per event are supported.
