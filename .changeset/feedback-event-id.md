---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Allow `sendFeedback` to target a past message by `event_id`. `sendFeedback(like, eventId?)` now accepts an optional event id; when provided it rates that specific message (bypassing the latest-turn gate), and when omitted it keeps the existing behaviour of rating the latest agent turn.
