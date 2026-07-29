---
"@elevenlabs/client": minor
---

Add `enableLogging` option to `Scribe.connect`. It forwards the realtime speech-to-text `enable_logging` query parameter, so SDK sessions can request zero retention mode the same way direct WebSocket connections already can.
