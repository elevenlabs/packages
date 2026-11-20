---
"@elevenlabs/client": minor
---

Resample Scribe microphone audio with libsamplerate in browsers that don't support the `sampleRate` constraint (such as Firefox), instead of plain linear interpolation, so high frequency sound no longer folds into the speech band there either. Scribe accepts a new `microphone.workletPaths.libsamplerate` option to self-host the resampler.
