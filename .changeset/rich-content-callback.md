---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
---

Add the experimental `rich_content` event types and an `onRichContent` callback,
called when the agent sends a component for the client to display, such as an
item card. The callback receives `{ rich_content_id, component, props, event_id }`
and nothing is sent back, so the agent's turn does not wait on the client.

This backs the embedded widget, which is the only client the server offers
components to today, so the callback does not fire for other consumers. Treat
`props` as agent-authored and untrusted when rendering it into a document.
