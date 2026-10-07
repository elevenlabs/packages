---
"@elevenlabs/convai-widget-core": patch
"@elevenlabs/convai-widget-embed": patch
---

Persistent text chats survive a dropped socket: the transcript stays, the conversation resumes when the page returns to the foreground or the next message is sent, and a backgrounded page closes the connection cleanly. A workspace without persistent sessions falls back to a plain conversation.
