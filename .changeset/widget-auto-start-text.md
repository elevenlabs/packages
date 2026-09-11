---
"@elevenlabs/convai-widget-core": minor
---

Add an opt-in `auto-start-text` attribute that starts a text conversation as
soon as the chat panel opens, instead of waiting for the user's first message.
This lets the agent produce the opening message server-side, e.g. from a
workflow that resolves customer context through tools before greeting.
