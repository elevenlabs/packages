---
"@elevenlabs/convai-widget-core": patch
---

Strip and style audio tags written in any language, such as `[차분]` or `[ríe]`, and stop leaving a space before punctuation where a tag was stripped. The widget now uses the `stripAudioTags` helper from `@elevenlabs/client`.
