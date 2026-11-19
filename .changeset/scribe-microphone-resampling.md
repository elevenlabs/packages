---
"@elevenlabs/client": patch
---

Fix aliasing in Scribe microphone audio in browsers that support the `sampleRate` constraint. They now capture into a 16 kHz `AudioContext` and resample natively, so high frequency sound no longer folds into the speech band.
