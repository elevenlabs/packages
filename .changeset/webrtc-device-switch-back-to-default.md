---
"@elevenlabs/client": patch
---

Let WebRTC `changeInputDevice` and `changeOutputDevice` switch back to the default device when called with no device ID, instead of ignoring the call.
