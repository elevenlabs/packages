---
"@elevenlabs/client": patch
---

Fix microphone audio being sent at the wrong sample rate when the browser can't capture at the agent's input rate (for example Firefox on a WebSocket session). Starting a voice session now waits for the input resampler to be ready, drops microphone audio until then, and fails with an error if the resampler can't be created, instead of sending audio at the device rate.
