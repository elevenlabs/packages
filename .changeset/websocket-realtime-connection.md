---
"@elevenlabs/client": minor
"@elevenlabs/react-native": patch
"@elevenlabs/react": patch
---

Add an experimental `websocket-realtime` connection type that connects to the OpenAI-compatible `/v1/convai/realtime` endpoint with a client secret and a session config instead of an `agentId`. Options that need a saved agent or initiation data (overrides, dynamic variables, `sendContextualUpdate`, feedback, file uploads, ...) are rejected instead of being silently dropped. React Native rejects the new connection type, as it does `websocket`.

**Breaking (types):** `ConnectionType` now includes `"websocket-realtime"`, which `PublicSessionConfig.connectionType` does not accept. Values typed as `ConnectionType` and passed alongside an `agentId` must be annotated as `"websocket" | "webrtc"` instead.
