---
"@elevenlabs/convai-widget-core": minor
---

Render rich content components the agent sends, inline in the transcript,
starting with quick reply buttons. A message button sends its text as the
user's own turn; a link button opens its url in a new tab.

Properties are validated before rendering, so a malformed or unrecognised
component shows a short notice instead of breaking the transcript, and a
component stays where it arrived with no message moved across it.

Validation is built on `zod/mini`, which adds roughly 5 KB gzipped.
