---
"@elevenlabs/convai-widget-core": patch
---

Scope transcript reordering by `conversationIndex` and break ties on shared `eventId` with user-before-agent. Fixes two issues in voice/DTMF mode: (1) cross-conversation interleaving when `event_id` resets between sessions, and (2) agent message rendering before user transcript when both share the same turn `event_id`.
