---
"@elevenlabs/client": patch
---

Fail WebRTC session setup when the conversation initiation payload cannot be
published, instead of resolving onto a session the server never initialized.

`WebRTCConnection.create()` sent `conversation_initiation_client_data` through
the same best-effort path as ordinary messages, which returns early when the
room is no longer connected and swallows a `publishData()` rejection. Setup
could therefore succeed, and `onConnect` fire, while the room and microphone
stayed live for a conversation that was never initialized. The mandatory
initiation send now surfaces those failures so the existing `create()` error
path disconnects the room and reports the failure to the caller. Mid-session
sends remain best effort.
