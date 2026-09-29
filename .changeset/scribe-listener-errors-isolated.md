---
"@elevenlabs/client": patch
---

Keep Scribe realtime event dispatch running when a listener throws. A throwing listener stopped the remaining listeners for the same event, and its error was reported through the `ERROR` event as "Failed to parse message". The error is now logged and the other listeners still run.
