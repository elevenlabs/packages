---
"@elevenlabs/client": patch
---

Fix the start of the agent's first message playing too fast and too high when the browser can't use the agent's sample rate. Starting a voice session now waits for the output resampler to be ready, and fails with an error (closing the microphone) if it can't be created, instead of playing audio at the wrong rate.
