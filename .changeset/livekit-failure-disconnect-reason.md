---
"@elevenlabs/client": patch
"@elevenlabs/react": patch
"@elevenlabs/react-native": patch
---

WebRTC sessions that end because the LiveKit connection failed now reach `onDisconnect` with `reason: "error"` instead of `reason: "agent"`. This covers rooms that close for a failure reason such as `SIGNAL_CLOSE`, `CONNECTION_TIMEOUT`, `MEDIA_FAILURE` or `AGENT_ERROR`, and the agent dropping out of the room while LiveKit is reconnecting. Rooms the server closes on purpose, and an agent that leaves a connected room, are still reported as `reason: "agent"`.
