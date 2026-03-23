---
"@elevenlabs/client": major
---

**Breaking:** The default `connectionType` is now inferred from the conversation mode instead of always defaulting to `"websocket"`.

- **Voice conversations** (default) now use `"webrtc"` by default
- **Text-only conversations** (`textOnly: true`) use `"websocket"` by default

Users who previously relied on the implicit `"websocket"` default for voice conversations and need to keep using WebSocket must now explicitly set `connectionType: "websocket"`.

`connectionType` is now optional on `PublicSessionConfig` (when using `agentId`).
