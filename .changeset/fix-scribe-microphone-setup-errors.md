---
"@elevenlabs/client": patch
---

Scribe realtime now reports microphone setup failures through `RealtimeEvents.ERROR` instead of leaving an unhandled rejection. Generic local Scribe errors now use the same typed error payload as server errors.
