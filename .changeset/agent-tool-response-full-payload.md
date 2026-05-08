---
"@elevenlabs/types": minor
"@elevenlabs/client": minor
"@elevenlabs/react": minor
"@elevenlabs/react-native": minor
---

Merge `onAgentToolResponseFullPayload` into `onAgentToolResponse`.

The `onAgentToolResponse` callback now accepts a union of the summary (`agent_tool_response`) and full payload (`agent_tool_response_full_payload`) event types. Both server events are dispatched through the single `onAgentToolResponse` callback. Consumers can distinguish between the two by checking for the presence of `full_tool_result` on the payload.

```tsx
import { ConversationProvider } from "@elevenlabs/react-native";

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
