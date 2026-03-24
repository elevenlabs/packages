---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
---

Return 0 from `getInputVolume()`/`getOutputVolume()` and empty `Uint8Array` from `getInputByteFrequencyData()`/`getOutputByteFrequencyData()` instead of throwing when no active conversation or analyser is available. This avoids forcing consumers (e.g., animation loops) to wrap every call in try-catch.
