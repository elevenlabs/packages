---
"@elevenlabs/convai-widget-core": patch
---

Fix transcript rendering for turns that interleave text and tool calls: keep text segments split by a tool call as separate bubbles, and show the tool status badge only once per turn
