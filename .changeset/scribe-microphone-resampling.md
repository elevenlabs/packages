---
"@elevenlabs/client": patch
---

Fix aliasing in Scribe microphone audio. Browsers that support the `sampleRate` constraint now capture into a 16 kHz `AudioContext` and resample natively, and other browsers (such as Firefox) resample with libsamplerate instead of plain linear interpolation, so high frequency sound no longer folds into the speech band. Scribe accepts `microphone.workletPaths.libsamplerate` to self-host the resampler.
