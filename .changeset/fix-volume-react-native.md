---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/react-native": minor
---

Fix getInputVolume/getOutputVolume returning 0 in React Native by adding native volume providers using LiveKit's RMS and multiband FFT processors.

**Breaking:** `getByteFrequencyData()` now returns data focused on the human voice range (100-8000 Hz) instead of the full spectrum (0 to sampleRate/2). On web, `getVolume()` is also computed from this range. The deprecated `getAnalyser()` method still provides direct access to the raw `AnalyserNode` for consumers needing full-spectrum data.
