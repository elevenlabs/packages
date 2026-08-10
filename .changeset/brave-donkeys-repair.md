---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
---

Fix conversation state consistency through disconnect:

- `BaseConversation` now always reaches the `disconnected` status and fires `onDisconnect`, even when session teardown throws.
- `ConversationProvider` no longer lets a late `onDisconnect` from a previous session clear a newer session's state, and no longer leaks unhandled rejections from `endSession()`.
- `useConversationStatus` now reports `disconnected` as soon as teardown starts, instead of holding `connected` while the conversation was already released — consumers guarding conversation access with `status === "connected"` could previously crash during disconnect.
