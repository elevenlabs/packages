---
"@elevenlabs/client": patch
---

Release the microphone or the audio output when the other one fails to open during a WebSocket voice session. `MediaDeviceInput.create()` and `MediaDeviceOutput.create()` ran under `Promise.all`, so a failure on one side left the other side's `MediaStream`, `AudioContext` and hidden `<audio>` element open after `startSession()` rejected.
