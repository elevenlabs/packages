---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
"@elevenlabs/react-native": patch
---

The `environment` session option is now sent as `environment` on the `conversation_initiation_client_data` message, the field the agent's environment variables resolve against. It is still added to the WebSocket URL and the conversation-token URL as before.
