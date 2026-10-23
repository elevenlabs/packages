---
"@elevenlabs/client": patch
---

Release the WebRTC audio resources when the room disconnects before the session is closed. `WebRTCConnection.close()` returned early once the room had dropped (network loss, server-side removal), so the analyser and capture `AudioContext`s and the hidden `<audio>` elements were never cleaned up.
