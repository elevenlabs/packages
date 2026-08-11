---
"@elevenlabs/convai-widget-core": patch
---

Fix markdown not rendering in voice transcripts. Voice agent messages regressed to plain text in 0.12.6, so `**bold**`, lists, tables and links showed as literal markdown syntax while text chat rendered them correctly. Voice messages now go through the same markdown renderer as text, with emotion/audio tags styled by a rehype plugin that runs after sanitization (and skips code blocks).
