---
"@elevenlabs/react": patch
---

Fix `useConversationStatus()` reporting `"error"` for errors that leave the session running. `@elevenlabs/client` calls `onError` for recoverable, mid-session problems — an unregistered client tool, a throwing client tool handler, a server `error` event, a failed MCP approval — without closing the connection, but the status was latched to `"error"` until the session ended, so consumers gating on `status === "connected"` turned themselves off for the rest of the call.

`status` now follows the connection lifecycle and only reports `"error"` when the error ended or prevented the session (a rejected `startSession()`). Every error is still surfaced through `message`, which is cleared when a new connection attempt starts and kept after the session ends so the reason stays readable.
