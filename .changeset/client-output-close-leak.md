---
"@elevenlabs/client": patch
---

Ended voice sessions release the output audio element and worklet port, so Chromium can collect them after the session closes. The microphone worklet port is closed as well.
