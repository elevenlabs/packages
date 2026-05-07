---
"@elevenlabs/react": patch
---

Refactor sub-providers to subscribe via `conversation.on()` instead of composed callback objects. Removes `ListenerMap` and `ListenerSet` internal classes. No public API changes.
