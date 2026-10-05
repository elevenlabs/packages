---
"@elevenlabs/convai-widget-core": minor
"@elevenlabs/convai-widget-embed": minor
---

Add the `persistent-session` attribute. When set, text conversations survive a page reload: the widget stores the resume token per agent in `localStorage`, reconnects when the sheet is opened, renders the replayed history ahead of live messages, and forgets the conversation when the user ends the chat or the agent hangs up.
