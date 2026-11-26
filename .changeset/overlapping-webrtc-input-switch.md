---
"@elevenlabs/client": patch
---

Reject overlapping WebRTC input device switches so two `changeInputDevice` calls cannot publish two microphone tracks.
