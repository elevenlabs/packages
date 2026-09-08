---
"@elevenlabs/convai-widget-core": patch
---

Render `attachments` from agent messages in the widget transcript. Files with an https url show as an inline image when their mime type is an image, and as a download link otherwise. Attachment-only replies, which arrive with no text, now render instead of being dropped.
