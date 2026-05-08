---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/react-native": minor
---

Add full tool result payload support to `onAgentToolResponse`.

The `onAgentToolResponse` callback now also receives `agent_tool_response_full_payload` server events, delivering the raw `full_tool_result` string (capped at 64 KB) alongside the existing summary events. Consumers can distinguish between the two by checking for the presence of `full_tool_result` on the payload. To receive full payloads, enable the `agent_tool_response_full_payload` client event in the agent's configuration UI.

```tsx
<ConversationProvider
  agentId="…"
  onAgentToolResponse={payload => {
    if ("full_tool_result" in payload) {
      if (payload.truncated) {
        console.warn("full payload truncated to 64 KB");
      }
      console.log(payload.tool_name, payload.full_tool_result);
    } else {
      console.log(payload.tool_call_id, payload.is_error);
    }
  }}
>
  …
</ConversationProvider>
```

The same callback is available on `useConversation`, `startSession`, and the lower-level `Conversation.startSession` in `@elevenlabs/client`.
