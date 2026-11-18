---
"@elevenlabs/client": patch
---

Ended WebRTC voice sessions close the output capture worklet port, so Chromium can collect the connection after the session closes.
