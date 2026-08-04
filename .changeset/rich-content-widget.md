---
"@elevenlabs/convai-widget-core": minor
---

Render rich content components the agent sends, inline in the transcript,
starting with an item card. Card buttons send a follow-up message as the user.

Properties are validated before rendering, so a malformed or unrecognised
component shows a short notice instead of breaking the transcript. A component
stays where it arrived and no message is moved across it, and a component
delivered more than once renders once.
