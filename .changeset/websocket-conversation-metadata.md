---
"@elevenlabs/client": patch
---

Fire `onConversationMetadata` for WebSocket sessions. The handshake consumed the `conversation_initiation_metadata` event before the conversation subscribed to messages, so the callback never ran for `connectionType: "websocket"`.
