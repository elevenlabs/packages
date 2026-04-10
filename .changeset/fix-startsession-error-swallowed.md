---
"@elevenlabs/react": patch
---

Fix `startSession` errors being swallowed instead of surfaced via `onError` in `ConversationProvider`. Previously, when `Conversation.startSession()` rejected (e.g. "agent not found"), the UI would get stuck in "connecting" with no error feedback.
