---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/convai-widget-core": minor
---

Draw rich content alongside the first message, and echo button taps back to the
server.

A `first_message_rich_content` entry on the widget config is painted with the
first message before any connection exists, so a text-only widget shows its
buttons on a cold start. Tapping one starts the conversation with that button's
message, the same way typing into the input does — previously a button was
disabled until connected, which left a first-message button waiting for the
session it would itself begin.

A row the customer has already answered is retired rather than left sitting in
the transcript. Whether a component does this is per-component, so display
components can later stay and merely de-emphasise instead of disappearing.

`sendUserMessage` accepts an optional attribution (`richContentId`) that rides
the `user_message` event as `rich_content_id`; the widget sends it automatically
when a button is tapped, on both the mid-conversation and conversation-starting
paths. It names the row the button belonged to rather than the button itself —
given the row, the message text says which button was pressed. Purely additive:
servers that predate the field ignore it, and the message text alone remains
what the agent acts on.
