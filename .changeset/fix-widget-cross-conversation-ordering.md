---
"@elevenlabs/convai-widget-core": patch
---

Break ties on shared `eventId` with user-before-agent in transcript ordering. Fixes voice/DTMF turns where the agent message could render before the user transcript when both events of the turn carry the same `event_id`.
