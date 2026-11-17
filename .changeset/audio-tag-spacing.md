---
"@elevenlabs/client": patch
---

Fix `stripAudioTags` leaving doubled spaces, or a space before punctuation or a newline, where a tag was removed mid sentence.
