---
"@elevenlabs/client": patch
"@elevenlabs/react-native": patch
---

Fix getInputVolume/getOutputVolume returning 0 in React Native by adding native volume providers using LiveKit's RMS and multiband FFT processors. On web, getVolume() now computes from the voice frequency range (100-8000 Hz) instead of the full spectrum, and getByteFrequencyData() is normalized to the same range on both platforms.
