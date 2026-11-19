---
"@elevenlabs/client": patch
---

Ended WebRTC voice sessions close the output capture worklet port, so Chromium can collect the connection after the session closes. A capture that finishes loading after the session ends, or after a newer capture started, no longer replaces the output volume and analyser.
