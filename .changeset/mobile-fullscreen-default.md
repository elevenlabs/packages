---
"@elevenlabs/convai-widget-core": patch
---

On screens narrower than 768px, the chat now always opens fullscreen, and the header's resize button is replaced by a close button. Add `mobile-fullscreen="false"` to the embed to keep the previous behavior, where the chat opens compact and the resize button switches to fullscreen. Widgets with `always-expanded` also keep the previous behavior, since they can't be closed.
