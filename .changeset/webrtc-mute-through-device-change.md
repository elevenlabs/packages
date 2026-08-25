---
"@elevenlabs/client": patch
---

Keep a muted WebRTC session muted across an input device change. `changeInputDevice` published the newly captured track without reapplying the session's mute state, so a user who switched microphones while muted kept sending audio to the agent while `isMuted()` and the volume meter still reported muted. The new track is now muted before it is published.
