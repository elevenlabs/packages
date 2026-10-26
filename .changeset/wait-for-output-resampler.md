---
"@elevenlabs/client": patch
---

Fix the start of the agent's first message playing too fast and too high when the browser can't use the agent's sample rate. Output audio now waits for the resampler to load instead of playing unresampled until it's ready.
