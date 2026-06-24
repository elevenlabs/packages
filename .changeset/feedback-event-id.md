---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
---

Allow `sendFeedback` to target a past message by `event_id`. `sendFeedback(like, eventId?)` now accepts an optional event id; when provided it rates that specific message, and when omitted it rates the latest agent turn.

`canSendFeedback` now reflects whether the conversation is connected rather than whether the latest turn is unrated, so feedback can be sent for any message (including re-rating) while the session is live.
