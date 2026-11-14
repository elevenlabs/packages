---
"@elevenlabs/client": patch
---

Fix the agent carrying on with an interrupted reply in WebSocket voice sessions. Audio chunks from before the last interruption that arrive after it are no longer played, so they can't cut the interruption fade-out short.
