---
"@elevenlabs/client": minor
---

Add an `onMCPToolApprovalRequest` handler option, which decides MCP tool calls that arrive in the `awaiting_approval` state and sends the approval result for you. Each `tool_call_id` is answered at most once; a handler that rejects or resolves to a non-boolean is reported through `onError` and denied, and a decision that arrives after the call left `awaiting_approval` or the session ended is dropped rather than sent. The handler receives an `AbortSignal` so approval UI can dismiss itself when that happens.
