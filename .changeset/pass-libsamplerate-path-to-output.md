---
"@elevenlabs/client": patch
---

Pass `libsampleratePath` to `MediaDeviceOutput` so output resampling uses the custom libsamplerate bundle path, matching `MediaDeviceInput`.
