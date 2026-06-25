---
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/types": minor
---

Allow `sendFeedback` to clear feedback by passing `null`. `sendFeedback(like, eventId?)` now accepts `null` as the first parameter; when passed it sends `score: null` to clear the feedback on that event, allowing users to remove their like/dislike rating.
