---
"@elevenlabs/client": patch
---

Fix `sendUserActivity` so it keeps sending `user_activity` about once a second while the user types, instead of only once at the start. The internal `throttle` no longer restarts its window on every suppressed call.
