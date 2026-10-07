---
"@elevenlabs/convai-widget-core": minor
"@elevenlabs/convai-widget-embed": minor
---

Add the `persistent-session` attribute. Text conversations survive a dropped socket or a page reload: the widget stores the resume token per agent, keeps the transcript, and resumes when the sheet opens, the page returns to the foreground, or the next message is sent. The connection closes cleanly while the page is hidden. "End chat" forgets the conversation, and a workspace without persistent sessions falls back to a plain conversation.
