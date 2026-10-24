---
"@elevenlabs/client": patch
---

Fix WebRTC mode staying `speaking` after a response completes with audio events that carry no samples. Metadata-only `audio` events no longer set the mode; only events with an audio payload do.
