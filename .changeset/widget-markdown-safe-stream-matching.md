---
"@elevenlabs/convai-widget-core": patch
---

Keep markdown formatting in streamed agent replies and ignore streamed chat
parts in voice conversations. The backend strips `*` and `##+` out of
`agent_response` but not out of `agent_chat_response_part`, so a formatted reply
no longer loses its emphasis and headings when the final response arrives.
