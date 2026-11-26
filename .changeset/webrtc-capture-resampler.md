---
"@elevenlabs/client": patch
---

Fix `onAudio` never firing in WebRTC voice sessions on devices that don't run at 48 kHz. The WebRTC output capture now loads libsamplerate (respecting `libsampleratePath`) and waits for the resampler, and the capture setup fails with `Failed to create audio resampler: …` when it can't be created.
