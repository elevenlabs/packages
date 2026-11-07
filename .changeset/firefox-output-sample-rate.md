---
"@elevenlabs/client": patch
---

Fix static and echo during Firefox agent playback. The output audio context is created at the agent's sample rate, and audio is resampled only when that context actually runs at a different rate.
