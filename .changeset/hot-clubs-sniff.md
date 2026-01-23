---
"@elevenlabs/client": patch
---

Fixed an issue where input audio would not get re-established after permission revocation. Now input audio is re-established and the agent can hear the user, when permissions are granted or when permissions are ready to be prompted while a conversation is active.
