---
"@elevenlabs/client": patch
---

When `inputDeviceId` is set, the microphone permission request at the start of a session now opens that device instead of the system default, so no other microphone (such as a nearby iPhone over Continuity) turns on while the session connects.
