---
"@elevenlabs/client": minor
---

Bound Scribe microphone setup after permission is granted, so a stalled `AudioContext.resume()` rejects instead of hanging forever and the microphone is released rather than left open. Configurable via `setupTimeoutMs` on the microphone config, defaulting to 10000ms; set it to 0 to wait indefinitely.
