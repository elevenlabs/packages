---
"@elevenlabs/client": patch
---

Fire `onDisconnect` when a conversation fails to start, so teardown cleanup runs even when no connection was ever established.
