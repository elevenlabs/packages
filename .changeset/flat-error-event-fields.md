---
"@elevenlabs/client": patch
---

Read error fields from flat `error` messages that arrive without an `error_event` wrapper (e.g. custom LLM failures over WebRTC). Previously `onError` received `"Server error: Unknown error"` with an undefined `errorType`, and the real cause was only visible in `onIncomingEvent`. `message`, `reason`, `code`, `error_type`, `debug_message` and `details` are now read from the top level when `error_event` is missing.
