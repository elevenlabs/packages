---
"@elevenlabs/convai-widget-core": patch
---

Fix the reply after a tool call (including tool calls made by procedures) rendering twice by matching a canonical agent response to the stream segment it belongs to instead of the arrival order of segments in the turn.
